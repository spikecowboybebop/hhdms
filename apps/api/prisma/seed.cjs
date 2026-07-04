// =============================================================
// HHDMS Seed Script — Demo Users for MBBS / Specialist / Nutritionist
// =============================================================
// Run:  node prisma/seed.cjs
// =============================================================

const path = require('path');

// 1) Load .env from apps/api/.env
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  // Dynamic import for ESM-only bcrypt module
  const bcryptModule = await import('bcrypt');
  const bcrypt = bcryptModule.default || bcryptModule;
  const { PrismaClient } = require('@prisma/client');

  const prisma = new PrismaClient();
  const SALT_ROUNDS = 12;
  const PASSWORD = 'Password2026!';

  console.log('🔐 Hashing password ...');
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  console.log('   Hash:', passwordHash.substring(0, 20) + '...');

  // -------------------------------------------------------
  // 2) Upsert roles (idempotent)
  // -------------------------------------------------------
  console.log('🛡️  Upserting roles ...');

  const mbbsRole = await prisma.role.upsert({
    where: { name: 'MBBS_DOCTOR' },
    update: {},
    create: { name: 'MBBS_DOCTOR', description: 'MBBS Doctor — first-call clinician' },
  });
  console.log('   MBBS_DOCTOR:', mbbsRole.id);

  const nutRole = await prisma.role.upsert({
    where: { name: 'NUTRITIONIST' },
    update: {},
    create: { name: 'NUTRITIONIST', description: 'Diet & nutrition planning specialist' },
  });
  console.log('   NUTRITIONIST:', nutRole.id);

  const specRole = await prisma.role.upsert({
    where: { name: 'SPECIALIST' },
    update: {},
    create: { name: 'SPECIALIST', description: 'Referred specialist consultant' },
  });
  console.log('   SPECIALIST:', specRole.id);

  // -------------------------------------------------------
  // 3) Upsert MBBS Doctor — dr.arif@hhdms.com
  // -------------------------------------------------------
  console.log('\n👤 Creating MBBS Doctor: dr.arif@hhdms.com ...');
  const arif = await prisma.user.upsert({
    where: { email: 'dr.arif@hhdms.com' },
    update: {
      passwordHash,
      roleId: mbbsRole.id,
      phoneNumber: '+8801700000001',
      firstNameEn: 'Arif',
      lastNameEn: 'Hossain',
      firstNameBn: 'আরিফ',
      status: 'ACTIVE',
    },
    create: {
      email: 'dr.arif@hhdms.com',
      passwordHash,
      phoneNumber: '+8801700000001',
      firstNameEn: 'Arif',
      lastNameEn: 'Hossain',
      firstNameBn: 'আরিফ',
      roleId: mbbsRole.id,
      status: 'ACTIVE',
    },
  });
  console.log('   User ID:', arif.id);

  await prisma.$executeRawUnsafe(
    `INSERT INTO mbbs_doctor_profiles (user_id, license_number, bmdc_registration, specialization, qualification, years_of_experience, consultation_fee, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       license_number = $2, bmdc_registration = $3, specialization = $4, qualification = $5,
       years_of_experience = $6, consultation_fee = $7, is_available = $8`,
    arif.id, 'BMDC-2024-001', 'BMDC-REG-2024-001', 'Family Medicine',
    'MBBS (Dhaka Medical College), MD (Internal Medicine)', 8, 800.0, true,
  );
  console.log('   ✅ mbbs_doctor_profiles created');

  // -------------------------------------------------------
  // 4) Upsert Nutritionist — nutritionist.tanvir@hhdms.com
  // -------------------------------------------------------
  console.log('\n👤 Creating Nutritionist: nutritionist.tanvir@hhdms.com ...');
  const tanvir = await prisma.user.upsert({
    where: { email: 'nutritionist.tanvir@hhdms.com' },
    update: {
      passwordHash,
      roleId: nutRole.id,
      phoneNumber: '+8801700000002',
      firstNameEn: 'Tanvir',
      lastNameEn: 'Ahmed',
      firstNameBn: 'তানভীর',
      status: 'ACTIVE',
    },
    create: {
      email: 'nutritionist.tanvir@hhdms.com',
      passwordHash,
      phoneNumber: '+8801700000002',
      firstNameEn: 'Tanvir',
      lastNameEn: 'Ahmed',
      firstNameBn: 'তানভীর',
      roleId: nutRole.id,
      status: 'ACTIVE',
    },
  });
  console.log('   User ID:', tanvir.id);

  await prisma.$executeRawUnsafe(
    `INSERT INTO nutritionist_profiles (id, user_id, created_at, updated_at) VALUES (gen_random_uuid(), $1, NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING`,
    tanvir.id,
  );
  console.log('   ✅ nutritionist_profiles created');

  // -------------------------------------------------------
  // 5) Upsert Specialist — dr.nusrat@hhdms.com
  // -------------------------------------------------------
  console.log('\n👤 Creating Specialist: dr.nusrat@hhdms.com ...');
  const nusrat = await prisma.user.upsert({
    where: { email: 'dr.nusrat@hhdms.com' },
    update: {
      passwordHash,
      roleId: specRole.id,
      phoneNumber: '+8801700000003',
      firstNameEn: 'Nusrat',
      lastNameEn: 'Jahan',
      firstNameBn: 'নুসরাত',
      status: 'ACTIVE',
    },
    create: {
      email: 'dr.nusrat@hhdms.com',
      passwordHash,
      phoneNumber: '+8801700000003',
      firstNameEn: 'Nusrat',
      lastNameEn: 'Jahan',
      firstNameBn: 'নুসরাত',
      roleId: specRole.id,
      status: 'ACTIVE',
    },
  });
  console.log('   User ID:', nusrat.id);

  await prisma.$executeRawUnsafe(
    `INSERT INTO specialist_profiles (user_id, license_number, bmdc_registration, specialty_code, qualification, years_of_experience, consultation_fee, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       license_number = $2, bmdc_registration = $3, specialty_code = $4, qualification = $5,
       years_of_experience = $6, consultation_fee = $7, is_available = $8`,
    nusrat.id, 'BMDC-2024-S01', 'BMDC-REG-2024-S01', 'CARD',
    'MBBS, FCPS (Cardiology), MD (Cardiology)', 12, 1500.0, true,
  );
  console.log('   ✅ specialist_profiles created');

  // -------------------------------------------------------
  // 6) Summary
  // -------------------------------------------------------
  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed complete!');
  console.log('='.repeat(50));
  console.log('  MBBS Doctor:    dr.arif@hhdms.com');
  console.log('  Nutritionist:   nutritionist.tanvir@hhdms.com');
  console.log('  Specialist:     dr.nusrat@hhdms.com');
  console.log('  Password (all): Password2026!');
  console.log('='.repeat(50) + '\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
