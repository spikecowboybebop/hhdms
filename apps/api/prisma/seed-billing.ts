// Seed the canonical service price table for the auto price-rule engine
// (removes hardcoded 800 BDT MBBS fallback) and generate demo invoices for the
// completed seed payments so the Payments page can show invoice/receipt rows.
//
// Run via: npx tsx prisma/seed-billing.ts
// Idempotent: upserts service_prices; creates invoices for any completed
// payment that does not yet have one (skips if none are missing).

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Canonical prices — keep in sync with DEFAULT_PRICES in
// apps/api/src/billing/billing.service.ts
const PRICES: Record<string, number> = {
  MBBS: 800,
  SPECIALIST: 1200,
  NURSE: 1500,
  CAREGIVER: 2500,
  NUTRITIONIST: 1000,
  USG: 1200,
  SONOLOGIST: 1200,
  XRAY: 500,
};

async function main() {
  for (const [service_type, price] of Object.entries(PRICES)) {
    await prisma.service_prices.upsert({
      where: { service_type },
      update: { price },
      create: { service_type, price, currency: 'BDT' },
    });
  }
  console.log(`Seeded ${Object.keys(PRICES).length} service price rows.`);

  // Generate an invoice for every completed payment missing one.
  const completed = await prisma.payments.findMany({
    where: { status: 'completed', invoice: null },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      booking_session: { select: { tickets: { select: { ticket_no: true }, take: 1 } } },
    },
  });

  let created = 0;
  for (const payment of completed) {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const count = await prisma.invoices.count({
      where: { invoice_no: { startsWith: prefix } },
    });
    const invoice_no = `${prefix}${String(count + 1).padStart(5, '0')}`;

    const paymentRow = await prisma.payments.findUnique({
      where: { id: payment.id },
      select: {
        patient_id: true,
        booking_session_id: true,
        service_type: true,
        amount: true,
        currency: true,
        completed_at: true,
      },
    });
    if (!paymentRow) continue;

    await prisma.invoices.create({
      data: {
        invoice_no,
        booking_session_id: paymentRow.booking_session_id,
        payment_id: payment.id,
        patient_id: paymentRow.patient_id,
        service_type: paymentRow.service_type,
        amount: paymentRow.amount,
        currency: paymentRow.currency,
        status: 'issued',
        paid_at: paymentRow.completed_at,
      },
    });
    created++;
    console.log(`  INV → ${invoice_no}`);
  }

  console.log(created === 0 ? 'No completed payments missing invoices.' : `Created ${created} invoice(s).`);
}

void main().finally(() => prisma.$disconnect());
