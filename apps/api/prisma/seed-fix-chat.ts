// Diagnose and fix chat for user Mehrab
// npx tsx prisma/seed-fix-chat.ts

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Find user Mehrab
  const user = await prisma.user.findFirst({
    where: { firstNameEn: 'Mehrab' },
    select: { id: true, email: true, firstNameEn: true, lastNameEn: true, roleId: true },
  });
  if (!user) {
    console.log('No user found with firstNameEn = Mehrab. Trying email...');
    const user2 = await prisma.user.findFirst({
      where: { email: { contains: 'mehrab', mode: 'insensitive' } },
      select: { id: true, email: true, firstNameEn: true, lastNameEn: true, roleId: true },
    });
    if (!user2) {
      console.log('No user found. Listing all mobile users:');
      const mobiles = await prisma.user.findMany({
        where: { roleId: 7 },
        select: { id: true, email: true, firstNameEn: true, lastNameEn: true },
      });
      mobiles.forEach(m => console.log(`  ${m.id} | ${m.email} | ${m.firstNameEn} ${m.lastNameEn}`));
      await prisma.$disconnect();
      return;
    }
    console.log(`Found user: ${user2.email} (${user2.firstNameEn} ${user2.lastNameEn}) ID=${user2.id}`);
    return diagnose(user2.id);
  }
  console.log(`Found user: ${user.email} (${user.firstNameEn} ${user.lastNameEn}) ID=${user.id}`);
  return diagnose(user.id);
}

async function diagnose(userId: string) {
  // 2. Find patient record
  const patient = await prisma.patients.findFirst({
    where: { user_id: userId },
    select: { id: true, mrn: true, first_name_en: true, last_name_en: true, user_id: true },
  });
  if (!patient) {
    console.log('ERROR: No patient record linked to this user_id!');
    await prisma.$disconnect();
    return;
  }
  console.log(`Patient: ${patient.mrn} (${patient.first_name_en} ${patient.last_name_en}) ID=${patient.id}`);

  // 3. Check existing assignments
  const assignments = await prisma.doctor_patient_assignments.findMany({
    where: { patient_id: patient.id },
    include: {
      doctor: { include: { user: { select: { id: true, firstNameEn: true, lastNameEn: true, email: true } } } },
    },
    orderBy: { assigned_at: 'desc' },
  });
  console.log(`\nExisting doctor_patient_assignments (${assignments.length}):`);
  for (const a of assignments) {
    console.log(`  ID=${a.id} doctor=${a.doctor?.user?.firstNameEn} ${a.doctor?.user?.lastNameEn} (${a.doctor?.user?.email}) activity=${a.appointment_activity} consent=${a.patient_consent} assigned=${a.assigned_at}`);
  }

  const activeAssignment = assignments.find(a => a.appointment_activity !== 'done');
  if (activeAssignment) {
    console.log(`\nActive assignment exists (activity=${activeAssignment.appointment_activity}). Chat should work.`);
  } else {
    console.log('\nNo active assignment found (all are "done" or none exist).');

    // 4. Find Dr. Farzana
    const farzana = await prisma.user.findFirst({
      where: { firstNameEn: { contains: 'Farzana', mode: 'insensitive' } },
      select: { id: true, email: true, firstNameEn: true, lastNameEn: true },
    });
    if (!farzana) {
      console.log('Dr. Farzana not found in system!');
      await prisma.$disconnect();
      return;
    }
    console.log(`\nDr. Farzana: ${farzana.email} ID=${farzana.id}`);

    // 5. Create active assignment
    const existingFarzana = assignments.find(a => a.doctor_id === farzana.id);
    if (existingFarzana) {
      // Update the existing one to active
      console.log(`\nUpdating existing assignment to activity=arrived...`);
      await prisma.doctor_patient_assignments.update({
        where: { id: existingFarzana.id },
        data: { appointment_activity: 'arrived', patient_consent: 'granted' },
      });
      console.log('Done! Assignment updated.');
    } else {
      // Create new assignment
      console.log(`\nCreating new assignment: Mehrab -> Dr. Farzana (activity=arrived)...`);
      await prisma.doctor_patient_assignments.create({
        data: {
          doctor_id: farzana.id,
          patient_id: patient.id,
          appointment_activity: 'arrived',
          patient_consent: 'granted',
        },
      });
      console.log('Done! Assignment created.');
    }

    // 6. Verify chat now works
    const check = await prisma.doctor_patient_assignments.findFirst({
      where: {
        patient_id: patient.id,
        appointment_activity: { not: 'done' },
      },
    });
    console.log(`\nVerification: ${check ? 'Chat should now work!' : 'STILL broken.'}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Script failed:', e);
  process.exit(1);
});
