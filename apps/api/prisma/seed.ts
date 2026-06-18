// HHDMS Seed Script — TypeScript version
// Run via: npx tsx prisma/seed.ts

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

  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // --- Roles ---
  console.log('Creating roles...');
  const mbbsRole = await prisma.role.upsert({
    where: { name: 'MBBS_DOCTOR' },
    update: {},
    create: { name: 'MBBS_DOCTOR', description: 'MBBS Doctor' },
  });
  const nutRole = await prisma.role.upsert({
    where: { name: 'NUTRITIONIST' },
    update: {},
    create: { name: 'NUTRITIONIST', description: 'Nutritionist' },
  });
  const specRole = await prisma.role.upsert({
    where: { name: 'SPECIALIST' },
    update: {},
    create: { name: 'SPECIALIST', description: 'Specialist' },
  });
  console.log('Roles: MBBS_DOCTOR, NUTRITIONIST, SPECIALIST');

  // --- Dr. Arif (MBBS) ---
  console.log('Creating dr.arif@hhdms.com (MBBS)...');
  const arif = await prisma.user.upsert({
    where: { email: 'dr.arif@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000001', firstNameEn: 'Arif', lastNameEn: 'Hossain', firstNameBn: 'আরিফ', status: 'ACTIVE' },
    create: { email: 'dr.arif@hhdms.com', passwordHash, phoneNumber: '+8801700000001', firstNameEn: 'Arif', lastNameEn: 'Hossain', firstNameBn: 'আরিফ', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, is_available=$8`,
    arif.id, 'BMDC-2024-001', 'BMDC-REG-2024-001', 'Family Medicine', 'MBBS (Dhaka Medical College), MD (Internal Medicine)', 8, 800.0, true
  );
  console.log('  Done: dr.arif (MBBS)');

  // --- Tanvir (Nutritionist) ---
  console.log('Creating nutritionist.tanvir@hhdms.com (Nutritionist)...');
  const tanvir = await prisma.user.upsert({
    where: { email: 'nutritionist.tanvir@hhdms.com' },
    update: { passwordHash, roleId: nutRole.id, phoneNumber: '+8801700000002', firstNameEn: 'Tanvir', lastNameEn: 'Ahmed', firstNameBn: 'তানভীর', status: 'ACTIVE' },
    create: { email: 'nutritionist.tanvir@hhdms.com', passwordHash, phoneNumber: '+8801700000002', firstNameEn: 'Tanvir', lastNameEn: 'Ahmed', firstNameBn: 'তানভীর', roleId: nutRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO nutritionist_profiles (user_id, license_number, specialization, qualification, years_of_experience, consultation_fee, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, specialization=$3, qualification=$4, years_of_experience=$5, consultation_fee=$6, is_available=$7`,
    tanvir.id, 'NUT-2024-001', 'Clinical Dietetics & Obesity Management', 'BSc (Food & Nutrition), MSc (Dietetics)', 5, 500.0, true
  );
  console.log('  Done: tanvir (Nutritionist)');

  // --- Dr. Nusrat (Specialist) ---
  console.log('Creating dr.nusrat@hhdms.com (Specialist)...');
  const nusrat = await prisma.user.upsert({
    where: { email: 'dr.nusrat@hhdms.com' },
    update: { passwordHash, roleId: specRole.id, phoneNumber: '+8801700000003', firstNameEn: 'Nusrat', lastNameEn: 'Jahan', firstNameBn: 'নুসরাত', status: 'ACTIVE' },
    create: { email: 'dr.nusrat@hhdms.com', passwordHash, phoneNumber: '+8801700000003', firstNameEn: 'Nusrat', lastNameEn: 'Jahan', firstNameBn: 'নুসরাত', roleId: specRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO specialist_profiles (user_id, license_number, bmdc_registration, specialty_code, qualification, years_of_experience, consultation_fee, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialty_code=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, is_available=$8`,
    nusrat.id, 'BMDC-2024-S01', 'BMDC-REG-2024-S01', 'CARD', 'MBBS, FCPS (Cardiology), MD (Cardiology)', 12, 1500.0, true
  );
  console.log('  Done: nusrat (Specialist)');

  // --- Verify ---
  const count = await prisma.user.count();
  console.log(`\nSeed complete! Total users: ${count}`);
  console.log('  dr.arif@hhdms.com / Password2026! (MBBS Doctor)');
  console.log('  nutritionist.tanvir@hhdms.com / Password2026! (Nutritionist)');
  console.log('  dr.nusrat@hhdms.com / Password2026! (Specialist)');

  // --- Seed ICD10 Codes ---
  console.log('\nSeeding ICD10 Codes...');
  const icd10 = await prisma.icd10_codes.upsert({
    where: { code: 'I10' },
    update: {},
    create: { code: 'I10', description: 'Essential (primary) hypertension', category: 'Hypertensive diseases' }
  });

  const icd10_2 = await prisma.icd10_codes.upsert({
    where: { code: 'E11' },
    update: {},
    create: { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Diabetes mellitus' }
  });
  console.log('  Done: ICD10 Codes');

  // --- Seed Patient Data ---
  console.log('Seeding Patient Data...');
  const patient1 = await prisma.patients.upsert({
    where: { mrn: 'MRN-2024-0001' },
    update: {},
    create: {
      mrn: 'MRN-2024-0001',
      first_name_en: 'Rahim',
      last_name_en: 'Uddin',
      first_name_bn: 'রহিম',
      last_name_bn: 'উদ্দিন',
      date_of_birth: new Date('1980-05-15'),
      sex: 'M',
      blood_group: 'O+',
      phone_number: '+8801800000001',
      district: 'Dhaka',
      height_cm: 175,
      weight_kg: 82.5,
    }
  });

  const patient2 = await prisma.patients.upsert({
    where: { mrn: 'MRN-2024-0002' },
    update: {},
    create: {
      mrn: 'MRN-2024-0002',
      first_name_en: 'Fatema',
      last_name_en: 'Begum',
      first_name_bn: 'ফাতেমা',
      last_name_bn: 'বেগম',
      date_of_birth: new Date('1992-08-20'),
      sex: 'F',
      blood_group: 'B+',
      phone_number: '+8801900000002',
      district: 'Chattogram',
      height_cm: 160,
      weight_kg: 65.0,
    }
  });
  console.log('  Done: Patient Data');

  // --- Assign Patients to Dr. Arif (MBBS) ---
  console.log('Assigning consultations for Dr. Arif...');
  
  // Clean up old assignments so upserts could work gracefully, or just rely on the IDs.
  // Wait, wait, simple creates will fail on re-run because they don't check for existence (it's random UUID PK but duplicate records keep appending).
  // So we will delete previous clinical records for these patients to avoid clutter on re-running.
  await prisma.patient_diagnoses.deleteMany({ where: { patient_id: { in: [patient1.id, patient2.id] } } });
  await prisma.patient_vital_signs.deleteMany({ where: { patient_id: { in: [patient1.id, patient2.id] } } });
  await prisma.prescriptions.deleteMany({ where: { patient_id: { in: [patient1.id, patient2.id] } } });
  await prisma.specialist_referrals.deleteMany({ where: { patient_id: { in: [patient1.id, patient2.id] } } });

  // Patient 1 Consultation
  await prisma.patient_vital_signs.create({
    data: {
      patient_id: patient1.id,
      doctor_id: arif.id,
      systolic_bp: 145,
      diastolic_bp: 90,
      pulse_bpm: 85,
      temperature_c: 37.0,
      weight_kg: 82.5,
      is_abnormal: true,
      notes: 'Patient reports occasional headaches.'
    }
  });

  const p1Diagnosis = await prisma.patient_diagnoses.create({
    data: {
      patient_id: patient1.id,
      doctor_id: arif.id,
      icd10_code: 'I10',
      chief_complaint: 'Headache and dizziness for 3 days',
      history_of_present_illness: 'Patient has been experiencing throbbing headaches mostly in the morning.',
      preliminary_diagnosis: 'Primary hypertension',
      is_primary: true
    }
  });

  const p1Prescription = await prisma.prescriptions.create({
    data: {
      patient_id: patient1.id,
      doctor_id: arif.id,
      diagnosis_id: p1Diagnosis.id,
      notes: 'Advised low salt diet and regular exercise.',
    }
  });

  await prisma.prescription_medications.create({
    data: {
      prescription_id: p1Prescription.id,
      generic_name: 'Amlodipine',
      brand_name: 'Camlos',
      dosage: '5mg',
      frequency: '1+0+0',
      duration_days: 30,
      route: 'Oral'
    }
  });

  // Patient 1 Specialist Referral
  await prisma.specialist_referrals.create({
    data: {
      patient_id: patient1.id,
      referring_doctor_id: arif.id,
      specialist_id: nusrat.id,
      specialty_code: 'CARD',
      referral_reason: 'Uncontrolled hypertension with recent episodes of dizziness.',
      clinical_summary: 'Patient has a history of high blood pressure, recently reading 145/90. Prescribed Amlodipine 5mg. Needs cardiac evaluation.',
      is_emergency: false,
      status: 'PENDING'
    }
  });

  // Patient 2 Consultation
  await prisma.patient_vital_signs.create({
    data: {
      patient_id: patient2.id,
      doctor_id: arif.id,
      systolic_bp: 120,
      diastolic_bp: 80,
      pulse_bpm: 72,
      temperature_c: 36.8,
      weight_kg: 65.0,
      is_abnormal: false,
    }
  });

  const p2Diagnosis = await prisma.patient_diagnoses.create({
    data: {
      patient_id: patient2.id,
      doctor_id: arif.id,
      icd10_code: 'E11',
      chief_complaint: 'Generalized weakness and frequent urination',
      history_of_present_illness: 'Symptoms noticed over the past month. Strong family history of diabetes.',
      preliminary_diagnosis: 'Type 2 Diabetes Mellitus',
      is_primary: true
    }
  });

  const p2Prescription = await prisma.prescriptions.create({
    data: {
      patient_id: patient2.id,
      doctor_id: arif.id,
      diagnosis_id: p2Diagnosis.id,
      notes: 'Monitor blood sugar levels. Immediate follow up next week.',
    }
  });

  await prisma.prescription_medications.create({
    data: {
      prescription_id: p2Prescription.id,
      generic_name: 'Metformin',
      brand_name: 'Comet',
      dosage: '500mg',
      frequency: '1+0+1',
      duration_days: 15,
      route: 'Oral',
      special_instructions: 'Take after meals'
    }
  });
  console.log('  Done: Consultations assigned');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
