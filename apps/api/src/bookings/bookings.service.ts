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
    const session = await this.prisma.booking_sessions.findUnique({
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

    if (!session) return null;

    const providerIds = session.tickets
      .map((t) => t.assigned_provider_id)
      .filter((id): id is string => id !== null);

    const uniqueIds = [...new Set(providerIds)];

    if (uniqueIds.length === 0) return session;

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        mbbs_doctor_profiles: {
          select: { specialization: true },
        },
        specialist_profiles: {
          select: { specialty_code: true },
        },
        caregiver_profiles: {
          select: { specializations: true },
        },
        nutritionist_profiles: {
          select: { specialization: true },
        },
      },
    });

    const userMap = new Map<string, (typeof users)[number]>();
    for (const u of users) {
      userMap.set(u.id, u);
    }

    const formatDate = (d: Date | string | null | undefined) => {
      if (!d) return null;
      const date = typeof d === 'string' ? new Date(d) : d;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const tickets = session.tickets.map((ticket) => {
      let specialization: string | null = null;
      const providerUser = ticket.assigned_provider_id
        ? userMap.get(ticket.assigned_provider_id)
        : undefined;

      if (providerUser) {
        const svc = ticket.service_type.toUpperCase();
        if (svc === 'MBBS' && providerUser.mbbs_doctor_profiles) {
          specialization = providerUser.mbbs_doctor_profiles.specialization;
        } else if (svc === 'SPECIALIST' && providerUser.specialist_profiles) {
          specialization = providerUser.specialist_profiles.specialty_code;
        } else if (svc === 'CAREGIVER' && providerUser.caregiver_profiles) {
          specialization = providerUser.caregiver_profiles.specializations;
        } else if (svc === 'NUTRITIONIST' && providerUser.nutritionist_profiles) {
          specialization = providerUser.nutritionist_profiles.specialization;
        }
      }

      return {
        ...ticket,
        scheduled_date: formatDate(ticket.scheduled_date),
        provider: providerUser
          ? {
              id: providerUser.id,
              first_name_en: providerUser.firstNameEn,
              last_name_en: providerUser.lastNameEn,
              specialization,
            }
          : null,
      };
    });

    return { ...session, tickets };
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

  async getUserSessions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });

    if (!user) return [];

    const normalize = (p: string) =>
      p.replace(/^(\+88|88|0)/, '').replace(/\D/g, '');
    const userPhone = user.phoneNumber ? normalize(user.phoneNumber) : null;

    const patients = await this.prisma.patients.findMany({
      where: {
        OR: [
          { user_id: userId },
          ...(userPhone
            ? [
                { phone_number: { contains: userPhone } },
                { emergency_contact: { contains: userPhone } },
              ]
            : []),
        ],
      },
      select: { id: true },
    });

    if (patients.length === 0) return [];

    const patientIds = patients.map((p) => p.id);

    const sessions = await this.prisma.booking_sessions.findMany({
      where: { patient_id: { in: patientIds } },
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
          select: {
            id: true,
            ticket_no: true,
            service_type: true,
            scheduled_date: true,
            scheduled_time_slot: true,
            status: true,
            price: true,
          },
          orderBy: { created_at: 'asc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatDate = (d: Date | string | null | undefined) => {
      if (!d) return null;
      const date = typeof d === 'string' ? new Date(d) : d;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return sessions.map((session) => ({
      ...session,
      tickets: session.tickets.map((ticket) => ({
        ...ticket,
        scheduled_date: formatDate(ticket.scheduled_date),
      })),
    }));
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

        if (providerId && svc.service_type === 'MBBS') {
          await tx.doctor_patient_assignments.upsert({
            where: {
              doctor_id_patient_id: {
                doctor_id: providerId,
                patient_id: dto.patient_id,
              },
            },
            create: {
              doctor_id: providerId,
              patient_id: dto.patient_id,
              appointment_activity: 'pending',
            },
            update: {},
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
            title: 'Service Booking Confirmed',
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

    // ── Notify assigned providers ──
    const assignedProviderIds = [
      ...new Set(
        result.tickets
          .map((t) => t.assigned_provider_id)
          .filter((id): id is string => id !== null),
      ),
    ];

    if (assignedProviderIds.length > 0) {
      const patient = await this.prisma.patients.findUnique({
        where: { id: dto.patient_id },
        select: { first_name_en: true, last_name_en: true },
      });
      const patientName = patient
        ? `${patient.first_name_en} ${patient.last_name_en}`
        : 'a patient';

      for (const providerId of assignedProviderIds) {
        this.notificationsService
          .sendToUser(
            providerId,
            {
              title: 'New Patient Assignment',
              body: `You have been assigned to attend ${patientName}.`,
            },
            {
              session_id: result.session_id,
              type: 'provider_assigned',
            },
          )
          .catch((err) =>
            console.error(
              '[NOTIFICATION] Failed to send provider notification:',
              err,
            ),
          );
      }
    }

    return result;
  }
}
