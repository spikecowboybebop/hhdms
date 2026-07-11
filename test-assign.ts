import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function assignMbbsDoctor(tx: any, patientId: string, scheduledDate?: string, scheduledTimeSlot?: string): Promise<string | null> {
  const patient = await tx.patients.findUnique({ where: { id: patientId }, select: { district: true } });
  if (!patient) { console.log('Patient not found'); return null; }

  const dayOfWeek = scheduledDate ? new Date(scheduledDate).getDay() : undefined;
  const reqStart = scheduledTimeSlot?.split('-')?.[0]?.trim();
  const reqEnd = scheduledTimeSlot?.split('-')?.[1]?.trim();

  const where: Record<string, unknown> = { is_available: true };
  if (dayOfWeek !== undefined) {
    where.schedules = { some: { day_of_week: dayOfWeek, is_available: true } };
  }

  const doctors = await tx.mbbs_doctor_profiles.findMany({
    where,
    include: {
      _count: { select: { patient_assignments: true } },
      schedules: { where: { day_of_week: dayOfWeek, is_available: true } },
    },
    orderBy: { patient_assignments: { _count: 'asc' } },
  });

  if (doctors.length === 0) return null;
  
  let qualified = doctors;
  if (reqStart && reqEnd) {
    const timeOk = doctors.filter((d: any) =>
      d.schedules?.some((s: any) => s.start_time <= reqStart && s.end_time >= reqEnd),
    );
    if (timeOk.length > 0) qualified = timeOk;
  }

  let candidates = qualified;
  if (patient?.district) {
    const pd = patient.district.toLowerCase();
    const sameDistrict = qualified.filter((d: any) => d.district?.toLowerCase() === pd);
    if (sameDistrict.length > 0) candidates = sameDistrict;
  }

  const maxLoad = Math.max(...candidates.map((d: any) => d._count.patient_assignments), 0);
  const weights = candidates.map((d: any) => maxLoad - d._count.patient_assignments + 1);
  const totalWeight = weights.reduce((a: number, b: number) => a + b, 0);

  let r = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].user_id;
  }
  return candidates[0].user_id;
}

async function main() {
  const patient = await prisma.patients.findFirst();
  if (!patient) { console.log('No patients'); return; }
  console.log('Patient:', patient.id, 'district:', patient.district);

  // Inside transaction, no date
  const r1 = await prisma.$transaction(async (tx) => assignMbbsDoctor(tx, patient.id));
  console.log('No date:', r1);

  // Inside transaction, Monday
  const r2 = await prisma.$transaction(async (tx) => assignMbbsDoctor(tx, patient.id, '2026-07-13'));
  console.log('Monday:', r2);

  // Inside transaction, Friday
  const r3 = await prisma.$transaction(async (tx) => assignMbbsDoctor(tx, patient.id, '2026-07-10'));
  console.log('Friday:', r3);
  
  process.exit(0);
}
main();
