import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteReferralDto } from './dto/complete-referral.dto';

@Injectable()
export class SpecialistService {
  constructor(private prisma: PrismaService) {}

  async getMyIncomingReferrals(userId: string) {
    const specialist = await this.prisma.specialist_profiles.findUnique({
      where: { user_id: userId },
    });
    if (!specialist) throw new NotFoundException('Specialist profile not encountered.');

    return this.prisma.specialist_referrals.findMany({
      where: {
        specialty_code: specialist.specialty_code,
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
  }

  async completeReferral(dto: CompleteReferralDto) {
    const specialist = await this.prisma.specialist_profiles.findUnique({
      where: { user_id: dto.specialistId },
      include: { user: true },
    });
    if (!specialist) throw new NotFoundException('Specialist validation credential failure.');

    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: dto.referralId },
    });
    if (!referral) throw new NotFoundException('Target referral case item missing.');
    if (referral.status !== 'PENDING') throw new BadRequestException('Referral has already been resolved.');

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
          actor_name: `Dr. ${specialist.user.firstNameEn} ${specialist.user.lastNameEn}`,
          notes: dto.responseNotes,
        },
      });

      return updatedReferral;
    });
  }
}