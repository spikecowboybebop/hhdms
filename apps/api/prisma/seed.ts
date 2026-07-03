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
  const caregiverRole = await prisma.role.upsert({
    where: { name: 'CAREGIVER' },
    update: {},
    create: { name: 'CAREGIVER', description: 'Caregiver' },
  });
  // MOBILE_USER role must have id=7 — the auth service hardcodes roleId: 7 for mobile signups
  await prisma.$executeRawUnsafe(
    `INSERT INTO roles (id, name, description) VALUES (7, 'MOBILE_USER', 'Mobile App User')
     ON CONFLICT (name) DO UPDATE SET description = 'Mobile App User'`
  );
  // SONOLOGIST role
  const sonoRole = await prisma.role.upsert({
    where: { name: 'SONOLOGIST' },
    update: {},
    create: { name: 'SONOLOGIST', description: 'Sonologist (USG Specialist)' },
  });
  console.log('Roles: MBBS_DOCTOR, NUTRITIONIST, SPECIALIST, CAREGIVER, MOBILE_USER, SONOLOGIST');

  // --- Caregiver (Shamima) ---
  console.log('Creating caregiver.shamima@hhdms.com (Caregiver)...');
  const shamima = await prisma.user.upsert({
    where: { email: 'caregiver.shamima@hhdms.com' },
    update: { passwordHash, roleId: caregiverRole.id, phoneNumber: '+8801700000007', firstNameEn: 'Shamima', lastNameEn: 'Akhtar', firstNameBn: 'শামীমা', status: 'ACTIVE' },
    create: { email: 'caregiver.shamima@hhdms.com', passwordHash, phoneNumber: '+8801700000007', firstNameEn: 'Shamima', lastNameEn: 'Akhtar', firstNameBn: 'শামীমা', roleId: caregiverRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO caregiver_profiles (user_id, gender, experience_years, specializations, verification_status, training_certs, rating, phone_number, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (user_id) DO UPDATE SET gender=$2, experience_years=$3, specializations=$4, verification_status=$5, training_certs=$6, rating=$7, phone_number=$8, is_available=$9`,
    shamima.id, 'Female', 5, 'Dementia Care, Post-Surgical Care, Bedridden Patient Care', 'VERIFIED', 'Home Care Assistant Certificate, First Aid Training', 4.5, '+8801700000007', true
  );
  console.log('  Done: shamima (Caregiver)');

  // --- Dr. Shahid (Sonologist) ---
  console.log('Creating dr.shahid@hhdms.com (Sonologist)...');
  const shahid = await prisma.user.upsert({
    where: { email: 'dr.shahid@hhdms.com' },
    update: { passwordHash, roleId: sonoRole.id, phoneNumber: '+8801700000039', firstNameEn: 'Shahid', lastNameEn: 'Alam', firstNameBn: 'শহীদ', status: 'ACTIVE' },
    create: { email: 'dr.shahid@hhdms.com', passwordHash, phoneNumber: '+8801700000039', firstNameEn: 'Shahid', lastNameEn: 'Alam', firstNameBn: 'শহীদ', roleId: sonoRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO sonologist_profiles (user_id, license_number, qualification, years_of_experience, consultation_fee, equipment_ids, usg_specializations, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, qualification=$3, years_of_experience=$4, consultation_fee=$5, equipment_ids=$6, usg_specializations=$7, is_available=$8`,
    shahid.id, 'SONO-2024-001', 'MBBS, DMRD (Ultrasound), FCPS (Radiology)', 7, 1200.0, 'USG-001 (Samsung RS85), USG-002 (GE Logiq P7)', 'Whole Abdomen, Obstetric, Pelvic, Renal, Thyroid, Musculoskeletal', true
  );
  console.log('  Done: dr.shahid (Sonologist)');

  // --- Dr. Arif (MBBS) — Gulshan, Dhaka ---
  console.log('Creating dr.arif@hhdms.com (MBBS)...');
  const arif = await prisma.user.upsert({
    where: { email: 'dr.arif@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000001', firstNameEn: 'Arif', lastNameEn: 'Hossain', firstNameBn: 'আরিফ', status: 'ACTIVE' },
    create: { email: 'dr.arif@hhdms.com', passwordHash, phoneNumber: '+8801700000001', firstNameEn: 'Arif', lastNameEn: 'Hossain', firstNameBn: 'আরিফ', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, district, thana, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, district=$8, thana=$9, is_available=$10`,
    arif.id, 'BMDC-2024-001', 'BMDC-REG-2024-001', 'Family Medicine', 'MBBS (Dhaka Medical College), MD (Internal Medicine)', 8, 800.0, 'Dhaka', 'Gulshan', true
  );
  console.log('  Done: dr.arif (MBBS) — Gulshan, Dhaka');

  // --- Dr. Farzana (MBBS) — Mirpur, Dhaka ---
  console.log('Creating dr.farzana@hhdms.com (MBBS)...');
  const farzana = await prisma.user.upsert({
    where: { email: 'dr.farzana@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000004', firstNameEn: 'Farzana', lastNameEn: 'Begum', firstNameBn: 'ফারজানা', status: 'ACTIVE' },
    create: { email: 'dr.farzana@hhdms.com', passwordHash, phoneNumber: '+8801700000004', firstNameEn: 'Farzana', lastNameEn: 'Begum', firstNameBn: 'ফারজানা', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, district, thana, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, district=$8, thana=$9, is_available=$10`,
    farzana.id, 'BMDC-2024-002', 'BMDC-REG-2024-002', 'General Medicine & Diabetes', 'MBBS (Sir Salimullah Medical College), BCS Health', 6, 750.0, 'Dhaka', 'Mirpur', true
  );
  console.log('  Done: dr.farzana (MBBS) — Mirpur, Dhaka');

  // --- Dr. Sajid (MBBS) — Sylhet Sadar ---
  console.log('Creating dr.sajid@hhdms.com (MBBS)...');
  const sajid = await prisma.user.upsert({
    where: { email: 'dr.sajid@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000005', firstNameEn: 'Sajid', lastNameEn: 'Islam', firstNameBn: 'সাজিদ', status: 'ACTIVE' },
    create: { email: 'dr.sajid@hhdms.com', passwordHash, phoneNumber: '+8801700000005', firstNameEn: 'Sajid', lastNameEn: 'Islam', firstNameBn: 'সাজিদ', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, district, thana, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, district=$8, thana=$9, is_available=$10`,
    sajid.id, 'BMDC-2024-003', 'BMDC-REG-2024-003', 'Pediatrics & Adolescent Health', 'MBBS (Dhaka Medical College), DCH (Pediatrics)', 5, 700.0, 'Sylhet', 'Sylhet Sadar', true
  );
  console.log('  Done: dr.sajid (MBBS) — Sylhet Sadar');

  // --- Dr. Nasrin (MBBS) — Khulna Sadar ---
  console.log('Creating dr.nasrin@hhdms.com (MBBS)...');
  const nasrin = await prisma.user.upsert({
    where: { email: 'dr.nasrin@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000006', firstNameEn: 'Nasrin', lastNameEn: 'Akhter', firstNameBn: 'নাসরিন', status: 'ACTIVE' },
    create: { email: 'dr.nasrin@hhdms.com', passwordHash, phoneNumber: '+8801700000006', firstNameEn: 'Nasrin', lastNameEn: 'Akhter', firstNameBn: 'নাসরিন', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, district, thana, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, district=$8, thana=$9, is_available=$10`,
    nasrin.id, 'BMDC-2024-004', 'BMDC-REG-2024-004', 'Obstetrics & Gynecology', 'MBBS (Rajshahi Medical College), MCPS (OBGYN)', 9, 900.0, 'Khulna', 'Khulna Sadar', true
  );
  console.log('  Done: dr.nasrin (MBBS) — Khulna Sadar');

  // --- Dr. Mehedi (MBBS) — Mirpur, Dhaka ---
  console.log('Creating dr.mehedi@hhdms.com (MBBS)...');
  const mehedi = await prisma.user.upsert({
    where: { email: 'dr.mehedi@hhdms.com' },
    update: { passwordHash, roleId: mbbsRole.id, phoneNumber: '+8801700000035', firstNameEn: 'Mehedi', lastNameEn: 'Hasan', firstNameBn: 'মেহেদী', status: 'ACTIVE' },
    create: { email: 'dr.mehedi@hhdms.com', passwordHash, phoneNumber: '+8801700000035', firstNameEn: 'Mehedi', lastNameEn: 'Hasan', firstNameBn: 'মেহেদী', roleId: mbbsRole.id, status: 'ACTIVE' },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, district, thana, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, district=$8, thana=$9, is_available=$10`,
    mehedi.id, 'BMDC-2024-005', 'BMDC-REG-2024-005', 'General Medicine & Cardiology', 'MBBS (Dhaka Medical College), BCS Health', 4, 650.0, 'Dhaka', 'Mirpur', true
  );
  console.log('  Done: dr.mehedi (MBBS) — Mirpur, Dhaka');

  // --- Additional MBBS Doctors (Batch — 25 across all divisions) ---
  console.log('\nCreating additional MBBS doctors...');

  interface DoctorSeed {
    email: string; phone: string; firstNameEn: string; lastNameEn: string; firstNameBn: string;
    license: string; bmdcReg: string; specialization: string; qualification: string;
    exp: number; fee: number; district: string; thana: string;
  }

  const additionalDoctors: DoctorSeed[] = [
    // Dhaka Division (5)
    { email: 'dr.abdur.rahman@hhdms.com', phone: '+8801700000010', firstNameEn: 'Abdur', lastNameEn: 'Rahman', firstNameBn: 'আব্দুর', license: 'BMDC-2024-006', bmdcReg: 'BMDC-REG-2024-006', specialization: 'Cardiology', qualification: 'MBBS (DMC), MD (Cardiology)', exp: 12, fee: 1200, district: 'Dhaka', thana: 'Uttara' },
    { email: 'dr.tahmina.khatun@hhdms.com', phone: '+8801700000011', firstNameEn: 'Tahmina', lastNameEn: 'Khatun', firstNameBn: 'তাহমিনা', license: 'BMDC-2024-007', bmdcReg: 'BMDC-REG-2024-007', specialization: 'Gynecology & Obstetrics', qualification: 'MBBS (SSMC), MCPS (OBGYN)', exp: 8, fee: 900, district: 'Dhaka', thana: 'Mohammadpur' },
    { email: 'dr.zahidul.islam@hhdms.com', phone: '+8801700000012', firstNameEn: 'Zahidul', lastNameEn: 'Islam', firstNameBn: 'জাহিদুল', license: 'BMDC-2024-008', bmdcReg: 'BMDC-REG-2024-008', specialization: 'Internal Medicine', qualification: 'MBBS (DMC), MD (Internal Medicine)', exp: 15, fee: 1500, district: 'Dhaka', thana: 'Dhanmondi' },
    { email: 'dr.nargis.akhter@hhdms.com', phone: '+8801700000013', firstNameEn: 'Nargis', lastNameEn: 'Akhter', firstNameBn: 'নার্গিস', license: 'BMDC-2024-009', bmdcReg: 'BMDC-REG-2024-009', specialization: 'Pediatrics', qualification: 'MBBS (DMC), DCH', exp: 7, fee: 850, district: 'Dhaka', thana: 'Banani' },
    { email: 'dr.shafiqur.rahman@hhdms.com', phone: '+8801700000014', firstNameEn: 'Shafiqur', lastNameEn: 'Rahman', firstNameBn: 'শফিকুর', license: 'BMDC-2024-010', bmdcReg: 'BMDC-REG-2024-010', specialization: 'Orthopedics', qualification: 'MBBS (RMC), MS (Ortho)', exp: 10, fee: 1000, district: 'Gazipur', thana: 'Gazipur Sadar' },
    // Chattogram Division (4)
    { email: 'dr.jasmin.sultana@hhdms.com', phone: '+8801700000015', firstNameEn: 'Jasmin', lastNameEn: 'Sultana', firstNameBn: 'জেসমিন', license: 'BMDC-2024-011', bmdcReg: 'BMDC-REG-2024-011', specialization: 'Dermatology', qualification: 'MBBS (CMC), DDV', exp: 11, fee: 1100, district: 'Chattogram', thana: 'Panchlaish' },
    { email: 'dr.ibrahim.khalil@hhdms.com', phone: '+8801700000016', firstNameEn: 'Ibrahim', lastNameEn: 'Khalil', firstNameBn: 'ইব্রাহিম', license: 'BMDC-2024-012', bmdcReg: 'BMDC-REG-2024-012', specialization: 'General Medicine', qualification: 'MBBS (Cox MC), BCS Health', exp: 5, fee: 600, district: "Cox's Bazar", thana: "Cox's Bazar Sadar" },
    { email: 'dr.shahida.parvin@hhdms.com', phone: '+8801700000017', firstNameEn: 'Shahida', lastNameEn: 'Parvin', firstNameBn: 'শাহিদা', license: 'BMDC-2024-013', bmdcReg: 'BMDC-REG-2024-013', specialization: 'Gynecology & Obstetrics', qualification: 'MBBS (Comilla MC), DGO', exp: 8, fee: 750, district: 'Comilla', thana: 'Comilla Sadar' },
    { email: 'dr.rafiqul.islam@hhdms.com', phone: '+8801700000018', firstNameEn: 'Rafiqul', lastNameEn: 'Islam', firstNameBn: 'রফিকুল', license: 'BMDC-2024-014', bmdcReg: 'BMDC-REG-2024-014', specialization: 'Pediatrics', qualification: 'MBBS (DMC), FCPS (Pediatrics)', exp: 6, fee: 650, district: 'Noakhali', thana: 'Maijdee' },
    // Sylhet Division (2)
    { email: 'dr.nazma.begum@hhdms.com', phone: '+8801700000019', firstNameEn: 'Nazma', lastNameEn: 'Begum', firstNameBn: 'নাজমা', license: 'BMDC-2024-015', bmdcReg: 'BMDC-REG-2024-015', specialization: 'Internal Medicine', qualification: 'MBBS (Sylhet MC), MD (Medicine)', exp: 7, fee: 600, district: 'Moulvibazar', thana: 'Moulvibazar Sadar' },
    { email: 'dr.delwar.hossain@hhdms.com', phone: '+8801700000020', firstNameEn: 'Delwar', lastNameEn: 'Hossain', firstNameBn: 'দেলোয়ার', license: 'BMDC-2024-016', bmdcReg: 'BMDC-REG-2024-016', specialization: 'General Practice', qualification: 'MBBS (DMC), MPH', exp: 4, fee: 500, district: 'Habiganj', thana: 'Habiganj Sadar' },
    // Khulna Division (2)
    { email: 'dr.shakil.ahmed@hhdms.com', phone: '+8801700000021', firstNameEn: 'Shakil', lastNameEn: 'Ahmed', firstNameBn: 'শাকিল', license: 'BMDC-2024-017', bmdcReg: 'BMDC-REG-2024-017', specialization: 'Cardiology', qualification: 'MBBS (KMC), MD (Cardiology)', exp: 9, fee: 800, district: 'Jessore', thana: 'Jessore Sadar' },
    { email: 'dr.rehana.akhter@hhdms.com', phone: '+8801700000022', firstNameEn: 'Rehana', lastNameEn: 'Akhter', firstNameBn: 'রেহানা', license: 'BMDC-2024-018', bmdcReg: 'BMDC-REG-2024-018', specialization: 'Gynecology & Obstetrics', qualification: 'MBBS (RMC), MCPS (OBGYN)', exp: 10, fee: 700, district: 'Kushtia', thana: 'Kushtia Sadar' },
    // Rajshahi Division (3)
    { email: 'dr.mamunur.rashid@hhdms.com', phone: '+8801700000023', firstNameEn: 'Mamunur', lastNameEn: 'Rashid', firstNameBn: 'মামুনুর', license: 'BMDC-2024-019', bmdcReg: 'BMDC-REG-2024-019', specialization: 'Neurology', qualification: 'MBBS (RMC), MD (Neurology)', exp: 14, fee: 1300, district: 'Rajshahi', thana: 'Boalia' },
    { email: 'dr.shirin.parvin@hhdms.com', phone: '+8801700000024', firstNameEn: 'Shirin', lastNameEn: 'Parvin', firstNameBn: 'শিরিন', license: 'BMDC-2024-020', bmdcReg: 'BMDC-REG-2024-020', specialization: 'Pediatrics', qualification: 'MBBS (RMC), DCH', exp: 8, fee: 750, district: 'Bogura', thana: 'Bogura Sadar' },
    { email: 'dr.jahangir.alam@hhdms.com', phone: '+8801700000025', firstNameEn: 'Jahangir', lastNameEn: 'Alam', firstNameBn: 'জাহাঙ্গীর', license: 'BMDC-2024-021', bmdcReg: 'BMDC-REG-2024-021', specialization: 'General Medicine', qualification: 'MBBS (DMC), BCS Health', exp: 6, fee: 600, district: 'Pabna', thana: 'Pabna Sadar' },
    // Rangpur Division (2)
    { email: 'dr.ashraf.uddin@hhdms.com', phone: '+8801700000026', firstNameEn: 'Ashraf', lastNameEn: 'Uddin', firstNameBn: 'আশরাফ', license: 'BMDC-2024-022', bmdcReg: 'BMDC-REG-2024-022', specialization: 'Orthopedics', qualification: 'MBBS (Rangpur MC), MS (Ortho)', exp: 11, fee: 900, district: 'Rangpur', thana: 'Rangpur Sadar' },
    { email: 'dr.mahbuba.khanam@hhdms.com', phone: '+8801700000027', firstNameEn: 'Mahbuba', lastNameEn: 'Khanam', firstNameBn: 'মাহবুবা', license: 'BMDC-2024-023', bmdcReg: 'BMDC-REG-2024-023', specialization: 'Internal Medicine', qualification: 'MBBS (DMC), FCPS (Medicine)', exp: 7, fee: 650, district: 'Dinajpur', thana: 'Dinajpur Sadar' },
    // Barishal Division (2)
    { email: 'dr.farhad.hossain@hhdms.com', phone: '+8801700000028', firstNameEn: 'Farhad', lastNameEn: 'Hossain', firstNameBn: 'ফরহাদ', license: 'BMDC-2024-024', bmdcReg: 'BMDC-REG-2024-024', specialization: 'Psychiatry', qualification: 'MBBS (DMC), MD (Psychiatry)', exp: 9, fee: 850, district: 'Barishal', thana: 'Barishal Sadar' },
    { email: 'dr.selina.begum@hhdms.com', phone: '+8801700000029', firstNameEn: 'Selina', lastNameEn: 'Begum', firstNameBn: 'সেলিনা', license: 'BMDC-2024-025', bmdcReg: 'BMDC-REG-2024-025', specialization: 'General Practice', qualification: 'MBBS (Sher-e-Bangla MC), BCS Health', exp: 5, fee: 500, district: 'Patuakhali', thana: 'Patuakhali Sadar' },
    // Mymensingh Division (3)
    { email: 'dr.mizanur.rahman@hhdms.com', phone: '+8801700000030', firstNameEn: 'Mizanur', lastNameEn: 'Rahman', firstNameBn: 'মিজানুর', license: 'BMDC-2024-026', bmdcReg: 'BMDC-REG-2024-026', specialization: 'ENT', qualification: 'MBBS (Mymensingh MC), DLO', exp: 10, fee: 800, district: 'Mymensingh', thana: 'Mymensingh Sadar' },
    { email: 'dr.hosne.ara@hhdms.com', phone: '+8801700000031', firstNameEn: 'Hosne', lastNameEn: 'Ara', firstNameBn: 'হোসনে', license: 'BMDC-2024-027', bmdcReg: 'BMDC-REG-2024-027', specialization: 'Ophthalmology', qualification: 'MBBS (DMC), DO', exp: 8, fee: 700, district: 'Jamalpur', thana: 'Jamalpur Sadar' },
    { email: 'dr.anwar.hossain@hhdms.com', phone: '+8801700000032', firstNameEn: 'Anwar', lastNameEn: 'Hossain', firstNameBn: 'আনোয়ার', license: 'BMDC-2024-028', bmdcReg: 'BMDC-REG-2024-028', specialization: 'General Medicine', qualification: 'MBBS (DMC), BCS Health', exp: 6, fee: 550, district: 'Netrokona', thana: 'Netrokona Sadar' },
    // Extra — Dhaka Division (2 more for density)
    { email: 'dr.shamsul.arefin@hhdms.com', phone: '+8801700000033', firstNameEn: 'Shamsul', lastNameEn: 'Arefin', firstNameBn: 'সামসুল', license: 'BMDC-2024-029', bmdcReg: 'BMDC-REG-2024-029', specialization: 'Nephrology', qualification: 'MBBS (DMC), MD (Nephrology)', exp: 13, fee: 1400, district: 'Dhaka', thana: 'Mirpur' },
    { email: 'dr.nahid.sultana@hhdms.com', phone: '+8801700000034', firstNameEn: 'Nahid', lastNameEn: 'Sultana', firstNameBn: 'নাহিদ', license: 'BMDC-2024-030', bmdcReg: 'BMDC-REG-2024-030', specialization: 'Rheumatology', qualification: 'MBBS (SSMC), MD (Rheumatology)', exp: 9, fee: 950, district: 'Dhaka', thana: 'Gulshan' },
  ];

  const INSERT_MBBS = `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, district, thana, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id) DO UPDATE SET license_number=$2, bmdc_registration=$3, specialization=$4, qualification=$5, years_of_experience=$6, consultation_fee=$7, district=$8, thana=$9, is_available=$10`;

  const createdDoctors: { id: string; email: string }[] = [];
  for (const d of additionalDoctors) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: { passwordHash, roleId: mbbsRole.id, phoneNumber: d.phone, firstNameEn: d.firstNameEn, lastNameEn: d.lastNameEn, firstNameBn: d.firstNameBn, status: 'ACTIVE' },
      create: { email: d.email, passwordHash, phoneNumber: d.phone, firstNameEn: d.firstNameEn, lastNameEn: d.lastNameEn, firstNameBn: d.firstNameBn, roleId: mbbsRole.id, status: 'ACTIVE' },
    });
    await prisma.$executeRawUnsafe(INSERT_MBBS, user.id, d.license, d.bmdcReg, d.specialization, d.qualification, d.exp, d.fee, d.district, d.thana, true);
    createdDoctors.push({ id: user.id, email: d.email });
    console.log(`  ${d.email} — ${d.specialization}, ${d.thana}/${d.district}`);
  }
  console.log(`  Done: ${additionalDoctors.length} additional MBBS doctors`);

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

  // --- Provider Schedules ---
  console.log('Seeding provider schedules...');

  const schedulePatterns: ((providerId: string) => { providerId: string; day: number; start: string; end: string }[])[] = [
    // A: Sun-Thu 9-5
    (pid) => Array.from({ length: 5 }, (_, i) => ({ providerId: pid, day: i, start: '09:00', end: '17:00' })),
    // B: Sun-Thu 10-6
    (pid) => Array.from({ length: 5 }, (_, i) => ({ providerId: pid, day: i, start: '10:00', end: '18:00' })),
    // C: Sun-Thu 8-3
    (pid) => Array.from({ length: 5 }, (_, i) => ({ providerId: pid, day: i, start: '08:00', end: '15:00' })),
    // D: Sun-Wed 9-5, Thu 9-1
    (pid) => [
      ...Array.from({ length: 4 }, (_, i) => ({ providerId: pid, day: i, start: '09:00', end: '17:00' })),
      { providerId: pid, day: 4, start: '09:00', end: '13:00' },
    ],
    // E: Sun-Wed 10-6, Thu 10-2
    (pid) => [
      ...Array.from({ length: 4 }, (_, i) => ({ providerId: pid, day: i, start: '10:00', end: '18:00' })),
      { providerId: pid, day: 4, start: '10:00', end: '14:00' },
    ],
  ];

  const scheduleData: { providerId: string; day: number; start: string; end: string }[] = [
    // Dr. Arif — Pattern A
    ...schedulePatterns[0](arif.id),
    // Dr. Farzana — Pattern E
    ...schedulePatterns[4](farzana.id),
    // Dr. Sajid — Pattern C
    ...schedulePatterns[2](sajid.id),
    // Dr. Nasrin — Pattern D
    ...schedulePatterns[3](nasrin.id),
    // Dr. Mehedi — Pattern B
    ...schedulePatterns[1](mehedi.id),
    // Additional doctors — rotate through patterns
    ...createdDoctors.flatMap((doc, i) => schedulePatterns[i % schedulePatterns.length](doc.id)),
  ];
  for (const s of scheduleData) {
    await prisma.provider_schedules.upsert({
      where: {
        provider_id_day_of_week_start_time: {
          provider_id: s.providerId,
          day_of_week: s.day,
          start_time: s.start,
        },
      },
      update: { end_time: s.end },
      create: {
        provider_id: s.providerId,
        day_of_week: s.day,
        start_time: s.start,
        end_time: s.end,
        is_available: true,
      },
    });
  }
  console.log(`  Done: ${scheduleData.length} schedule entries`);

  // --- Verify ---
  const count = await prisma.user.count();
  const mbbsCount = await prisma.mbbs_doctor_profiles.count();
  const scheduleCount = await prisma.provider_schedules.count();
  console.log(`\nSeed complete! Total users: ${count}`);
  console.log(`  MBBS Doctors: ${mbbsCount}`);
  console.log(`  Schedule entries: ${scheduleCount}`);
  console.log('  dr.arif@hhdms.com / Password2026! (MBBS Doctor, Gulshan/Dhaka) — Assigned: Rahim, Fatema');
  console.log('  dr.farzana@hhdms.com / Password2026! (MBBS Doctor, Mirpur/Dhaka)');
  console.log('  dr.sajid@hhdms.com / Password2026! (MBBS Doctor, Sylhet Sadar/Sylhet) — Assigned: Kabir');
  console.log('  dr.nasrin@hhdms.com / Password2026! (MBBS Doctor, Khulna Sadar/Khulna) — Assigned: Shahnaz');
  console.log('  dr.mehedi@hhdms.com / Password2026! (MBBS Doctor, Mirpur/Dhaka)');
  console.log(`  + ${additionalDoctors.length} additional MBBS doctors across all divisions`);
  console.log('  nutritionist.tanvir@hhdms.com / Password2026! (Nutritionist)');
  console.log('  dr.nusrat@hhdms.com / Password2026! (Specialist)');
  console.log('  caregiver.shamima@hhdms.com / Password2026! (Caregiver) — Assigned: Rahim, Fatema');
  console.log('  dr.shahid@hhdms.com / Password2026! (Sonologist)');

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

  // --- Seed Diagnostic Test Catalog ---
  console.log('Seeding Diagnostic Test Catalog...');
  const testCatalogData = [
    // Hematology
    { test_name: 'Complete Blood Count', test_code: 'CBC', category: 'Hematology', description: 'Hb, WBC, RBC, Platelet count with differential', normal_range: 'Hb: M 13-17, F 12-16 g/dL', unit: '-', turnaround_hours: 4 },
    { test_name: 'Hemoglobin', test_code: 'HB', category: 'Hematology', description: 'Hemoglobin level', normal_range: 'M: 13-17, F: 12-16 g/dL', unit: 'g/dL', turnaround_hours: 2 },
    { test_name: 'ESR', test_code: 'ESR', category: 'Hematology', description: 'Erythrocyte Sedimentation Rate', normal_range: 'M: 0-15, F: 0-20 mm/hr', unit: 'mm/hr', turnaround_hours: 2 },
    { test_name: 'Peripheral Blood Film', test_code: 'PBF', category: 'Hematology', description: 'Peripheral blood smear examination', normal_range: 'Normocytic normochromic cells', unit: '-', turnaround_hours: 6 },
    { test_name: 'Blood Group & Rh Type', test_code: 'BGRP', category: 'Hematology', description: 'ABO and RhD blood grouping', normal_range: 'A/B/AB/O +ve/-ve', unit: '-', turnaround_hours: 2 },
    { test_name: 'Platelet Count', test_code: 'PLT', category: 'Hematology', description: 'Platelet count', normal_range: '150-450 x10^9/L', unit: 'x10^9/L', turnaround_hours: 2 },
    { test_name: 'PT / INR', test_code: 'PTINR', category: 'Hematology', description: 'Prothrombin Time / INR', normal_range: 'INR: 0.8-1.2', unit: '-', turnaround_hours: 4 },
    { test_name: 'APTT', test_code: 'APTT', category: 'Hematology', description: 'Activated Partial Thromboplastin Time', normal_range: '25-35 sec', unit: 'sec', turnaround_hours: 4 },
    { test_name: 'HbA1c', test_code: 'HBA1C', category: 'Hematology', description: 'Glycated hemoglobin for diabetes monitoring', normal_range: '<5.7% normal, 5.7-6.4% prediabetes', unit: '%', turnaround_hours: 6 },
    // Biochemistry
    { test_name: 'Fasting Blood Glucose', test_code: 'FBG', category: 'Biochemistry', description: 'Fasting blood sugar', normal_range: '70-110 mg/dL', unit: 'mg/dL', turnaround_hours: 2 },
    { test_name: 'Blood Glucose Random', test_code: 'RBG', category: 'Biochemistry', description: 'Random blood sugar', normal_range: '<140 mg/dL', unit: 'mg/dL', turnaround_hours: 2 },
    { test_name: 'Serum Creatinine', test_code: 'CREAT', category: 'Biochemistry', description: 'Kidney function test', normal_range: '0.6-1.2 mg/dL', unit: 'mg/dL', turnaround_hours: 4 },
    { test_name: 'Blood Urea Nitrogen', test_code: 'BUN', category: 'Biochemistry', description: 'Blood urea nitrogen', normal_range: '7-20 mg/dL', unit: 'mg/dL', turnaround_hours: 4 },
    { test_name: 'Serum Uric Acid', test_code: 'URIC', category: 'Biochemistry', description: 'Uric acid level', normal_range: 'M: 3.4-7.0, F: 2.4-6.0 mg/dL', unit: 'mg/dL', turnaround_hours: 4 },
    { test_name: 'SGPT / ALT', test_code: 'SGPT', category: 'Biochemistry', description: 'Alanine Aminotransferase - liver enzyme', normal_range: '10-40 U/L', unit: 'U/L', turnaround_hours: 4 },
    { test_name: 'SGOT / AST', test_code: 'SGOT', category: 'Biochemistry', description: 'Aspartate Aminotransferase - liver enzyme', normal_range: '10-40 U/L', unit: 'U/L', turnaround_hours: 4 },
    { test_name: 'Alkaline Phosphatase', test_code: 'ALP', category: 'Biochemistry', description: 'ALP - liver/bone enzyme', normal_range: '44-147 U/L', unit: 'U/L', turnaround_hours: 4 },
    { test_name: 'Serum Bilirubin Total', test_code: 'BILIT', category: 'Biochemistry', description: 'Total bilirubin', normal_range: '0.3-1.2 mg/dL', unit: 'mg/dL', turnaround_hours: 4 },
    { test_name: 'Serum Bilirubin Direct', test_code: 'BILID', category: 'Biochemistry', description: 'Direct bilirubin', normal_range: '0.0-0.3 mg/dL', unit: 'mg/dL', turnaround_hours: 4 },
    { test_name: 'Total Protein', test_code: 'TPRO', category: 'Biochemistry', description: 'Total serum protein', normal_range: '6.0-8.0 g/dL', unit: 'g/dL', turnaround_hours: 4 },
    { test_name: 'Serum Albumin', test_code: 'ALB', category: 'Biochemistry', description: 'Serum albumin level', normal_range: '3.5-5.0 g/dL', unit: 'g/dL', turnaround_hours: 4 },
    // Lipid Profile
    { test_name: 'Total Cholesterol', test_code: 'CHOL', category: 'Lipid Profile', description: 'Total cholesterol', normal_range: '<200 mg/dL desirable', unit: 'mg/dL', turnaround_hours: 6 },
    { test_name: 'Triglycerides', test_code: 'TG', category: 'Lipid Profile', description: 'Serum triglycerides', normal_range: '<150 mg/dL', unit: 'mg/dL', turnaround_hours: 6 },
    { test_name: 'HDL Cholesterol', test_code: 'HDL', category: 'Lipid Profile', description: 'High-density lipoprotein', normal_range: 'M: >40, F: >50 mg/dL', unit: 'mg/dL', turnaround_hours: 6 },
    { test_name: 'LDL Cholesterol', test_code: 'LDL', category: 'Lipid Profile', description: 'Low-density lipoprotein', normal_range: '<100 mg/dL optimal', unit: 'mg/dL', turnaround_hours: 6 },
    { test_name: 'VLDL', test_code: 'VLDL', category: 'Lipid Profile', description: 'Very low-density lipoprotein', normal_range: '5-40 mg/dL', unit: 'mg/dL', turnaround_hours: 6 },
    // Electrolytes
    { test_name: 'Serum Sodium', test_code: 'NA', category: 'Electrolytes', description: 'Serum sodium level', normal_range: '136-145 mEq/L', unit: 'mEq/L', turnaround_hours: 4 },
    { test_name: 'Serum Potassium', test_code: 'K', category: 'Electrolytes', description: 'Serum potassium level', normal_range: '3.5-5.1 mEq/L', unit: 'mEq/L', turnaround_hours: 4 },
    { test_name: 'Serum Chloride', test_code: 'CL', category: 'Electrolytes', description: 'Serum chloride level', normal_range: '98-107 mEq/L', unit: 'mEq/L', turnaround_hours: 4 },
    // Microbiology & Serology
    { test_name: 'Urine R/M/E', test_code: 'URINE', category: 'Microbiology', description: 'Urine routine, microscopy & examination', normal_range: 'Color: pale yellow, pH: 4.5-8.0', unit: '-', turnaround_hours: 4 },
    { test_name: 'Urine Culture & Sensitivity', test_code: 'UCS', category: 'Microbiology', description: 'Urine C/S with organism identification', normal_range: 'No significant growth', unit: '-', turnaround_hours: 48 },
    { test_name: 'Widal Test', test_code: 'WIDAL', category: 'Microbiology', description: 'Typhoid serology', normal_range: 'TO <1:80, TH <1:160', unit: 'titer', turnaround_hours: 24 },
    { test_name: 'Dengue NS1 Antigen', test_code: 'DENNS1', category: 'Microbiology', description: 'Dengue NS1 antigen detection', normal_range: 'Negative', unit: '-', turnaround_hours: 6 },
    { test_name: 'Dengue IgM/IgG', test_code: 'DENIG', category: 'Microbiology', description: 'Dengue antibody serology', normal_range: 'Negative', unit: '-', turnaround_hours: 12 },
    { test_name: 'Malaria Antigen (MP)', test_code: 'MP', category: 'Microbiology', description: 'Malaria parasite antigen test', normal_range: 'Negative', unit: '-', turnaround_hours: 4 },
    { test_name: 'HBsAg', test_code: 'HBSAG', category: 'Serology', description: 'Hepatitis B surface antigen', normal_range: 'Non-reactive', unit: '-', turnaround_hours: 6 },
    { test_name: 'Anti-HCV', test_code: 'HCV', category: 'Serology', description: 'Hepatitis C antibody', normal_range: 'Non-reactive', unit: '-', turnaround_hours: 6 },
    { test_name: 'Anti-HIV I/II', test_code: 'HIV', category: 'Serology', description: 'HIV antibody screening', normal_range: 'Non-reactive', unit: '-', turnaround_hours: 12 },
    { test_name: 'VDRL / RPR', test_code: 'VDRL', category: 'Serology', description: 'Syphilis screening', normal_range: 'Non-reactive', unit: '-', turnaround_hours: 6 },
    { test_name: 'ASO Titre', test_code: 'ASO', category: 'Serology', description: 'Anti-streptolysin O titre', normal_range: '<200 IU/mL', unit: 'IU/mL', turnaround_hours: 12 },
    { test_name: 'CRP', test_code: 'CRP', category: 'Serology', description: 'C-Reactive Protein', normal_range: '<6 mg/L', unit: 'mg/L', turnaround_hours: 4 },
    { test_name: 'Rheumatoid Factor', test_code: 'RF', category: 'Serology', description: 'Rheumatoid factor', normal_range: '<14 IU/mL', unit: 'IU/mL', turnaround_hours: 12 },
    // Thyroid
    { test_name: 'TSH', test_code: 'TSH', category: 'Thyroid', description: 'Thyroid Stimulating Hormone', normal_range: '0.4-4.0 mIU/L', unit: 'mIU/L', turnaround_hours: 8 },
    { test_name: 'Free T3', test_code: 'FT3', category: 'Thyroid', description: 'Free Triiodothyronine', normal_range: '2.3-4.2 pg/mL', unit: 'pg/mL', turnaround_hours: 8 },
    { test_name: 'Free T4', test_code: 'FT4', category: 'Thyroid', description: 'Free Thyroxine', normal_range: '0.8-1.8 ng/dL', unit: 'ng/dL', turnaround_hours: 8 },
    // Imaging
    { test_name: 'Chest X-Ray PA', test_code: 'CXRPA', category: 'Radiology', description: 'Chest X-ray posteroanterior view', normal_range: 'Normal lung fields', unit: '-', turnaround_hours: 4 },
    { test_name: 'Chest X-Ray Lateral', test_code: 'CXRLAT', category: 'Radiology', description: 'Chest X-ray lateral view', normal_range: 'Normal findings', unit: '-', turnaround_hours: 4 },
    { test_name: 'X-Ray Abdomen Erect', test_code: 'XRAYABDO', category: 'Radiology', description: 'Abdomen X-ray erect view', normal_range: 'Normal bowel gas pattern', unit: '-', turnaround_hours: 4 },
    { test_name: 'USG Whole Abdomen', test_code: 'USGABDO', category: 'Radiology', description: 'Ultrasonogram of whole abdomen', normal_range: 'Normal study', unit: '-', turnaround_hours: 12 },
    { test_name: 'USG Pelvis', test_code: 'USGPELV', category: 'Radiology', description: 'Pelvic ultrasound', normal_range: 'Normal study', unit: '-', turnaround_hours: 12 },
    { test_name: 'Echocardiogram', test_code: 'ECHO', category: 'Radiology', description: '2D Echo with Doppler', normal_range: 'Normal LV function, EF >55%', unit: '-', turnaround_hours: 24 },
    { test_name: 'ECG (12 Lead)', test_code: 'ECG', category: 'Radiology', description: '12-lead electrocardiogram', normal_range: 'Normal sinus rhythm', unit: '-', turnaround_hours: 2 },
    // Special
    { test_name: 'D-Dimer', test_code: 'DDIMER', category: 'Hematology', description: 'D-dimer for thrombosis assessment', normal_range: '<0.5 mg/L FEU', unit: 'mg/L', turnaround_hours: 6 },
    { test_name: 'Troponin I', test_code: 'TROPI', category: 'Biochemistry', description: 'Cardiac troponin I', normal_range: '<0.04 ng/mL', unit: 'ng/mL', turnaround_hours: 4 },
    { test_name: 'Blood Culture', test_code: 'BCULT', category: 'Microbiology', description: 'Blood culture with sensitivity', normal_range: 'No growth', unit: '-', turnaround_hours: 72 },
    { test_name: 'Sputum C/S', test_code: 'SPUTUM', category: 'Microbiology', description: 'Sputum culture and sensitivity', normal_range: 'Normal respiratory flora', unit: '-', turnaround_hours: 48 },
    { test_name: 'Stool R/E', test_code: 'STOOL', category: 'Microbiology', description: 'Stool routine examination', normal_range: 'No ova/cyst/parasite seen', unit: '-', turnaround_hours: 6 },
    { test_name: 'Vitamin D (25-OH)', test_code: 'VITD', category: 'Biochemistry', description: '25-hydroxy vitamin D level', normal_range: '30-100 ng/mL', unit: 'ng/mL', turnaround_hours: 24 },
    { test_name: 'Vitamin B12', test_code: 'VB12', category: 'Biochemistry', description: 'Vitamin B12 level', normal_range: '200-900 pg/mL', unit: 'pg/mL', turnaround_hours: 24 },
    { test_name: 'Serum Ferritin', test_code: 'FERRITIN', category: 'Hematology', description: 'Iron storage marker', normal_range: 'M: 30-300, F: 15-200 ng/mL', unit: 'ng/mL', turnaround_hours: 8 },
  ];

  for (const test of testCatalogData) {
    await prisma.diagnostic_test_catalog.upsert({
      where: { test_code: test.test_code },
      update: {},
      create: test,
    });
  }
  console.log(`  Done: ${testCatalogData.length} Diagnostic Tests`);

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
    create: { doctor_id: arif.id, patient_id: patient1.id, appointment_activity: 'done' },
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

  // --- Assign Patients to Caregiver Shamima ---
  console.log('Assigning patients to Shamima (Caregiver)...');
  await prisma.caregiver_patient_assignments.upsert({
    where: { caregiver_id_patient_id: { caregiver_id: shamima.id, patient_id: patient1.id } },
    update: { service_type: 'DAY_CARE', patient_type: 'ADULT' },
    create: { caregiver_id: shamima.id, patient_id: patient1.id, service_type: 'DAY_CARE', patient_type: 'ADULT' },
  });
  await prisma.caregiver_patient_assignments.upsert({
    where: { caregiver_id_patient_id: { caregiver_id: shamima.id, patient_id: patient2.id } },
    update: { service_type: 'NIGHT_CARE', patient_type: 'ADULT' },
    create: { caregiver_id: shamima.id, patient_id: patient2.id, service_type: 'NIGHT_CARE', patient_type: 'ADULT' },
  });
  console.log('  Done: Patients assigned to Shamima');

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

  // --- Seed Test Orders for Patient 1 ---
  console.log('Seeding test orders for Patient 1 (Rahim)...');
  const cbcTest = await prisma.diagnostic_test_catalog.findUnique({ where: { test_code: 'CBC' } });
  const fbgTest = await prisma.diagnostic_test_catalog.findUnique({ where: { test_code: 'FBG' } });
  const lipidTest = await prisma.diagnostic_test_catalog.findUnique({ where: { test_code: 'CHOL' } });
  const ecgTest = await prisma.diagnostic_test_catalog.findUnique({ where: { test_code: 'ECG' } });

  if (cbcTest) {
    await prisma.diagnostic_test_orders.create({
      data: { patient_id: patient1.id, doctor_id: arif.id, test_id: cbcTest.id, status: 'COMPLETED', clinical_notes: 'Routine check for hypertension patient' },
    });
  }
  if (fbgTest) {
    await prisma.diagnostic_test_orders.create({
      data: { patient_id: patient1.id, doctor_id: arif.id, test_id: fbgTest.id, status: 'ORDERED', clinical_notes: 'Fasting sample needed' },
    });
  }
  if (lipidTest) {
    await prisma.diagnostic_test_orders.create({
      data: { patient_id: patient1.id, doctor_id: arif.id, test_id: lipidTest.id, status: 'IN_PROGRESS', clinical_notes: 'Lipid profile fasting' },
    });
  }
  if (ecgTest) {
    await prisma.diagnostic_test_orders.create({
      data: { patient_id: patient1.id, doctor_id: arif.id, test_id: ecgTest.id, status: 'ORDERED', clinical_notes: 'Chest pain evaluation' },
    });
  }
  console.log('  Done: Test orders seeded');

  // ── Seed Sonologist USG Studies ────────────────────────────
  console.log('Seeding sonologist USG studies...');
  await prisma.sonologist_studies.deleteMany({ where: { sonologist_id: shahid.id } });
  await prisma.sonologist_reports.deleteMany({ where: { sonologist_id: shahid.id } });

  const p1Study = await prisma.sonologist_studies.create({
    data: {
      sonologist_id: shahid.id,
      patient_id: patient1.id,
      body_part: 'Whole Abdomen',
      findings: 'Liver: mildly enlarged, echogenic texture suggesting fatty infiltration. Gallbladder: normal. Kidneys: normal size and echotexture. No free fluid.',
      impression: 'Grade I fatty liver. Otherwise normal abdominal ultrasound.',
      is_abnormal: true,
    },
  });
  await prisma.sonologist_reports.create({
    data: {
      study_id: p1Study.id,
      sonologist_id: shahid.id,
      patient_id: patient1.id,
      findings: p1Study.findings ?? '',
      impression: p1Study.impression,
    },
  });

  await prisma.sonologist_studies.create({
    data: {
      sonologist_id: shahid.id,
      patient_id: patient2.id,
      body_part: 'Obstetric',
      findings: 'Single live intrauterine fetus. Fetal heart rate: 148 bpm. Amniotic fluid index: normal. Placenta: posterior, grade I.',
      impression: 'Normal obstetric ultrasound. Gestational age approximately 20 weeks.',
      is_abnormal: false,
    },
  });
  console.log('  Done: USG studies seeded');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
