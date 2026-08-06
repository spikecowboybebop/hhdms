// Seed sample data to test the Admin Scheduling Oversight / Reassign feature.
// Creates booking sessions + service tickets across the 5 assignable service
// types (MBBS, SPECIALIST, CAREGIVER, NUTRITIONIST, NURSE) with a mix of
// PENDING (needs a provider) and ASSIGNED tickets, wired to real patients and
// providers already in the DB.
//
// Run via: npx tsx prisma/seed-scheduling.ts
// Idempotent: skips if the tagged demo tickets already exist.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BOOKED_BY = 'seed-scheduling@hhdms.com';

const SERVICE_TO_ROLE: Record<string, string> = {
  MBBS: 'MBBS_DOCTOR',
  CAREGIVER: 'CAREGIVER',
  NURSE: 'NURSE',
  NUTRITIONIST: 'NUTRITIONIST',
};

type Spec = {
  service: string;
  slot: string;
  price: number;
  provider?: 'MBBS' | 'CAREGIVER' | 'NURSE' | 'NUTRITIONIST';
};

const pendingSpecs: Spec[] = [
  { service: 'CAREGIVER', slot: '09:00-17:00', price: 800 },
  { service: 'NURSE', slot: '20:00-08:00', price: 1200 },
  { service: 'NUTRITIONIST', slot: '11:00-12:00', price: 500 },
  { service: 'SPECIALIST', slot: '14:00-15:00', price: 1500 },
];

const assignedSpecs: Spec[] = [
  { service: 'MBBS', slot: '10:00-10:30', price: 800, provider: 'MBBS' },
  { service: 'CAREGIVER', slot: '08:00-16:00', price: 800, provider: 'CAREGIVER' },
  { service: 'NURSE', slot: '18:00-06:00', price: 1200, provider: 'NURSE' },
  { service: 'NUTRITIONIST', slot: '16:00-17:00', price: 500, provider: 'NUTRITIONIST' },
];

async function main() {
  const existing = await prisma.service_tickets.findMany({
    where: { session: { booked_by: BOOKED_BY } },
    select: { id: true },
  });
  if (existing.length > 0) {
    console.log('Scheduling demo tickets already exist — skipping.');
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
  console.log(`Using ${patients.length} patients.`);

  const providers: Record<string, string> = {};
  for (const role of ['MBBS_DOCTOR', 'CAREGIVER', 'NURSE', 'NUTRITIONIST']) {
    const roleRec = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRec) throw new Error(`Role ${role} missing`);
    const user = await prisma.user.findFirst({
      where: { roleId: roleRec.id, status: 'ACTIVE' },
      orderBy: { firstNameEn: 'asc' },
    });
    if (!user) throw new Error(`No active ${role}`);
    providers[role] = user.id;
  }

  let i = 0;
  const createSession = async (price: number, patient_id: string) => {
    const session = await prisma.booking_sessions.create({
      data: {
        patient_id,
        booked_by: BOOKED_BY,
        total_amount: price,
        status: 'ACTIVE',
      },
    });
    return session.id;
  };

  for (const spec of assignedSpecs) {
    const patient_id = patients[i % patients.length].id;
    i++;
    const role = SERVICE_TO_ROLE[spec.provider as string];
    const session_id = await createSession(spec.price, patient_id);
    await prisma.service_tickets.create({
      data: {
        session_id,
        ticket_no: `SCHED-${spec.service}-${String(i).padStart(2, '0')}-ASGN`,
        service_type: spec.service,
        scheduled_date: new Date(),
        scheduled_time_slot: spec.slot,
        assigned_provider_id: providers[role],
        price: spec.price,
        status: 'ASSIGNED',
      },
    });
    console.log(
      `ASSIGNED ${spec.service} → patient ${patient_id.slice(0, 8)} / provider ${providers[role!].slice(0, 8)}`,
    );
  }

  for (const spec of pendingSpecs) {
    const patient_id = patients[i % patients.length].id;
    i++;
    const session_id = await createSession(spec.price, patient_id);
    await prisma.service_tickets.create({
      data: {
        session_id,
        ticket_no: `SCHED-${spec.service}-${String(i).padStart(2, '0')}-PEND`,
        service_type: spec.service,
        scheduled_date: new Date(),
        scheduled_time_slot: spec.slot,
        assigned_provider_id: null,
        price: spec.price,
        status: 'PENDING',
      },
    });
    console.log(`PENDING  ${spec.service} → ${patient_id.slice(0, 8)} (no provider)`);
  }

  console.log('\nDone. Open /dashboard/admin/scheduling to see the seeded tickets.');
}

main().finally(() => prisma.$disconnect());