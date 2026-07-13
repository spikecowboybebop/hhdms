// apps/api/src/nutritionist/nutritionist.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdherenceLogDto } from './dto/create-adherence-log.dto';
import { CreateAnthropometricRecordDto } from './dto/create-anthropometric-record.dto';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import {
  CreateFollowUpDto,
  FollowUpInterval,
} from './dto/create-follow-up.dto';
import { CalculateNutrientsDto } from './dto/calculate-nutrients.dto';
import {
  BookConsultationDto,
  ConsultationType,
} from './dto/book-consultation.dto';
import { CreateEducationMaterialDto } from './dto/create-education-material.dto';

type NutrientBreakdownItem = {
  food_id: string;
  name_en: string;
  name_bn: string | null;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

@Injectable()
export class NutritionistService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboardMetrics(userId: string) {
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: userId },
    });
    if (!nutritionist) {
      throw new NotFoundException('Nutritionist profile not found.');
    }

    const [activePlans, upcomingFollowUps] = await Promise.all([
      this.prisma.nutritionist_diet_plans.count({
        where: { nutritionist_id: userId, status: 'ACTIVE' },
      }),
      this.prisma.nutritionist_follow_ups.count({
        where: {
          nutritionist_id: userId,
          status: 'SCHEDULED',
          follow_up_at: { gte: new Date() },
        },
      }),
    ]);

    const [foodCount, templateCount] = await Promise.all([
      this.prisma.food_items.count({ where: { is_active: true } }),
      this.prisma.diet_templates.count({ where: { is_active: true } }),
    ]);

    return {
      active_plans: activePlans,
      upcoming_follow_ups: upcomingFollowUps,
      food_items: foodCount,
      templates: templateCount,
    };
  }

  // ─── Food Items ──────────────────────────────────────────────────────────

  async getFoodItems() {
    return this.prisma.food_items.findMany({
      where: { is_active: true },
      orderBy: { name_en: 'asc' },
    });
  }

  // ─── Patients ─────────────────────────────────────────────────────────────

  async getMyPatients(nutritionistId: string) {
    // Get all patients who have a diet plan from this nutritionist
    const plans = await this.prisma.nutritionist_diet_plans.findMany({
      where: { nutritionist_id: nutritionistId },
      select: { patient_id: true },
      distinct: ['patient_id'],
    });

    const patientIds = plans.map((p) => p.patient_id);
    if (patientIds.length === 0) return [];

    return this.prisma.patients.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        mrn: true,
        first_name_en: true,
        last_name_en: true,
        date_of_birth: true,
        sex: true, // was: gender
        phone_number: true, // was: phone_primary
      },
    });
  }

  async getPatientMedicalHistory(patientId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: {
        OR: [{ id: patientId }, { mrn: patientId }],
      },
      select: {
        id: true,
        mrn: true,
        first_name_en: true,
        last_name_en: true,
        first_name_bn: true,
        last_name_bn: true,
        date_of_birth: true,
        sex: true,
        blood_group: true,
        known_allergies: true,
        current_medications: true,
        past_medical_history: true,
        family_history: true,
        height_cm: true,
        weight_kg: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID/MRN "${patientId}" not found.`,
      );
    }

    const [diagnoses, testOrders, referrals] = await Promise.all([
      this.prisma.patient_diagnoses.findMany({
        where: { patient_id: patient.id },
        include: {
          icd10: true,
          doctor: {
            include: {
              user: { select: { firstNameEn: true, lastNameEn: true } },
            },
          },
        },
        orderBy: { diagnosed_at: 'desc' },
        take: 10,
      }),
      this.prisma.diagnostic_test_orders.findMany({
        where: { patient_id: patient.id },
        include: {
          test: {
            select: {
              test_name: true,
              test_code: true,
              normal_range: true,
              unit: true,
            },
          },
          results: { orderBy: { resulted_at: 'desc' }, take: 1 },
        },
        orderBy: { ordered_at: 'desc' },
        take: 20,
      }),
      this.prisma.specialist_referrals.findMany({
        where: { patient_id: patient.id },
        include: {
          referring_doctor: {
            include: {
              user: { select: { firstNameEn: true, lastNameEn: true } },
            },
          },
          specialist: {
            include: {
              user: { select: { firstNameEn: true, lastNameEn: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    return {
      patient,
      diagnoses: diagnoses.map((d) => ({
        id: d.id,
        icd10_code: d.icd10_code,
        description: d.icd10.description,
        preliminary_diagnosis: d.preliminary_diagnosis,
        is_primary: d.is_primary,
        diagnosed_at: d.diagnosed_at,
        doctor: d.doctor
          ? `${d.doctor.user.firstNameEn} ${d.doctor.user.lastNameEn}`
          : null,
      })),
      lab_results: {
        kidney_function: testOrders
          .filter((t) =>
            ['KIDNEY', 'RFT', 'SERUM_CREATININE', 'BLOOD_UREA'].some(
              (k) =>
                t.test.test_code.includes(k) || t.test.test_name.includes(k),
            ),
          )
          .map((t) => ({
            test_name: t.test.test_name,
            test_code: t.test.test_code,
            result: t.results[0]?.result_value ?? null,
            normal_range: t.test.normal_range,
            unit: t.test.unit,
            resulted_at: t.results[0]?.resulted_at ?? null,
          })),
        glucose: testOrders
          .filter((t) =>
            ['GLUCOSE', 'DIABETES', 'HbA1c', 'BM'].some(
              (k) =>
                t.test.test_code.includes(k) || t.test.test_name.includes(k),
            ),
          )
          .map((t) => ({
            test_name: t.test.test_name,
            test_code: t.test.test_code,
            result: t.results[0]?.result_value ?? null,
            normal_range: t.test.normal_range,
            unit: t.test.unit,
            resulted_at: t.results[0]?.resulted_at ?? null,
          })),
        lipids: testOrders
          .filter((t) =>
            ['LIPID', 'CHOLESTEROL', 'HDL', 'LDL', 'TRIGLYCERIDE'].some(
              (k) =>
                t.test.test_code.includes(k) || t.test.test_name.includes(k),
            ),
          )
          .map((t) => ({
            test_name: t.test.test_name,
            test_code: t.test.test_code,
            result: t.results[0]?.result_value ?? null,
            normal_range: t.test.normal_range,
            unit: t.test.unit,
            resulted_at: t.results[0]?.resulted_at ?? null,
          })),
      },
      specialist_notes: referrals.map((r) => ({
        id: r.id,
        specialty_code: r.specialty_code,
        referral_reason: r.referral_reason,
        clinical_summary: r.clinical_summary,
        response_notes: r.response_notes,
        status: r.status,
        referring_doctor: r.referring_doctor
          ? `${r.referring_doctor.user.firstNameEn} ${r.referring_doctor.user.lastNameEn}`
          : null,
        specialist: r.specialist
          ? `${r.specialist.user.firstNameEn} ${r.specialist.user.lastNameEn}`
          : null,
        created_at: r.created_at,
      })),
    };
  }

  // ─── Consultation Booking (NU-001) ────────────────────────────────────────

  async checkAvailability(
    patientId: string,
    consultationType: ConsultationType,
  ) {
    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: patientId }, { mrn: patientId }] },
      select: { id: true, district: true },
    });
    if (!patient)
      throw new NotFoundException(`Patient "${patientId}" not found.`);

    const nutritionists = await this.prisma.nutritionist_profiles.findMany({
      include: {
        user: {
          select: { firstNameEn: true, lastNameEn: true, email: true },
        },
      },
    });

    return {
      patient_area: patient.district ?? 'N/A',
      available_nutritionists: nutritionists.length,
      consultation_type: consultationType,
      next_available_slot: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  }

  async bookConsultation(nutritionistId: string, dto: BookConsultationDto) {
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: nutritionistId },
    });
    if (!nutritionist)
      throw new NotFoundException('Nutritionist profile not found.');

    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient)
      throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

    const bookedAt = dto.preferred_at
      ? new Date(dto.preferred_at)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = await this.prisma.booking_sessions.create({
      data: {
        patient_id: patient.id,
        booked_by: null,
        total_amount: 0,
        status: 'ACTIVE',
      },
    });

    const ticket = await this.prisma.service_tickets.create({
      data: {
        session_id: session.id,
        ticket_no: `NUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        service_type: 'NUTRITIONIST',
        scheduled_date: bookedAt,
        scheduled_time_slot: 'HOME_VISIT',
        assigned_provider_id: nutritionistId,
        price: 0,
        status: 'ASSIGNED',
      },
    });

    return {
      consultation_id: ticket.id,
      session_id: session.id,
      ticket_no: ticket.ticket_no,
      consultation_type: dto.consultation_type,
      scheduled_at: bookedAt.toISOString(),
      nutritionist_id: nutritionistId,
      patient_id: patient.id,
      status: ticket.status,
      notes: dto.notes ?? null,
    };
  }

  // ─── Anthropometric Records ───────────────────────────────────────────────

  async recordAnthropometrics(
    nutritionistId: string,
    dto: CreateAnthropometricRecordDto,
  ) {
    // Verify nutritionist exists
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: nutritionistId },
    });
    if (!nutritionist)
      throw new NotFoundException('Nutritionist profile not found.');

    // Verify patient exists
    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient)
      throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

    // Calculate BMI if both height and weight provided
    let bmi: number | null = null;
    let bmi_category: string | null = null;
    let ideal_body_weight: number | null = null;
    let caloric_needs: { basal: number; total: number } | null = null;

    if (dto.height_cm && dto.weight_kg) {
      const heightM = dto.height_cm / 100;
      bmi = Math.round((dto.weight_kg / (heightM * heightM)) * 10) / 10;
      if (bmi < 18.5) bmi_category = 'Underweight';
      else if (bmi < 25) bmi_category = 'Normal';
      else if (bmi < 30) bmi_category = 'Overweight';
      else bmi_category = 'Obese';

      // Ideal Body Weight (Devine formula)
      if (patient.sex === 'M') {
        ideal_body_weight = Math.round(
          50 + 2.3 * ((dto.height_cm - 152.4) / 2.54),
        );
      } else if (patient.sex === 'F') {
        ideal_body_weight = Math.round(
          45.5 + 2.3 * ((dto.height_cm - 152.4) / 2.54),
        );
      }
      if (ideal_body_weight !== null && ideal_body_weight < 0)
        ideal_body_weight = null;

      // Caloric needs: Miffling-St Jeor equation
      if (dto.weight_kg && dto.height_cm && patient.date_of_birth) {
        const age =
          new Date().getFullYear() - patient.date_of_birth.getFullYear();
        let bmr = 0;
        if (patient.sex === 'M') {
          bmr = 10 * dto.weight_kg + 6.25 * dto.height_cm - 5 * age + 5;
        } else if (patient.sex === 'F') {
          bmr = 10 * dto.weight_kg + 6.25 * dto.height_cm - 5 * age - 161;
        }
        if (bmr > 0) {
          caloric_needs = {
            basal: Math.round(bmr),
            total: Math.round(bmr * 1.2),
          };
        }
      }
    }

    const record = await this.prisma.nutritionist_anthropometric_records.create(
      {
        data: {
          patient_id: patient.id,
          recorded_by: nutritionistId,
          height_cm: dto.height_cm ?? null,
          weight_kg: dto.weight_kg ?? null,
          waist_cm: dto.waist_cm ?? null,
          hip_cm: dto.hip_cm ?? null,
          bmi: bmi ?? null,
          bmi_category: bmi_category ?? null,
          notes: dto.notes ?? null,
        },
      },
    );

    return {
      ...record,
      bmi,
      bmi_category,
      ideal_body_weight,
      caloric_needs,
    };
  }

  async getAnthropometricHistory(patientId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: patientId }, { mrn: patientId }] },
    });
    if (!patient)
      throw new NotFoundException(`Patient "${patientId}" not found.`);

    return this.prisma.nutritionist_anthropometric_records.findMany({
      where: { patient_id: patient.id },
      orderBy: { recorded_at: 'desc' },
    });
  }

  // ─── Diet Plans ───────────────────────────────────────────────────────────

  async createDietPlan(nutritionistId: string, dto: CreateDietPlanDto) {
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: nutritionistId },
    });
    if (!nutritionist)
      throw new NotFoundException('Nutritionist profile not found.');

    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient)
      throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

    const MEAL_ORDER: Record<string, number> = {
      Breakfast: 0,
      'Mid-Morning': 1,
      Lunch: 2,
      Snack: 3,
      Dinner: 4,
      Bedtime: 5,
    };

    const plan = await this.prisma.nutritionist_diet_plans.create({
      data: {
        patient_id: patient.id,
        nutritionist_id: nutritionistId,
        title: dto.title ?? `Diet Plan – ${dto.condition_name ?? 'General'}`,
        condition_name: dto.condition_name ?? null,
        total_calories: dto.total_calories ?? null,
        language: dto.language ?? 'en',
        notes: dto.notes ?? null,
        status: 'ACTIVE',
        meals:
          dto.meals && dto.meals.length > 0
            ? {
                create: dto.meals.map((meal, idx) => ({
                  meal_slot: meal.meal_slot,
                  calories: meal.calories ?? null,
                  preparation_guidance: meal.preparation_guidance ?? null,
                  foods_json: JSON.stringify(meal.foods ?? []),
                  sort_order: MEAL_ORDER[meal.meal_slot] ?? idx,
                })),
              }
            : undefined,
      },
      include: { meals: { orderBy: { sort_order: 'asc' } } },
    });

    return plan;
  }

  async getDietPlans(nutritionistId: string, patientId?: string) {
    return this.prisma.nutritionist_diet_plans.findMany({
      where: {
        nutritionist_id: nutritionistId,
        ...(patientId ? { patient_id: patientId } : {}),
      },
      include: {
        meals: { orderBy: { sort_order: 'asc' } },
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getDietPlanById(planId: string) {
    const plan = await this.prisma.nutritionist_diet_plans.findUnique({
      where: { id: planId },
      include: {
        meals: { orderBy: { sort_order: 'asc' } },
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
    });
    if (!plan) throw new NotFoundException(`Diet plan "${planId}" not found.`);
    return plan;
  }

  // ─── Follow-ups ───────────────────────────────────────────────────────────

  async scheduleFollowUp(nutritionistId: string, dto: CreateFollowUpDto) {
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: nutritionistId },
    });
    if (!nutritionist)
      throw new NotFoundException('Nutritionist profile not found.');

    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient)
      throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

    // Auto-calculate follow_up_at from interval if not provided
    let followUpAt = dto.follow_up_at ? new Date(dto.follow_up_at) : null;
    if (!followUpAt) {
      followUpAt = new Date();
      if (dto.interval === FollowUpInterval.TWO_WEEKS)
        followUpAt.setDate(followUpAt.getDate() + 14);
      else if (dto.interval === FollowUpInterval.ONE_MONTH)
        followUpAt.setMonth(followUpAt.getMonth() + 1);
      else if (dto.interval === FollowUpInterval.THREE_MONTHS)
        followUpAt.setMonth(followUpAt.getMonth() + 3);
    }

    return this.prisma.nutritionist_follow_ups.create({
      data: {
        patient_id: patient.id,
        nutritionist_id: nutritionistId,
        plan_id: dto.plan_id ?? null,
        interval: dto.interval,
        follow_up_at: followUpAt,
        reminder_channel: dto.reminder_channel ?? 'SMS',
        status: 'SCHEDULED',
        notes: dto.notes ?? null,
      },
    });
  }

  async getFollowUps(nutritionistId: string) {
    return this.prisma.nutritionist_follow_ups.findMany({
      where: { nutritionist_id: nutritionistId },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
      orderBy: { follow_up_at: 'asc' },
    });
  }

  // ─── Adherence ────────────────────────────────────────────────────────────

  async submitAdherence(nutritionistId: string, dto: CreateAdherenceLogDto) {
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: nutritionistId },
    });
    if (!nutritionist)
      throw new NotFoundException('Nutritionist profile not found.');

    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient)
      throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

    return this.prisma.nutritionist_adherence_logs.create({
      data: {
        patient_id: patient.id,
        nutritionist_id: nutritionistId,
        plan_id: dto.follow_up_id ?? null, // reuse follow_up_id field from DTO
        follow_up_id: dto.follow_up_id ?? null,
        adherence_score: dto.adherence_score,
        weight_kg: dto.weight_kg ?? null,
        challenges: dto.challenges ?? null,
        modifications: dto.modifications ?? null,
      },
    });
  }

  async getAdherenceLogs(nutritionistId: string, patientId?: string) {
    return this.prisma.nutritionist_adherence_logs.findMany({
      where: {
        nutritionist_id: nutritionistId,
        ...(patientId ? { patient_id: patientId } : {}),
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
      orderBy: { logged_at: 'desc' },
    });
  }

  // ─── Nutrient Calculator (NU-009) ───────────────────────────────────────

  async calculateNutrients(dto: CalculateNutrientsDto) {
    let totalCal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    // Explicitly type the breakdown array so it's not "never[]"
    const breakdown: NutrientBreakdownItem[] = [];

    const foodIds = dto.foods.map((f) => f.food_item_id);

    const foodRecords = await this.prisma.food_items.findMany({
      where: {
        id: { in: foodIds },
        is_active: true,
      },
    });

    // Explicitly tell TypeScript that this map holds <string, any>
    // so it stops saying "property does not exist on {}"
    const foodMap = new Map<string, any>(foodRecords.map((f) => [f.id, f]));

    for (const item of dto.foods) {
      const food = foodMap.get(item.food_item_id);

      if (!food) {
        throw new NotFoundException(
          `Food item with ID ${item.food_item_id} not found in database.`,
        );
      }

      const factor = item.grams / 100;

      const cal = Number((food.calories * factor).toFixed(1));
      const protein = Number((food.protein * factor).toFixed(1));
      const carbs = Number((food.carbs * factor).toFixed(1));
      const fat = Number((food.fat * factor).toFixed(1));
      const fiber = Number((food.fiber * factor).toFixed(1));

      totalCal += cal;
      totalProtein += protein;
      totalCarbs += carbs;
      totalFat += fat;
      totalFiber += fiber;

      breakdown.push({
        food_id: food.id,
        name_en: food.name_en,
        name_bn: food.name_bn,
        grams: item.grams,
        calories: cal,
        protein,
        carbs,
        fat,
        fiber,
      });
    }

    return {
      summary: {
        totalCalories: Math.round(totalCal),
        totalProtein: Math.round(totalProtein),
        totalCarbs: Math.round(totalCarbs),
        totalFat: Math.round(totalFat),
        totalFiber: Math.round(totalFiber),
      },
      breakdown,
    };
  }

  // ─── Patient Education Materials (NU-010) ─────────────────────────────────

  async createEducationMaterial(
    nutritionistId: string,
    dto: CreateEducationMaterialDto,
  ) {
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: nutritionistId },
    });
    if (!nutritionist)
      throw new NotFoundException('Nutritionist profile not found.');

    return this.prisma.patient_documents.create({
      data: {
        patient_id: dto.patient_id,
        file_name: dto.title,
        file_type: dto.material_type,
        file_size: 0,
        file_url: dto.file_url,
      },
    });
  }

  async getEducationMaterials(patientId: string) {
    return this.prisma.patient_documents.findMany({
      where: { patient_id: patientId },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  // ─── Diet Templates (NU-005) ──────────────────────────────────────────────

  // Get all active templates (lightweight for dropdown menus)
  async getDietTemplates() {
    return this.prisma.diet_templates.findMany({
      where: { is_active: true },
      select: {
        id: true,
        condition_name: true,
        total_calories: true,
        description: true,
      },
      orderBy: { condition_name: 'asc' },
    });
  }

  // Get a single template with all its meals to populate the builder UI
  async getDietTemplateById(templateId: string) {
    const template = await this.prisma.diet_templates.findUnique({
      where: { id: templateId },
      include: {
        meals: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(
        `Diet Template with ID ${templateId} not found.`,
      );
    }

    return template;
  }

  // ─── PDF Generation (NU-006) ──────────────────────────────────────────────

  async generateDietPlanPdf(planId: string): Promise<any> {
    // 1. Fetch the entire diet plan with nested meals and patient details
    const plan = await this.prisma.nutritionist_diet_plans.findUnique({
      where: { id: planId },
      include: {
        patient: true,
        meals: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Diet Plan with ID ${planId} not found.`);
    }

    // Dynamic import to prevent memory optimization quirks during initialization
    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const isBilingual = plan.language === 'bn' || plan.language === 'both';

    // Header Title Area – bilingual
    doc
      .fillColor('#1e293b')
      .fontSize(22)
      .text(
        isBilingual
          ? 'HHDMS - ডায়েট ও পুষ্টি চার্ট'
          : 'HHDMS - DIET & NUTRITION CHART',
        { align: 'center' },
      );
    if (isBilingual) {
      doc
        .fontSize(14)
        .fillColor('#475569')
        .text('HHDMS - Diet & Nutrition Chart', { align: 'center' });
      doc.fillColor('#1e293b').fontSize(22);
    }
    doc.moveDown(0.5);
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .stroke();
    doc.moveDown(1);

    // Patient Context Metadata Grid – bilingual
    doc.fillColor('#0f172a').fontSize(11);
    const patientNameEn = `${plan.patient.first_name_en} ${plan.patient.last_name_en}`;
    const patientNameBn =
      plan.patient.first_name_bn || plan.patient.last_name_bn
        ? `${plan.patient.first_name_bn ?? ''} ${plan.patient.last_name_bn ?? ''}`.trim()
        : null;

    if (isBilingual && patientNameBn) {
      doc.text(`রোগীর নাম: ${patientNameBn} (${patientNameEn})`, 40, doc.y, {
        continued: true,
      });
    } else {
      doc.text(
        isBilingual
          ? `রোগীর নাম: ${patientNameEn}`
          : `Patient Name: ${patientNameEn}`,
        40,
        doc.y,
        { continued: true },
      );
    }
    doc.text(` | MRN: ${plan.patient.mrn}`, { align: 'right' });
    doc.text(`Plan Title: ${plan.title}`, 40, doc.y + 16, { continued: true });
    doc.text(` | Target Calories: ${plan.total_calories || 'N/A'} kcal`, {
      align: 'right',
    });
    doc.text(
      `Condition: ${plan.condition_name || 'General Health'}`,
      40,
      doc.y + 32,
    );

    doc.moveDown(2);

    // Render Meals sequentially – bilingual
    doc
      .fontSize(14)
      .fillColor('#0284c7')
      .text(
        isBilingual ? 'দৈনিক খাবার তালিকা' : 'DAILY MEAL SCHEDULE',
        40,
        doc.y,
      );
    if (isBilingual) {
      doc
        .fontSize(10)
        .fillColor('#64748b')
        .text('Daily Meal Schedule', 40, doc.y);
      doc.fillColor('#0284c7').fontSize(14);
    }
    doc.moveDown(0.5);

    const MEAL_SLOT_BN: Record<string, string> = {
      Breakfast: 'সকালের নাস্তা',
      'Mid-Morning': 'মধ্য-সকাল',
      Lunch: 'দুপুরের খাবার',
      Snack: 'নাস্তা',
      Afternoon: 'বিকালের নাস্তা',
      Dinner: 'রাতের খাবার',
      Bedtime: 'শোবার সময়',
    };

    for (const meal of plan.meals) {
      // Draw a subtle background block for each meal slot
      const currentY = doc.y;
      doc.rect(40, currentY, 515, 20).fill('#f8fafc');
      const mealLabel = isBilingual
        ? `${MEAL_SLOT_BN[meal.meal_slot] || meal.meal_slot} (${meal.meal_slot})`
        : meal.meal_slot;
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .text(`■ ${mealLabel.toUpperCase()}`, 45, currentY + 4, {
          continued: true,
        });
      if (meal.calories) {
        doc
          .fillColor('#64748b')
          .text(
            isBilingual
              ? ` (${meal.calories} kcal লক্ষ্য)`
              : ` (${meal.calories} kcal Target)`,
            { align: 'right' },
          );
      } else {
        doc.text('', { align: 'right' });
      }

      doc.moveDown(0.5);

      // Parse and display foods list from the JSON field
      try {
        const foods = JSON.parse(meal.foods_json);
        if (Array.isArray(foods) && foods.length > 0) {
          doc.fillColor('#334155').fontSize(10);
          foods.forEach((f: any) => {
            const foodName =
              isBilingual && f.name_bn
                ? `${f.name_bn} (${f.name_en || 'Food Item'})`
                : f.name_en || 'Food Item';
            doc.text(`• ${foodName} — ${f.grams}g`, 60, doc.y);
          });
        }
      } catch {
        doc
          .fillColor('#ef4444')
          .fontSize(10)
          .text(
            isBilingual
              ? '• কাস্টম ডায়েটারি প্ল্যান কনফিগারেশন।'
              : '• Custom dietary plan configuration entries.',
            60,
            doc.y,
          );
      }

      if (meal.preparation_guidance) {
        doc.moveDown(0.2);
        const guidLabel = isBilingual
          ? `নির্দেশনা: ${meal.preparation_guidance}`
          : `Guidance: ${meal.preparation_guidance}`;
        doc.fillColor('#475569').fontSize(9).text(guidLabel, 60, doc.y);
      }

      doc.moveDown(1.5);
    }

    // Notes Footer section – bilingual
    if (plan.notes) {
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(1);
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .text(
          isBilingual
            ? 'বিশেষ নির্দেশনা / মন্তব্য:'
            : 'Special Notes / Instructions:',
          40,
          doc.y,
        );
      doc
        .fillColor('#475569')
        .fontSize(10)
        .text(plan.notes, 40, doc.y + 5);
    }

    // Nutritionist signature line
    doc.moveDown(3);
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .moveTo(400, doc.y)
      .lineTo(555, doc.y)
      .stroke();
    doc.moveDown(0.3);
    doc
      .fillColor('#475569')
      .fontSize(9)
      .text(
        isBilingual ? 'পুষ্টিবিদের স্বাক্ষর' : "Nutritionist's Signature",
        400,
        doc.y,
      );

    // Footer with date and page number
    doc.moveDown(1);
    doc
      .fillColor('#94a3b8')
      .fontSize(8)
      .text(
        isBilingual
          ? `প্রস্তুতের তারিখ: ${new Date().toLocaleDateString('bn-BD')} | পৃষ্ঠা ১`
          : `Generated: ${new Date().toISOString().split('T')[0]} | Page 1`,
        40,
        doc.y,
        { align: 'center' },
      );

    // Nutritionist signature line
    doc.moveDown(3);
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .moveTo(400, doc.y)
      .lineTo(555, doc.y)
      .stroke();
    doc.moveDown(0.3);
    doc
      .fillColor('#475569')
      .fontSize(9)
      .text(
        isBilingual ? 'পুষ্টিবিদের স্বাক্ষর' : "Nutritionist's Signature",
        400,
        doc.y,
      );

    // Footer with date and page number
    doc.moveDown(1);
    doc
      .fillColor('#94a3b8')
      .fontSize(8)
      .text(
        isBilingual
          ? `প্রস্তুতের তারিখ: ${new Date().toLocaleDateString('bn-BD')} | পৃষ্ঠা ১`
          : `Generated: ${new Date().toISOString().split('T')[0]} | Page 1`,
        40,
        doc.y,
        { align: 'center' },
      );

    // End stream processing
    doc.end();
    return doc;
  }
}
