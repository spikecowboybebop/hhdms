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
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { CalculateNutrientsDto } from './dto/calculate-nutrients.dto';

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

    return {
      active_plans: activePlans,
      upcoming_follow_ups: upcomingFollowUps,
      food_items: 245,
      templates: 8,
    };
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
        known_allergies: true,
        current_medications: true,
        past_medical_history: true,
        family_history: true,
        height_cm: true,
        weight_kg: true,
        // remove gender and phone_primary entirely
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID/MRN "${patientId}" not found.`,
      );
    }

    return patient;
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

    if (dto.height_cm && dto.weight_kg) {
      const heightM = dto.height_cm / 100;
      bmi = Math.round((dto.weight_kg / (heightM * heightM)) * 10) / 10;
      if (bmi < 18.5) bmi_category = 'Underweight';
      else if (bmi < 25) bmi_category = 'Normal';
      else if (bmi < 30) bmi_category = 'Overweight';
      else bmi_category = 'Obese';
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

    return { ...record, bmi, bmi_category };
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
      if (dto.interval === 'TWO_WEEKS')
        followUpAt.setDate(followUpAt.getDate() + 14);
      else if (dto.interval === 'ONE_MONTH')
        followUpAt.setMonth(followUpAt.getMonth() + 1);
      else if (dto.interval === 'THREE_MONTHS')
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

  async generateDietPlanPdf(planId: string): Promise<PDFKit.PDFDocument> {
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
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Header Title Area
    doc
      .fillColor('#1e293b')
      .fontSize(22)
      .text('HHDMS - DIET & NUTRITION CHART', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .stroke();
    doc.moveDown(1);

    // Patient Context Metadata Grid
    doc.fillColor('#0f172a').fontSize(11);
    doc.text(
      `Patient Name: ${plan.patient.first_name_en} ${plan.patient.last_name_en}`,
      40,
      doc.y,
      { continued: true },
    );
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

    // Render Meals sequentially
    doc
      .fontSize(14)
      .fillColor('#0284c7')
      .text('DAILY MEAL SCHEDULE', 40, doc.y);
    doc.moveDown(0.5);

    for (const meal of plan.meals) {
      // Draw a subtle background block for each meal slot
      const currentY = doc.y;
      doc.rect(40, currentY, 515, 20).fill('#f8fafc');
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .text(`■ ${meal.meal_slot.toUpperCase()}`, 45, currentY + 4, {
          continued: true,
        });
      if (meal.calories) {
        doc
          .fillColor('#64748b')
          .text(` (${meal.calories} kcal Target)`, { align: 'right' });
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
            doc.text(`• ${f.name_en || 'Food Item'} — ${f.grams}g`, 60, doc.y);
          });
        }
      } catch (e) {
        doc
          .fillColor('#ef4444')
          .fontSize(10)
          .text('• Custom dietary plan configuration entries.', 60, doc.y);
      }

      if (meal.preparation_guidance) {
        doc.moveDown(0.2);
        doc
          .fillColor('#475569')
          .fontSize(9)
          .text(`Guidance: ${meal.preparation_guidance}`, 60, doc.y, {
            italic: true,
          });
      }

      doc.moveDown(1.5);
    }

    // Notes Footer section
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
        .text('Special Notes / Instructions:', 40, doc.y);
      doc
        .fillColor('#475569')
        .fontSize(10)
        .text(plan.notes, 40, doc.y + 5);
    }

    // End stream processing
    doc.end();
    return doc;
  }
}
