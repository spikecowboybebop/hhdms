// HHDMS Specialist Module Seed — run AFTER prisma/seed.ts
// npx tsx prisma/seed-specialist.ts

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const SALT_ROUNDS = 12;
  const PASSWORD = 'Password2026!';
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ── Resolve existing entities ──────────────────────────────────────
  const specRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SPECIALIST' } });
  const mbbsRole = await prisma.role.findUniqueOrThrow({ where: { name: 'MBBS_DOCTOR' } });

  const arif = await prisma.user.findUniqueOrThrow({ where: { email: 'dr.arif@hhdms.com' } });
  const farzana = await prisma.user.findUniqueOrThrow({ where: { email: 'dr.farzana@hhdms.com' } });
  const sajid = await prisma.user.findUniqueOrThrow({ where: { email: 'dr.sajid@hhdms.com' } });
  const nasrin = await prisma.user.findUniqueOrThrow({ where: { email: 'dr.nasrin@hhdms.com' } });
  const nusrat = await prisma.user.findUniqueOrThrow({ where: { email: 'dr.nusrat@hhdms.com' } });

  const patient1 = await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0001' } });
  const patient2 = await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0002' } });
  const patient3 = await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0003' } });
  const patient4 = await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0004' } });

  // ── Add a second specialist (Neurology) ────────────────────────────
  console.log('Creating dr.kamal@hhdms.com (Specialist - NEURO)...');
  const kamal = await prisma.user.upsert({
    where: { email: 'dr.kamal@hhdms.com' },
    update: {},
    create: {
      email: 'dr.kamal@hhdms.com',
      passwordHash,
      phoneNumber: '+8801700000008',
      firstNameEn: 'Kamal',
      lastNameEn: 'Hassan',
      firstNameBn: 'কামাল',
      roleId: specRole.id,
      status: 'ACTIVE',
    },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO specialist_profiles (user_id, license_number, bmdc_registration, specialty_code, qualification, years_of_experience, consultation_fee, is_available)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id) DO UPDATE SET license_number=$2, specialty_code=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, is_available=$8`,
    kamal.id, 'BMDC-2024-S02', 'BMDC-REG-2024-S02', 'NEURO',
    'MBBS, FCPS (Neurology), MD (Neurology)', 10, 1800.0, true,
  );
  console.log('  Done: dr.kamal (NEURO)');

  // ── Clear old specialist referrals to avoid duplicates on re-run ───
  await prisma.referral_chain.deleteMany({ where: { step_type: 'SPECIALIST_CONSULTATION' } });
  await prisma.specialist_referrals.deleteMany({});

  // ── Referral 1: Rahim → Dr. Nusrat (CARD) ─ PENDING ────────────────
  console.log('Creating referrals...');
  const ref1 = await prisma.specialist_referrals.create({
    data: {
      patient_id: patient1.id,
      referring_doctor_id: arif.id,
      specialist_id: nusrat.id,
      specialty_code: 'CARD',
      referral_reason: 'Uncontrolled hypertension with recent episodes of dizziness.',
      clinical_summary: 'BP 145/90 on Amlodipine 5mg. ECG shows mild LVH. Needs echocardiogram and cardiology assessment.',
      is_emergency: false,
      status: 'PENDING',
    },
  });
  console.log('  1: Rahim → Nusrat (CARD) [PENDING]');

  // ── Referral 2: Fatema → Dr. Nusrat (CARD) ─ COMPLETED ────────────
  const ref2 = await prisma.specialist_referrals.create({
    data: {
      patient_id: patient2.id,
      referring_doctor_id: arif.id,
      specialist_id: nusrat.id,
      specialty_code: 'CARD',
      referral_reason: 'Chest pain on exertion for 2 weeks with palpitations.',
      clinical_summary: 'ECG shows ST depression in V5-V6. Troponin negative x2. Stress test recommended.',
      is_emergency: false,
      status: 'COMPLETED',
      response_notes: 'Patient evaluated. Stress echocardiogram showed inducible ischemia in LAD territory. Started on Bisoprolol 2.5mg and Atorvastatin 20mg. Follow-up in 4 weeks. Advised lifestyle modifications.',
      updated_at: new Date('2026-06-28'),
    },
  });
  await prisma.referral_chain.create({
    data: {
      patient_id: patient2.id,
      step_type: 'SPECIALIST_CONSULTATION',
      step_id: ref2.id,
      step_label: 'Specialist Consultation Complete (CARD)',
      actor_role: 'SPECIALIST',
      actor_name: 'Dr. Nusrat Jahan',
      notes: ref2.response_notes,
      created_at: new Date('2026-06-28'),
    },
  });
  console.log('  2: Fatema → Nusrat (CARD) [COMPLETED]');

  // ── Referral 3: Kabir → Dr. Kamal (NEURO) ─ PENDING ───────────────
  const ref3 = await prisma.specialist_referrals.create({
    data: {
      patient_id: patient3.id,
      referring_doctor_id: sajid.id,
      specialist_id: kamal.id,
      specialty_code: 'NEURO',
      referral_reason: 'Recurrent migraine with aura for 6 months. Recent episode with transient visual disturbance.',
      clinical_summary: 'Patient reports 3-4 migraine episodes per month. CT head was normal. Trial of sumatriptan partially effective. Needs neurology review for migraine prophylaxis.',
      is_emergency: false,
      status: 'PENDING',
    },
  });
  console.log('  3: Kabir → Kamal (NEURO) [PENDING]');

  // ── Referral 4: Shahnaz → Dr. Kamal (NEURO) ─ COMPLETED ──────────
  const ref4 = await prisma.specialist_referrals.create({
    data: {
      patient_id: patient4.id,
      referring_doctor_id: nasrin.id,
      specialist_id: kamal.id,
      specialty_code: 'NEURO',
      referral_reason: 'Chronic lower back pain with radiculopathy for 3 months.',
      clinical_summary: 'MRI lumbar spine shows L4-L5 disc bulge with nerve root compression. Failed conservative management. Needs neurosurgical opinion.',
      is_emergency: false,
      status: 'COMPLETED',
      response_notes: 'Neurological examination reveals decreased sensation in L5 distribution. MRI confirms L4-L5 disc protrusion impinging on right L5 nerve root. Advised 6 weeks of physiotherapy and NSAIDs. If no improvement, consider microdiscectomy. Prescribed Pregabalin 75mg and referred to physiotherapy.',
      updated_at: new Date('2026-06-25'),
    },
  });
  await prisma.referral_chain.create({
    data: {
      patient_id: patient4.id,
      step_type: 'SPECIALIST_CONSULTATION',
      step_id: ref4.id,
      step_label: 'Specialist Consultation Complete (NEURO)',
      actor_role: 'SPECIALIST',
      actor_name: 'Dr. Kamal Hassan',
      notes: ref4.response_notes,
      created_at: new Date('2026-06-25'),
    },
  });
  console.log('  4: Shahnaz → Kamal (NEURO) [COMPLETED]');

  // ── Referral 5: Rahim → Dr. Kamal (NEURO) ─ COMPLETED ────────────
  const ref5 = await prisma.specialist_referrals.create({
    data: {
      patient_id: patient1.id,
      referring_doctor_id: arif.id,
      specialist_id: kamal.id,
      specialty_code: 'NEURO',
      referral_reason: 'New onset headache with hypertension — rule out secondary causes.',
      clinical_summary: 'Patient with known hypertension now reporting morning headaches. Neurological exam normal. MRI brain advised to rule out space-occupying lesion.',
      is_emergency: false,
      status: 'COMPLETED',
      response_notes: 'MRI brain showed no mass or acute pathology. Incidental note of small vessel ischemic changes consistent with chronic hypertension. Advised continued BP control. No neurologic intervention needed.',
      updated_at: new Date('2026-06-20'),
    },
  });
  await prisma.referral_chain.create({
    data: {
      patient_id: patient1.id,
      step_type: 'SPECIALIST_CONSULTATION',
      step_id: ref5.id,
      step_label: 'Specialist Consultation Complete (NEURO)',
      actor_role: 'SPECIALIST',
      actor_name: 'Dr. Kamal Hassan',
      notes: ref5.response_notes,
      created_at: new Date('2026-06-20'),
    },
  });
  console.log('  5: Rahim → Kamal (NEURO) [COMPLETED]');

  // ── Referral 6: Fatema → Dr. Kamal (NEURO) ─ PENDING ─────────────
  await prisma.specialist_referrals.create({
    data: {
      patient_id: patient2.id,
      referring_doctor_id: farzana.id,
      specialist_id: kamal.id,
      specialty_code: 'NEURO',
      referral_reason: 'Diabetic neuropathy - escalating neuropathic pain despite medication.',
      clinical_summary: 'Type 2 diabetic with progressive bilateral lower extremity numbness and burning pain. HbA1c 8.2%. Failed Gabapentin and Duloxetine. Needs neurology review for alternative pain management.',
      is_emergency: false,
      status: 'PENDING',
    },
  });
  console.log('  6: Fatema → Kamal (NEURO) [PENDING]');

  console.log('\n✓ Specialist module seed complete!');
  console.log('  New accounts:');
  console.log('    dr.kamal@hhdms.com / Password2026! (Specialist - NEURO)');
  console.log('  Referrals created: 6 (3 PENDING, 3 COMPLETED)');
  console.log('\n  DICOM library will show:');
  console.log('    - Dr. Nusrat (CARD) → X-RAY modality');
  console.log('    - Dr. Kamal (NEURO) → CT SCAN modality');
  console.log('  Reports page will show 3 completed referrals.');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
