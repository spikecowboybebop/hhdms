// Seed tickets to test the Admin Ticket Detail Drawer (/admin/tickets/:id).
// Creates service tickets wired to real patients/providers across service
// types, covering three display scenarios for the drawer:
//   1. payment present + audit history (REASSIGN_TICKET)   -> full drawer
//   2. payment present, NO audit                           -> "No audit events"
//   3. NO payment + a TICKET_CREATE audit row              -> "—" payment info
//
// Run via: npx tsx prisma/seed-ticket-details.ts
// Idempotent: skips if the tagged demo tickets already exist.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BOOKED_BY = 'seed-ticket-details@hhdms.com';
const ADMIN_ID = 'afbc0a11-439e-403f-adcf-f6b28322bf54';

const SERVICE_TO_ROLE: Record<string, string> = {
  MBBS: 'MBBS_DOCTOR',
  CAREGIVER: 'CAREGIVER',
  NURSE: 'NURSE',
  NUTRITIONIST: 'NUTRITIONIST',
  SPECIALIST: 'SPECIALIST',
};

type Spec = {
  service: string;
  slot: string;
  price: number;
  provider: string;
  scenario: 'PAY_AND_AUDIT' | 'PAY_ONLY' | 'NO_PAY_AUDIT';
};

const plans: Spec[] = [
  {
    service: 'MBBS',
    slot: '09:30-10:00',
    price: 800,
    provider: 'MBBS',
    scenario: 'PAY_AND_AUDIT',
  },
  {
    service: 'CAREGIVER',
    slot: '08:00-16:00',
    price: 900,
    provider: 'CAREGIVER',
    scenario: 'PAY_ONLY',
  },
  {
    service: 'NURSE',
    slot: '20:00-06:00',
    price: 1300,
    provider: 'NURSE',
    scenario: 'PAY_AND_AUDIT',
  },
  {
    service: 'NUTRITIONIST',
    slot: '12:00-13:00',
    price: 600,
    provider: 'NUTRITIONIST',
    scenario: 'NO_PAY_AUDIT',
  },
];

function sortable(value: unknown): string {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v !== null && typeof v === 'object') {
      return Object.keys(v)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = canonical((v as Record<string, unknown>)[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(canonical(value ?? {}));
}

async function appendAudit(params: {
  actorId: string;
  actorRole: string;
  ticketId: string;
  action: string;
  changes: Record<string, unknown>;
}) {
  const { actorId, actorRole, ticketId, action, changes } = params;
  const last = await prisma.system_audit_logs.findFirst({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { contentHash: true },
  });
  const prevHash = last?.contentHash ? last.contentHash : 'GENESIS';
  const createdAt = new Date();
  const body = sortable(changes);
  const canonical = `${prevHash}|${action}|ticket|${ticketId}|${body}|${createdAt.toISOString()}`;
  const contentHash = createHash('sha256')
    .update(canonical, 'utf8')
    .digest('hex');
  await prisma.system_audit_logs.create({
    data: {
      id: randomUUID(),
      actorUserId: actorId,
      actorRole,
      action,
      entityType: 'ticket',
      entityId: ticketId,
      changes: changes as unknown as { [k: string]: unknown },
      prevHash,
      contentHash,
      createdAt,
    },
  });
}

async function main() {
  const existing = await prisma.service_tickets.findMany({
    where: { session: { booked_by: BOOKED_BY } },
    select: { id: true },
  });
  if (existing.length > 0) {
    console.log('Ticket-detail demo tickets already exist — skipping.');
    await prisma.$disconnect();
    return;
  }

  const patients = await prisma.patients.findMany({
    orderBy: { created_at: 'asc' },
    select: { id: true },
    take: 20,
  });
  if (patients.length === 0) {
    console.error('No patients exist. Seed patients first.');
    await prisma.$disconnect();
    return;
  }

  const providerIds: Record<string, string> = {};
  for (const role of Object.values(SERVICE_TO_ROLE)) {
    const roleRec = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRec) throw new Error(`Role ${role} missing`);
    const user = await prisma.user.findFirst({
      where: { roleId: roleRec.id, status: 'ACTIVE' },
      orderBy: { firstNameEn: 'asc' },
    });
    if (!user) throw new Error(`No active ${role}`);
    providerIds[role] = user.id;
  }

  let i = 0;
  for (const spec of plans) {
    i++;
    const patient_id = patients[(i - 1) % patients.length].id;

    const session = await prisma.booking_sessions.create({
      data: {
        patient_id,
        booked_by: BOOKED_BY,
        total_amount: spec.price,
        status: 'ACTIVE',
      },
    });

    const assignedProviderId = providerIds[SERVICE_TO_ROLE[spec.provider]];

    const ticket = await prisma.service_tickets.create({
      data: {
        session_id: session.id,
        ticket_no: `DTL-${spec.service}-${String(i).padStart(2, '0')}`,
        service_type: spec.service,
        scheduled_date: new Date(),
        scheduled_time_slot: spec.slot,
        assigned_provider_id: assignedProviderId,
        price: spec.price,
        status: 'ASSIGNED',
      },
    });

    if (spec.scenario !== 'NO_PAY_AUDIT') {
      await prisma.payments.create({
        data: {
          patient_id,
          booking_session_id: session.id,
          amount: spec.price,
          currency: 'BDT',
          service_type: spec.service,
          stripe_payment_intent_id: `pi_seed_detail_${spec.service}_${Date.now()}_${i}`,
          status: 'completed',
        },
      });
    }

    if (spec.scenario === 'PAY_AND_AUDIT') {
      await appendAudit({
        actorId: ADMIN_ID,
        actorRole: 'ADMIN',
        ticketId: ticket.id,
        action: 'REASSIGN_TICKET',
        changes: {
          ticket_no: ticket.ticket_no,
          service_type: spec.service,
          from_provider_id: null,
          to_provider_id: assignedProviderId,
        },
      });
    } else if (spec.scenario === 'NO_PAY_AUDIT') {
      await appendAudit({
        actorId: ADMIN_ID,
        actorRole: 'ADMIN',
        ticketId: ticket.id,
        action: 'TICKET_CREATE',
        changes: {
          ticket_no: ticket.ticket_no,
          service_type: spec.service,
        },
      });
    }

    console.log(
      `${spec.scenario.padEnd(14)} ${spec.service.padEnd(11)} → ${ticket.ticket_no}`,
    );
  }

  console.log(
    '\nDone. Open /dashboard/admin/scheduling → View on a DTL-* ticket.',
  );
}

void main().finally(() => prisma.$disconnect());
