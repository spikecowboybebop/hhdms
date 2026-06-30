import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingSessionDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateTicketNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const rand = String(Math.floor(10000 + Math.random() * 90000));
    return `TKT-${y}-${rand}`;
  }

  async createSession(dto: CreateBookingSessionDto) {
    const totalAmount = dto.services.reduce((sum, s) => sum + s.price, 0);

    return this.prisma.$transaction(async (tx) => {
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
      }[] = [];

      for (const svc of dto.services) {
        const ticket = await tx.service_tickets.create({
          data: {
            session_id: session.id,
            ticket_no: this.generateTicketNo(),
            service_type: svc.service_type,
            scheduled_date: svc.scheduled_date
              ? new Date(svc.scheduled_date)
              : null,
            scheduled_time_slot: svc.scheduled_time_slot ?? null,
            assigned_provider_id: svc.assigned_provider_id ?? null,
            price: svc.price,
            status: 'PENDING',
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
        });
      }

      return {
        session_id: session.id,
        total_amount: totalAmount,
        status: session.status,
        tickets,
      };
    });
  }
}
