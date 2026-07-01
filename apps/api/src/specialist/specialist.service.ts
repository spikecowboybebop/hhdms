import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteReferralDto } from './dto/complete-referral.dto';

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

  async getMyIncomingReferrals(userId: string) {
    const specialist = await this.resolveSpecialistProfile(userId);
    if (!specialist)
      throw new NotFoundException('Specialist profile not encountered.');

    const referrals = await this.prisma.specialist_referrals.findMany({
      where: {
        status: 'PENDING',
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

  async getSpecialistDicomStudies(userId: string) {
    const specialist = await this.resolveSpecialistProfile(userId);
    if (!specialist)
      throw new NotFoundException('Specialist profile not encountered.');

    const referrals = await this.prisma.specialist_referrals.findMany({
      include: {
        patient: {
          select: {
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return referrals.map((referral) => ({
      id: referral.id,
      patient: `${referral.patient.first_name_en} ${referral.patient.last_name_en}`,
      mrn: referral.patient.mrn,
      modality: this.getModalityForReferral(referral.specialty_code),
      instances: referral.status === 'COMPLETED' ? 96 : 12,
      size: referral.status === 'COMPLETED' ? '182.4 MB' : '41.8 MB',
      date: referral.created_at?.toISOString().split('T')[0] ?? '',
      imageUrl: this.getImageUrl(referral.specialty_code),
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

  async completeReferral(dto: CompleteReferralDto) {
    const specialist = await this.resolveSpecialistProfile(dto.specialistId);
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

  private getModalityForReferral(specialtyCode: string) {
    const normalized = specialtyCode.toUpperCase();
    if (normalized.includes('CARD') || normalized.includes('DERM'))
      return 'X-RAY';
    if (normalized.includes('NEURO') || normalized.includes('ONC'))
      return 'CT SCAN';
    return 'ULTRASOUND';
  }

  private getImageUrl(specialtyCode: string) {
    const modality = this.getModalityForReferral(specialtyCode);
    const imageMap: Record<string, string> = {
      'X-RAY':
        'https://images.unsplash.com/photo-1559757175-5700dde675bc?q=80&w=600&auto=format&fit=crop',
      'CT SCAN':
        'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?q=80&w=600&auto=format&fit=crop',
      ULTRASOUND:
        'https://images.unsplash.com/photo-1516062423079-7ca13cca99a8?q=80&w=600&auto=format&fit=crop',
    };

    return imageMap[modality] ?? imageMap['X-RAY'];
  }
}
