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

  // --- Dr. Farzana (MBBS) ---
  console.log('Creating dr.farzana@hhdms.com (MBBS)...');
  const farzana = await prisma.user.upsert({
    where: { email: 'dr.farzana@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000004', firstNameEn: 'Farzana', lastNameEn: 'Begum', firstNameBn: 'ফারজানা', status: 'ACTIVE' },
    create: { email: 'dr.farzana@hhdms.com', passwordHash, phoneNumber: '+8801700000004', firstNameEn: 'Farzana', lastNameEn: 'Begum', firstNameBn: 'ফারজানা', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, is_available=$8`,
    farzana.id, 'BMDC-2024-002', 'BMDC-REG-2024-002', 'General Medicine & Diabetes', 'MBBS (Sir Salimullah Medical College), BCS Health', 6, 750.0, true
  );
  console.log('  Done: dr.farzana (MBBS)');

  // --- Dr. Sajid (MBBS) ---
  console.log('Creating dr.sajid@hhdms.com (MBBS)...');
  const sajid = await prisma.user.upsert({
    where: { email: 'dr.sajid@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000005', firstNameEn: 'Sajid', lastNameEn: 'Islam', firstNameBn: 'সাজিদ', status: 'ACTIVE' },
    create: { email: 'dr.sajid@hhdms.com', passwordHash, phoneNumber: '+8801700000005', firstNameEn: 'Sajid', lastNameEn: 'Islam', firstNameBn: 'সাজিদ', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, is_available=$8`,
    sajid.id, 'BMDC-2024-003', 'BMDC-REG-2024-003', 'Pediatrics & Adolescent Health', 'MBBS (Dhaka Medical College), DCH (Pediatrics)', 5, 700.0, true
  );
  console.log('  Done: dr.sajid (MBBS)');

  // --- Dr. Nasrin (MBBS) ---
  console.log('Creating dr.nasrin@hhdms.com (MBBS)...');
  const nasrin = await prisma.user.upsert({
    where: { email: 'dr.nasrin@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000006', firstNameEn: 'Nasrin', lastNameEn: 'Akhter', firstNameBn: 'নাসরিন', status: 'ACTIVE' },
    create: { email: 'dr.nasrin@hhdms.com', passwordHash, phoneNumber: '+8801700000006', firstNameEn: 'Nasrin', lastNameEn: 'Akhter', firstNameBn: 'নাসরিন', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, is_available=$8`,
    nasrin.id, 'BMDC-2024-004', 'BMDC-REG-2024-004', 'Obstetrics & Gynecology', 'MBBS (Rajshahi Medical College), MCPS (OBGYN)', 9, 900.0, true
  );
  console.log('  Done: dr.nasrin (MBBS)');

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
  console.log('  dr.arif@hhdms.com / Password2026! (MBBS Doctor) — Assigned: Rahim, Fatema');
  console.log('  dr.farzana@hhdms.com / Password2026! (MBBS Doctor)');
  console.log('  dr.sajid@hhdms.com / Password2026! (MBBS Doctor) — Assigned: Kabir');
  console.log('  dr.nasrin@hhdms.com / Password2026! (MBBS Doctor) — Assigned: Shahnaz');
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
  const patient3 = await prisma.patients.upsert({
    where: { mrn: 'MRN-2024-0003' },
    update: {},
    create: {
      mrn: 'MRN-2024-0003',
      first_name_en: 'Kabir',
      last_name_en: 'Hossain',
      first_name_bn: 'কবির',
      last_name_bn: 'হোসেন',
      date_of_birth: new Date('1985-03-12'),
      sex: 'M',
      blood_group: 'A+',
      phone_number: '+8801800000003',
      district: 'Sylhet',
      height_cm: 170,
      weight_kg: 72.0,
    }
  });

  const patient4 = await prisma.patients.upsert({
    where: { mrn: 'MRN-2024-0004' },
    update: {},
    create: {
      mrn: 'MRN-2024-0004',
      first_name_en: 'Shahnaz',
      last_name_en: 'Parvin',
      first_name_bn: 'শাহনাজ',
      last_name_bn: 'পারভিন',
      date_of_birth: new Date('1990-11-05'),
      sex: 'F',
      blood_group: 'AB+',
      phone_number: '+8801900000004',
      district: 'Khulna',
      height_cm: 158,
      weight_kg: 58.0,
    }
  });
  console.log('  Done: Patient Data');

  // --- Assign Patients to Dr. Arif (MBBS) ---
  console.log('Assigning patients to Dr. Arif...');
  await prisma.doctor_patient_assignments.upsert({
    where: { doctor_id_patient_id: { doctor_id: arif.id, patient_id: patient1.id } },
    update: {},
    create: { doctor_id: arif.id, patient_id: patient1.id },
  });
  await prisma.doctor_patient_assignments.upsert({
    where: { doctor_id_patient_id: { doctor_id: arif.id, patient_id: patient2.id } },
    update: {},
    create: { doctor_id: arif.id, patient_id: patient2.id },
  });
  console.log('  Done: Patients assigned to Dr. Arif');

  // --- Assign Patients to Dr. Sajid (MBBS) ---
  console.log('Assigning patients to Dr. Sajid...');
  await prisma.doctor_patient_assignments.upsert({
    where: { doctor_id_patient_id: { doctor_id: sajid.id, patient_id: patient3.id } },
    update: {},
    create: { doctor_id: sajid.id, patient_id: patient3.id },
  });
  console.log('  Done: Patients assigned to Dr. Sajid');

  // --- Assign Patients to Dr. Nasrin (MBBS) ---
  console.log('Assigning patients to Dr. Nasrin...');
  await prisma.doctor_patient_assignments.upsert({
    where: { doctor_id_patient_id: { doctor_id: nasrin.id, patient_id: patient4.id } },
    update: {},
    create: { doctor_id: nasrin.id, patient_id: patient4.id },
  });
  console.log('  Done: Patients assigned to Dr. Nasrin');

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
