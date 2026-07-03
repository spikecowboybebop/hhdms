import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingSessionDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateTicketNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const rand = String(Math.floor(10000 + Math.random() * 90000));
    return `TKT-${y}-${rand}`;
  }

  private async assignMbbsDoctor(
    tx: any,
    patientId: string,
    scheduledDate: string | undefined,
  ): Promise<string | null> {
    const patient = await tx.patients.findUnique({
      where: { id: patientId },
      select: { district: true },
    });

    const dayOfWeek =
      scheduledDate !== undefined
        ? new Date(scheduledDate).getDay()
        : undefined;

    const where: Record<string, unknown> = { is_available: true };

    if (dayOfWeek !== undefined) {
      where.schedules = {
        some: { day_of_week: dayOfWeek, is_available: true },
      };
    }

    const doctors = await tx.mbbs_doctor_profiles.findMany({
      where,
      include: {
        _count: { select: { patient_assignments: true } },
      },
      orderBy: { patient_assignments: { _count: 'asc' } },
    });

    if (doctors.length === 0) return null;

    if (patient?.district) {
      const sameDistrict = doctors.filter(
        (d: any) => d.district === patient.district,
      );
      if (sameDistrict.length > 0) return sameDistrict[0].user_id;
    }

    return doctors[0].user_id;
  }

  async getSessionById(id: string) {
    return this.prisma.booking_sessions.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
          },
        },
        tickets: {
          include: { details: true },
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  async userOwnsSession(
    patientId: string,
    userId: string,
  ): Promise<boolean> {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
      select: { user_id: true, phone_number: true, emergency_contact: true },
    });
    if (!patient) return false;
    if (patient.user_id === userId) return true;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });
    if (!user?.phoneNumber) return false;
    const normalize = (p: string) =>
      p.replace(/^(\+88|88|0)/, '').replace(/\D/g, '');
    const userPhone = normalize(user.phoneNumber);
    if (patient.phone_number && normalize(patient.phone_number) === userPhone) return true;
    if (patient.emergency_contact && normalize(patient.emergency_contact) === userPhone) return true;
    return false;
  }

  async debugAccess(userId: string, patientId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phoneNumber: true },
    });
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
      select: { id: true, user_id: true, phone_number: true, emergency_contact: true, first_name_en: true, last_name_en: true },
    });
    const userPatients = await this.prisma.patients.findMany({
      where: { user_id: userId },
      select: { id: true, phone_number: true },
    });
    return { user, patient, userPatients, patientId, userId };
  }

  async createSession(dto: CreateBookingSessionDto) {
    const totalAmount = dto.services.reduce((sum, s) => sum + s.price, 0);

    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.booking_sessions.create({
        data: {
          patient_id: dto.patient_id,
          booked_by: dto.booked_by ?? null,
          agent_id: dto.agent_id ?? null,
          total_amount: totalAmount,
          status: 'ACTIVE',
        },
      });

      const tickets: {
        id: string;
        ticket_no: string;
        service_type: string;
        price: number | null;
        status: string;
        assigned_provider_id: string | null;
      }[] = [];

      for (const svc of dto.services) {
        let providerId = svc.assigned_provider_id ?? null;

        if (!providerId && svc.service_type === 'MBBS') {
          providerId = await this.assignMbbsDoctor(
            tx,
            dto.patient_id,
            svc.scheduled_date,
          );
        }

        const ticket = await tx.service_tickets.create({
          data: {
            session_id: session.id,
            ticket_no: this.generateTicketNo(),
            service_type: svc.service_type,
            scheduled_date: svc.scheduled_date
              ? new Date(svc.scheduled_date)
              : null,
            scheduled_time_slot: svc.scheduled_time_slot ?? null,
            assigned_provider_id: providerId,
            price: svc.price,
            status: providerId ? 'ASSIGNED' : 'PENDING',
          },
        });

        if (
          svc.additional_meta &&
          Object.keys(svc.additional_meta).length > 0
        ) {
          await tx.ticket_specific_details.create({
            data: {
              ticket_id: ticket.id,
              additional_meta: svc.additional_meta as any,
            },
          });
        }

        tickets.push({
          id: ticket.id,
          ticket_no: ticket.ticket_no,
          service_type: ticket.service_type,
          price: ticket.price ? Number(ticket.price) : null,
          status: ticket.status,
          assigned_provider_id: providerId,
        });
      }

      return {
        session_id: session.id,
        total_amount: totalAmount,
        status: session.status,
        tickets,
      };
    });

    const raw = (await this.prisma.$queryRawUnsafe(
      `SELECT user_id FROM patients WHERE id = $1`,
      dto.patient_id,
    )) as { user_id: string | null }[];
    const patientUserId = raw[0]?.user_id ?? null;

    console.log(
      `[NOTIFICATION] Patient lookup: id=${dto.patient_id}, user_id=${patientUserId}`,
    );

    if (patientUserId) {
      const serviceLabels = result.tickets
        .map((t) => t.service_type)
        .join(', ');

      console.log(
        `[NOTIFICATION] Sending push to user ${patientUserId} for session ${result.session_id}`,
      );

      this.notificationsService
        .sendToUser(
          patientUserId,
          {
            title: 'Service Booking Confirmedf',
            body: `A new service booking (${serviceLabels}) has been created for you.`,
          },
          {
            session_id: result.session_id,
            type: 'booking_confirmed',
          },
        )
        .catch((err) =>
          console.error('[NOTIFICATION] Failed to send booking notification:', err),
        );
    } else {
      console.log('[NOTIFICATION] No user_id on patient, skipping push');
    }

    return result;
  }
}
