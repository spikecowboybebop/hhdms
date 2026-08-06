// Seed payments to test the Admin Payments / Finance page (/admin/payments).
// Creates booking sessions + tickets + payments with a mix of statuses
// (pending, failed, completed) across service types, so the payments table,
// KPI summary and "Mark Complete" action all have real data to display.
//
// Run via: npx tsx prisma/seed-payments.ts
// Idempotent: skips if the tagged demo payments already exist.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BOOKED_BY = 'seed-payments@hhdms.com';

const plans = [
  { service: 'MBBS', slot: '10:00-10:30', price: 800, status: 'completed' },
  {
    service: 'CAREGIVER',
    slot: '08:00-16:00',
    price: 850,
    status: 'completed',
  },
  { service: 'NURSE', slot: '18:00-06:00', price: 1250, status: 'pending' },
  {
    service: 'NUTRITIONIST',
    slot: '11:00-12:00',
    price: 550,
    status: 'pending',
  },
  { service: 'SPECIALIST', slot: '14:00-15:00', price: 1500, status: 'failed' },
  { service: 'MBBS', slot: '16:00-16:30', price: 800, status: 'pending' },
  { service: 'NURSE', slot: '20:00-08:00', price: 1250, status: 'completed' },
  { service: 'CAREGIVER', slot: '09:00-17:00', price: 850, status: 'failed' },
];

async function main() {
  const existing = await prisma.payments.findMany({
    where: {
      booking_session: { booked_by: BOOKED_BY },
    },
    select: { id: true },
  });
  if (existing.length > 0) {
    console.log('Payment demo rows already exist — skipping.');
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

  let i = 0;
  for (const plan of plans) {
    i++;
    const patient_id = patients[(i - 1) % patients.length].id;

    const session = await prisma.booking_sessions.create({
      data: {
        patient_id,
        booked_by: BOOKED_BY,
        total_amount: plan.price,
        status: 'ACTIVE',
      },
    });

    const ticket = await prisma.service_tickets.create({
      data: {
        session_id: session.id,
        ticket_no: `PAY-${plan.service}-${String(i).padStart(2, '0')}`,
        service_type: plan.service,
        scheduled_date: new Date(),
        scheduled_time_slot: plan.slot,
        assigned_provider_id: null,
        price: plan.price,
        status: 'PENDING',
      },
    });
    void ticket;

    await prisma.payments.create({
      data: {
        patient_id,
        booking_session_id: session.id,
        amount: plan.price,
        currency: 'BDT',
        service_type: plan.service,
        stripe_payment_intent_id: `pi_seed_pay_${plan.service}_${Date.now()}_${i}`,
        status: plan.status,
        completed_at: plan.status === 'completed' ? new Date() : null,
      },
    });

    console.log(
      `${plan.status.padEnd(10)} ${plan.service.padEnd(11)} → PAY-${plan.service}-${String(i).padStart(2, '0')}`,
    );
  }

  console.log('\nDone. Open /dashboard/admin/payments to see the seeded rows.');
}

void main().finally(() => prisma.$disconnect());
