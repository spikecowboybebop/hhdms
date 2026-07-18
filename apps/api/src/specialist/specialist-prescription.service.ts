import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialistPrescriptionDto, MedicationDto } from './dto/create-specialist-prescription.dto';
import { checkInteractions, InteractionWarning } from './drug-interactions';

@Injectable()
export class SpecialistPrescriptionService {
  private readonly logger = new Logger(SpecialistPrescriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPrescription(
    referralId: string,
    specialistUserId: string,
    dto: CreateSpecialistPrescriptionDto,
  ) {
    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: referralId },
      include: { specialist: { include: { user: true } }, patient: true },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found.');
    }

    if (referral.specialist_id && referral.specialist_id !== specialistUserId) {
      throw new ForbiddenException('This referral is not assigned to you.');
    }

    if (referral.status === 'COMPLETED') {
      throw new BadRequestException('Cannot prescribe for a completed referral.');
    }

    const specialistProfile = await this.prisma.specialist_profiles.findUnique({
      where: { user_id: specialistUserId },
      include: { user: true },
    });

    if (!specialistProfile) {
      throw new ForbiddenException('Specialist profile not found.');
    }

    const patientId = referral.patient_id;

    const activePrescriptions = await this.prisma.prescriptions.findMany({
      where: {
        patient_id: patientId,
        status: 'ACTIVE',
      },
      include: { medications: true },
    });

    const activeMedications = activePrescriptions.flatMap((p) =>
      p.medications.map((m) => ({ generic_name: m.generic_name })),
    );

    const warnings = checkInteractions(
      dto.medications.map((m) => ({ drug_name: m.drug_name })),
      activeMedications,
    );

    const parsedMeds = dto.medications.map((m) => ({
      ...this.parseMedication(m),
      provider_type: 'SPECIALIST' as const,
    }));

    const prescription = await this.prisma.prescriptions.create({
      data: {
        patient_id: patientId,
        specialist_id: specialistUserId,
        provider_type: 'SPECIALIST',
        digital_signature_url: specialistProfile.signature_url,
        status: 'ACTIVE',
        medications: {
          create: parsedMeds.map((med) => ({
            generic_name: med.generic_name,
            brand_name: med.brand_name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration_days: med.duration_days,
            route: med.route,
            special_instructions: med.special_instructions,
            conditional_flag: med.conditional_flag,
            taper_details: med.taper_details ?? Prisma.JsonNull,
          })),
        },
      },
      include: { medications: true },
    });

    const actorName = specialistProfile.user
      ? `Dr. ${specialistProfile.user.firstNameEn} ${specialistProfile.user.lastNameEn}`.trim()
      : `Specialist ${specialistUserId}`;

    const numMeds = parsedMeds.length;
    await this.prisma.referral_chain.create({
      data: {
        patient_id: patientId,
        step_type: 'SPECIALIST_PRESCRIPTION',
        step_id: prescription.id,
        step_label: `Prescription Issued (${numMeds} medication${numMeds !== 1 ? 's' : ''})`,
        actor_role: 'SPECIALIST',
        actor_name: actorName,
        notes: `Prescribed: ${parsedMeds.map((m) => m.generic_name).join(', ')}`,
      },
    });

    return {
      prescription,
      interaction_warnings_found: warnings.length > 0,
      warnings,
      digital_signature_applied: !!specialistProfile.signature_url,
    };
  }

  async getPrescriptions(referralId: string) {
    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: referralId },
      select: { patient_id: true },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found.');
    }

    return this.prisma.prescriptions.findMany({
      where: {
        patient_id: referral.patient_id,
      },
      orderBy: { issued_at: 'desc' },
      include: {
        medications: true,
        doctor: {
          include: { user: { select: { firstNameEn: true, lastNameEn: true } } },
        },
        specialist: {
          include: { user: { select: { firstNameEn: true, lastNameEn: true } } },
        },
      },
    });
  }

  private parseMedication(med: MedicationDto): {
    generic_name: string;
    brand_name: string | null;
    dosage: string;
    frequency: string;
    duration_days: number;
    route: string;
    special_instructions: string | null;
    conditional_flag: boolean;
    taper_details: Prisma.InputJsonValue | null;
  } {
    const drugName = med.drug_name;
    const parts = drugName.split('(');
    const generic_name = parts[0]?.trim() || drugName;
    const brand_name =
      parts[1]?.replace(')', '').trim() || null;

    const durationDays = this.parseDuration(med.duration);

    let taperDetails: Prisma.InputJsonValue | null = null;
    if (med.taper_details && med.taper_details.length > 0) {
      taperDetails = {
        schedule: med.taper_details.map((step) => ({
          days_range: step.days_range,
          dosage: step.dosage,
        })),
      };
    }

    return {
      generic_name,
      brand_name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration_days: durationDays,
      route: med.route,
      special_instructions: med.special_instructions ?? null,
      conditional_flag: med.conditional_flag,
      taper_details: taperDetails,
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+)/);
    if (!match) {
      throw new BadRequestException(
        `Invalid duration format: "${duration}". Expected a number followed by unit (e.g. "7 days").`,
      );
    }
    return parseInt(match[1], 10);
  }
}
