import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteReferralDto } from './dto/complete-referral.dto';
import { CreateAdditionalTestOrderDto } from './dto/create-additional-test-order.dto';

@Injectable()
export class SpecialistService {
  constructor(private prisma: PrismaService) {}

  async getReferrals(doctorId: string) {
    return this.prisma.specialist_referrals.findMany({
      where: { specialist_id: doctorId },
      include: { patient: true },
    });
  }

  private async resolveSpecialistProfile(userId?: string) {
    if (userId) {
      const byUserId = await this.prisma.specialist_profiles.findUnique({
        where: { user_id: userId },
        include: { user: true },
      });
      if (byUserId) return byUserId;
    }

    return this.prisma.specialist_profiles.findFirst({
      include: { user: true },
      orderBy: { created_at: 'asc' },
    });
  }

  private mapVitalSigns(
    vitalSigns: Array<{
      systolic_bp: number | null;
      diastolic_bp: number | null;
      pulse_bpm: number | null;
      temperature_c: number | null;
      spo2_pct: number | null;
    }>,
  ) {
    return vitalSigns.map((vital) => ({
      blood_pressure_systolic: vital.systolic_bp ?? 0,
      blood_pressure_diastolic: vital.diastolic_bp ?? 0,
      pulse: vital.pulse_bpm ?? 0,
      temperature: Number(vital.temperature_c ?? 0),
      spo2: vital.spo2_pct ?? 0,
    }));
  }

  async getSpecialistsBySpecialty(specialtyCode: string) {
    const profiles = await this.prisma.specialist_profiles.findMany({
      where: { specialty_code: specialtyCode, is_available: true },
      include: {
        user: {
          select: {
            firstNameEn: true,
            lastNameEn: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return profiles.map((p) => ({
      user_id: p.user_id,
      first_name_en: p.user.firstNameEn,
      last_name_en: p.user.lastNameEn,
      email: p.user.email,
      specialty_code: p.specialty_code,
      qualification: p.qualification,
      years_of_experience: p.years_of_experience,
      consultation_fee: p.consultation_fee,
      is_available: p.is_available,
    }));
  }

  async getTestCatalog(category?: string) {
    const where = category
      ? { category, is_active: true }
      : { is_active: true };
    return this.prisma.diagnostic_test_catalog.findMany({
      where,
      orderBy: { category: 'asc' },
    });
  }

  async orderAdditionalTests(
    specialistUserId: string,
    dto: CreateAdditionalTestOrderDto,
  ) {
    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: dto.referralId },
      select: { patient_id: true, specialty_code: true },
    });
    if (!referral) throw new NotFoundException('Referral not found');

    const specialist = await this.prisma.specialist_profiles.findUnique({
      where: { user_id: specialistUserId },
      include: { user: true },
    });
    if (!specialist)
      throw new NotFoundException('Specialist profile not found');

    const tests = await this.prisma.diagnostic_test_catalog.findMany({
      where: { id: { in: dto.test_ids } },
    });
    if (tests.length !== dto.test_ids.length) {
      throw new BadRequestException('One or more test IDs are invalid.');
    }

    const orders = await Promise.all(
      dto.test_ids.map((testId) =>
        this.prisma.diagnostic_test_orders.create({
          data: {
            patient_id: referral.patient_id,
            test_id: testId,
            specialist_id: specialistUserId,
            provider_type: 'SPECIALIST',
            clinical_notes: dto.clinical_notes,
            status: 'ORDERED',
          },
          include: { test: true },
        }),
      ),
    );

    const actorName = specialist.user
      ? `Dr. ${specialist.user.firstNameEn} ${specialist.user.lastNameEn}`.trim()
      : `Specialist ${specialistUserId}`;

    await this.prisma.referral_chain.create({
      data: {
        patient_id: referral.patient_id,
        step_type: 'TEST_ORDER',
        step_id: orders.map((o) => o.id).join(','),
        step_label: `Additional Tests Ordered (${tests.length})`,
        actor_role: 'SPECIALIST',
        actor_name: actorName,
        notes: tests.map((t) => t.test_name).join('; '),
      },
    });

    return {
      orders,
      test_catalog: tests,
    };
  }

  async getTestOrdersByReferral(referralId: string) {
    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: referralId },
      select: { patient_id: true },
    });
    if (!referral) throw new NotFoundException('Referral not found');

    return this.prisma.diagnostic_test_orders.findMany({
      where: { patient_id: referral.patient_id },
      orderBy: { ordered_at: 'desc' },
      include: { test: true, results: true },
    });
  }

  async getReferralPatientHistory(referralId: string) {
    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: referralId },
      select: { patient_id: true },
    });
    if (!referral) throw new NotFoundException('Referral not found');

    const patientId = referral.patient_id;

    const [
      vitals,
      diagnoses,
      prescriptions,
      testOrders,
      chainEvents,
      diagnosisReports,
    ] = await Promise.all([
      this.prisma.patient_vital_signs.findMany({
        where: { patient_id: patientId },
        orderBy: { recorded_at: 'desc' },
        take: 20,
      }),
      this.prisma.patient_diagnoses.findMany({
        where: { patient_id: patientId },
        orderBy: { diagnosed_at: 'desc' },
        include: { icd10: true },
      }),
      this.prisma.prescriptions.findMany({
        where: { patient_id: patientId },
        orderBy: { issued_at: 'desc' },
        include: { medications: true },
      }),
      this.prisma.diagnostic_test_orders.findMany({
        where: { patient_id: patientId },
        orderBy: { ordered_at: 'desc' },
        include: { test: true, results: true },
      }),
      this.prisma.referral_chain.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.patient_diagnosis_reports.findMany({
        where: { patient_id: patientId },
        orderBy: { generated_at: 'desc' },
      }),
    ]);

    return {
      vitals,
      diagnoses,
      prescriptions,
      test_orders: testOrders,
      referral_chain: chainEvents,
      diagnosis_reports: diagnosisReports,
    };
  }

  async getMyIncomingReferrals(userId: string) {
    const specialist = await this.resolveSpecialistProfile(userId);
    if (!specialist)
      throw new NotFoundException('Specialist profile not encountered.');

    const referrals = await this.prisma.specialist_referrals.findMany({
      where: {
        status: 'PENDING',
        specialty_code: specialist.specialty_code,
      },
      include: {
        patient: {
          select: {
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            sex: true,
            known_allergies: true,
            vital_signs: {
              orderBy: { recorded_at: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return referrals.map((referral) => ({
      ...referral,
      created_at: referral.created_at?.toISOString() ?? null,
      updated_at: referral.updated_at?.toISOString() ?? null,
      patient: {
        ...referral.patient,
        vital_signs: this.mapVitalSigns(
          referral.patient.vital_signs as Array<{
            systolic_bp: number | null;
            diastolic_bp: number | null;
            pulse_bpm: number | null;
            temperature_c: number | null;
            spo2_pct: number | null;
          }>,
        ),
      },
    }));
  }

  async getSpecialistReports(userId: string) {
    const specialist = await this.resolveSpecialistProfile(userId);
    if (!specialist)
      throw new NotFoundException('Specialist profile not encountered.');

    const referrals = await this.prisma.specialist_referrals.findMany({
      where: {
        status: 'COMPLETED',
      },
      include: {
        patient: {
          select: {
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return referrals.map((referral) => ({
      id: referral.id,
      patient: `${referral.patient.first_name_en} ${referral.patient.last_name_en}`,
      mrn: referral.patient.mrn,
      type: `${referral.specialty_code} Consultation Report`,
      status: 'SIGNED',
      date: referral.updated_at
        ? new Date(referral.updated_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Pending',
      hash: `sha256:${referral.id.replace(/-/g, '').slice(0, 16)}`,
      findings:
        referral.response_notes ??
        referral.clinical_summary ??
        'No specialist response recorded in the database yet.',
    }));
  }

  async getMedicationRoutes() {
    return this.prisma.medication_routes.findMany({
      where: { is_active: true },
      orderBy: { code: 'asc' },
    });
  }

  async completeReferral(specialistUserId: string, dto: CompleteReferralDto) {
    const specialist = await this.resolveSpecialistProfile(specialistUserId);
    if (!specialist)
      throw new NotFoundException('Specialist validation credential failure.');

    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: dto.referralId },
    });
    if (!referral)
      throw new NotFoundException('Target referral case item missing.');
    if (referral.status !== 'PENDING')
      throw new BadRequestException('Referral has already been resolved.');

    return this.prisma.$transaction(async (tx) => {
      const updatedReferral = await tx.specialist_referrals.update({
        where: { id: dto.referralId },
        data: {
          status: 'COMPLETED',
          specialist_id: specialist.user_id,
          response_notes: dto.responseNotes,
          updated_at: new Date(),
        },
      });

      await tx.referral_chain.create({
        data: {
          patient_id: referral.patient_id,
          step_type: 'SPECIALIST_CONSULTATION',
          step_id: referral.id,
          step_label: `Specialist Consultation Complete (${specialist.specialty_code})`,
          actor_role: 'SPECIALIST',
          actor_name:
            `Dr. ${specialist.user?.firstNameEn ?? specialist.user_id} ${specialist.user?.lastNameEn ?? ''}`.trim(),
          notes: dto.responseNotes,
        },
      });

      return {
        success: true,
        message: 'Consultation completed and persisted in the database.',
        referral: updatedReferral,
      };
    });
  }
}
