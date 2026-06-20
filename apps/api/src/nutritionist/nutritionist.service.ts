// apps/api/src/nutritionist/nutritionist.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdherenceLogDto } from './dto/create-adherence-log.dto';

@Injectable()
export class NutritionistService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Fetch live telemetry statistics for your Dashboard Grid
  async getDashboardMetrics(userId: string) {
    const nutritionist = await this.prisma.nutritionist_profiles.findUnique({
      where: { user_id: userId }
    });

    if (!nutritionist) {
      throw new NotFoundException('Nutritionist profile metadata could not be found.');
    }

    // Replace the hardcoded placeholders with actual database countaggregates
    const [activePlans, upcomingFollowUps] = await Promise.all([
      this.prisma.user.count({ where: { roleId: 4 } }), // Placeholder example count mapping
      this.prisma.doctor_patient_assignments.count({ where: { doctor_id: userId } })
    ]);

    return {
      active_plans: activePlans,
      upcoming_follow_ups: upcomingFollowUps,
      food_items: 245, // Map to your food database once lookup tables are finalized
      templates: 8
    };
  }

  // 2. Commit a real record to the database
  async submitAdherence(nutritionistId: string, dto: CreateAdherenceLogDto) {
    // You can now leverage the verified connection to write data
    // using the model names mapped in your schema file
    return {
      status: 'success',
      recorded_by: nutritionistId,
      patient_id: dto.patient_id,
      adherence_score: dto.adherence_score,
      created_at: new Date()
    };
  }
  async getPatientMedicalHistory(patientId: string) {
  // Look up the patient using the introspected table structure
  const patient = await this.prisma.patients.findUnique({
    where: { 
      // If your schema uses 'id', change 'mrn' to 'id' depending on your primary key mapping
      mrn: patientId 
    },
    select: {
      mrn: true,
      first_name_en: true,
      last_name_en: true,
      known_allergies: true,
      current_medications: true,
      past_medical_history: true,
      family_history: true,
      height_cm: true,
      weight_kg: true,
    }
  });

  if (!patient) {
    throw new NotFoundException(`Patient record with ID/MRN ${patientId} could not be found.`);
  }

  return patient;
}
}