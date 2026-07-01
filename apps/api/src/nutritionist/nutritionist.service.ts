// apps/api/src/nutritionist/nutritionist.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdherenceLogDto } from './dto/create-adherence-log.dto';
import { CreateAnthropometricRecordDto } from './dto/create-anthropometric-record.dto';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

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
  sex: true,           // was: gender
  phone_number: true,  // was: phone_primary
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
      throw new NotFoundException(`Patient with ID/MRN "${patientId}" not found.`);
    }

    return patient;
  }

  // ─── Anthropometric Records ───────────────────────────────────────────────

  async recordAnthropometrics(nutritionistId: string, dto: CreateAnthropometricRecordDto) {
    // Verify nutritionist exists
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: nutritionistId },
    });
    if (!nutritionist) throw new NotFoundException('Nutritionist profile not found.');

    // Verify patient exists
    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient) throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

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

    const record = await this.prisma.nutritionist_anthropometric_records.create({
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
    });

    return { ...record, bmi, bmi_category };
  }

  async getAnthropometricHistory(patientId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: patientId }, { mrn: patientId }] },
    });
    if (!patient) throw new NotFoundException(`Patient "${patientId}" not found.`);

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
    if (!nutritionist) throw new NotFoundException('Nutritionist profile not found.');

    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient) throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

    const MEAL_ORDER: Record<string, number> = {
      Breakfast: 0, 'Mid-Morning': 1, Lunch: 2, Snack: 3, Dinner: 4, Bedtime: 5,
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
        meals: dto.meals && dto.meals.length > 0
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
          select: { id: true, mrn: true, first_name_en: true, last_name_en: true },
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
          select: { id: true, mrn: true, first_name_en: true, last_name_en: true },
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
    if (!nutritionist) throw new NotFoundException('Nutritionist profile not found.');

    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient) throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

    // Auto-calculate follow_up_at from interval if not provided
    let followUpAt = dto.follow_up_at ? new Date(dto.follow_up_at) : null;
    if (!followUpAt) {
      followUpAt = new Date();
      if (dto.interval === 'TWO_WEEKS') followUpAt.setDate(followUpAt.getDate() + 14);
      else if (dto.interval === 'ONE_MONTH') followUpAt.setMonth(followUpAt.getMonth() + 1);
      else if (dto.interval === 'THREE_MONTHS') followUpAt.setMonth(followUpAt.getMonth() + 3);
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
          select: { id: true, mrn: true, first_name_en: true, last_name_en: true },
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
    if (!nutritionist) throw new NotFoundException('Nutritionist profile not found.');

    const patient = await this.prisma.patients.findFirst({
      where: { OR: [{ id: dto.patient_id }, { mrn: dto.patient_id }] },
    });
    if (!patient) throw new NotFoundException(`Patient "${dto.patient_id}" not found.`);

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
          select: { id: true, mrn: true, first_name_en: true, last_name_en: true },
        },
      },
      orderBy: { logged_at: 'desc' },
    });
  }

  // ─── Nutrient Calculator ──────────────────────────────────────────────────

  async calculateNutrients(foods: { food_item_id: string; grams: number }[]) {
    // Bangladeshi food database (static — replace with DB table later)
    const BD_FOODS: Record<string, { name: string; cal: number; protein: number; carbs: number; fat: number; fiber: number }> = {
      'rice-white':   { name: 'Rice (White, Cooked)',   cal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
      'ruti':         { name: 'Ruti (Whole Wheat)',     cal: 71,  protein: 2.7, carbs: 14.8, fat: 0.4, fiber: 1.2 },
      'lentil-red':   { name: 'Red Lentil (Masur Dal)', cal: 116, protein: 9.0, carbs: 20.1, fat: 0.4, fiber: 7.9 },
      'fish-hilsa':   { name: 'Hilsa Fish',             cal: 273, protein: 21.8, carbs: 0,   fat: 19.4, fiber: 0 },
      'fish-rohu':    { name: 'Rohu Fish',              cal: 97,  protein: 16.6, carbs: 0,   fat: 2.4, fiber: 0 },
      'egg-chicken':  { name: 'Chicken Egg',            cal: 155, protein: 13.0, carbs: 1.1, fat: 10.6, fiber: 0 },
      'chicken':      { name: 'Chicken (Cooked)',       cal: 165, protein: 31.0, carbs: 0,   fat: 3.6, fiber: 0 },
      'spinach':      { name: 'Spinach (Palak)',        cal: 23,  protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
      'banana':       { name: 'Banana',                 cal: 89,  protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
      'milk':         { name: 'Whole Milk',             cal: 61,  protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
    };

    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
    const breakdown: { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number; fiber: number }[] = [];

    for (const item of foods) {
      const food = BD_FOODS[item.food_item_id];
      if (!food) continue;
      const factor = item.grams / 100;
      const cal = Math.round(food.cal * factor * 10) / 10;
      const protein = Math.round(food.protein * factor * 10) / 10;
      const carbs = Math.round(food.carbs * factor * 10) / 10;
      const fat = Math.round(food.fat * factor * 10) / 10;
      const fiber = Math.round(food.fiber * factor * 10) / 10;
      totalCal += cal; totalProtein += protein; totalCarbs += carbs; totalFat += fat; totalFiber += fiber;
      breakdown.push({ name: food.name, grams: item.grams, calories: cal, protein, carbs, fat, fiber });
    }

    return {
      breakdown,
      totals: {
        calories: Math.round(totalCal),
        protein_g: Math.round(totalProtein * 10) / 10,
        carbs_g: Math.round(totalCarbs * 10) / 10,
        fat_g: Math.round(totalFat * 10) / 10,
        fiber_g: Math.round(totalFiber * 10) / 10,
      },
      available_foods: Object.entries(BD_FOODS).map(([id, f]) => ({ id, name: f.name })),
    };
  }
}
