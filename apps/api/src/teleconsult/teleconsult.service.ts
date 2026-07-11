import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeleconsultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createSession(referralId: string, specialistId: string) {
    const referral = await this.prisma.specialist_referrals.findUnique({
      where: { id: referralId },
      include: { patient: { select: { id: true, user_id: true, first_name_en: true, last_name_en: true } } },
    });

    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.specialist_id !== specialistId)
      throw new BadRequestException('This referral is not assigned to you');

    const existing = await this.prisma.teleconsult_sessions.findFirst({
      where: { referral_id: referralId, status: { in: ['PENDING', 'ACTIVE'] } },
    });

    if (existing) return existing;

    const roomName = `teleconsult-${uuidv4().slice(0, 8)}-${Date.now().toString(36)}`;

    const session = await this.prisma.teleconsult_sessions.create({
      data: {
        referral_id: referralId,
        patient_id: referral.patient_id,
        specialist_id: specialistId,
        room_name: roomName,
      },
    });

    const specialistProfile = await this.prisma.specialist_profiles.findUnique({
      where: { user_id: specialistId },
      include: { user: { select: { firstNameEn: true, lastNameEn: true } } },
    });

    const specialistName = specialistProfile
      ? `Dr. ${specialistProfile.user.firstNameEn} ${specialistProfile.user.lastNameEn}`
      : 'Specialist';

    const patientUserId = referral.patient.user_id;
    if (!patientUserId) {
      console.warn(`[Teleconsult] Patient ${referral.patient_id} has no user account — skipping push`);
    } else {
      await this.notifications.sendToUser(
        patientUserId,
        {
          title: 'Video Consultation Request',
          body: `${specialistName} wants to start a video consultation with you`,
        },
        {
          type: 'teleconsult_request',
          session_id: session.id,
          referral_id: referralId,
          room_name: roomName,
          specialist_name: specialistName,
        },
      );
    }

    return session;
  }

  async getSession(id: string) {
    const session = await this.prisma.teleconsult_sessions.findUnique({
      where: { id },
    });

    if (!session) throw new NotFoundException('Teleconsult session not found');
    return session;
  }

  async getSessionByReferral(referralId: string) {
    return this.prisma.teleconsult_sessions.findFirst({
      where: { referral_id: referralId },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') {
    const session = await this.prisma.teleconsult_sessions.findUnique({
      where: { id },
    });

    if (!session) throw new NotFoundException('Teleconsult session not found');

    const data: Record<string, unknown> = { status };

    if (status === 'ACTIVE') {
      data.started_at = new Date();
    } else if (status === 'COMPLETED' || status === 'CANCELLED') {
      data.ended_at = new Date();
    }

    return this.prisma.teleconsult_sessions.update({
      where: { id },
      data,
    });
  }
}
