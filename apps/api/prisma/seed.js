// =============================================================
// HHDMS Seed Script — Demo Users for MBBS / Specialist / Nutritionist
// =============================================================
// Run:  node prisma/seed.js
// Expects DATABASE_URL to be set in apps/api/.env
// =============================================================

const path = require('path');

// 1) Load .env from apps/api/.env
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  // 2) Lazily import ESM packages (bcrypt v6 is ESM)
  const [{ PrismaClient }, bcrypt] = await Promise.all([
    import('@prisma/client'),
    import('bcrypt'),
  ]);

  const prisma = new PrismaClient();
  const SALT_ROUNDS = 12;
  const PASSWORD = 'Password2026!';

  console.log('🔐 Hashing passwords ...');
  const passwordHash = await bcrypt.default.hash(PASSWORD, SALT_ROUNDS);

  // -------------------------------------------------------
  // 3) Upsert roles (idempotent)
  // -------------------------------------------------------
  console.log('🛡️  Upserting roles ...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'MBBS_DOCTOR' },
      update: {},
      create: { name: 'MBBS_DOCTOR', description: 'MBBS Doctor — first-call clinician' },
    }),
    prisma.role.upsert({
      where: { name: 'NUTRITIONIST' },
      update: {},
      create: { name: 'NUTRITIONIST', description: 'Diet & nutrition planning specialist' },
    }),
    prisma.role.upsert({
      where: { name: 'SPECIALIST' },
      update: {},
      create: { name: 'SPECIALIST', description: 'Referred specialist consultant' },
    }),
  ]);

  const roleMap = {};
  for (const r of roles) roleMap[r.name] = r.id;

  console.log('   Roles ready:', Object.keys(roleMap).join(', '));

  // -------------------------------------------------------
  // 4) Upsert users + profiles
  // -------------------------------------------------------
  const usersToCreate = [
    {
      email: 'dr.arif@hhdms.com',
      phone: '+8801700000001',
      firstNameEn: 'Arif',
      lastNameEn: 'Hossain',
      firstNameBn: 'আরিফ',
      roleName: 'MBBS_DOCTOR',
      profile: {
        table: 'mbbs_doctor_profiles',
        data: {
          license_number: 'BMDC-2024-001',
          bmdc_registration: 'BMDC-REG-2024-001',
          specialization: 'Family Medicine',
          qualification: 'MBBS (Dhaka Medical College), MD (Internal Medicine)',
          years_of_experience: 8,
          consultation_fee: 800.0,
          is_available: true,
        },
      },
    },
    {
      email: 'nutritionist.tanvir@hhdms.com',
      phone: '+8801700000002',
      firstNameEn: 'Tanvir',
      lastNameEn: 'Ahmed',
      firstNameBn: 'তানভীর',
      roleName: 'NUTRITIONIST',
      profile: {
        table: 'nutritionist_profiles',
        data: {
          license_number: 'NUT-2024-001',
          specialization: 'Clinical Dietetics & Obesity Management',
          qualification: 'BSc (Food & Nutrition), MSc (Dietetics)',
          years_of_experience: 5,
          consultation_fee: 500.0,
          is_available: true,
        },
      },
    },
    {
      email: 'dr.nusrat@hhdms.com',
      phone: '+8801700000003',
      firstNameEn: 'Nusrat',
      lastNameEn: 'Jahan',
      firstNameBn: 'নুসরাত',
      roleName: 'SPECIALIST',
      profile: {
        table: 'specialist_profiles',
        data: {
          license_number: 'BMDC-2024-S01',
          bmdc_registration: 'BMDC-REG-2024-S01',
          specialty_code: 'CARD',
          qualification: 'MBBS, FCPS (Cardiology), MD (Cardiology)',
          years_of_experience: 12,
          consultation_fee: 1500.0,
          is_available: true,
        },
      },
    },
  ];

  for (const u of usersToCreate) {
    console.log(`👤 Creating user: ${u.email} (${u.roleName}) ...`);

    // Create or update the user record
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        roleId: roleMap[u.roleName],
        phoneNumber: u.phone,
        firstNameEn: u.firstNameEn,
        lastNameEn: u.lastNameEn,
        firstNameBn: u.firstNameBn,
        status: 'ACTIVE',
      },
      create: {
        email: u.email,
        passwordHash,
        phoneNumber: u.phone,
        firstNameEn: u.firstNameEn,
        lastNameEn: u.lastNameEn,
        firstNameBn: u.firstNameBn,
        roleId: roleMap[u.roleName],
        status: 'ACTIVE',
      },
    });

    // Create the profile row using raw SQL to stay type-safe across models
    const profileTable = u.profile.table;
    const profileData = u.profile.data;

    // Build the upsert using the Prisma client's dynamic $queryRawUnsafe
    // (Prisma client doesn't expose dynamic model access easily, so we use raw SQL)
    const columns = ['user_id', ...Object.keys(profileData)];
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    const values = [user.id, ...Object.values(profileData)];

    // ON CONFLICT (user_id) DO UPDATE ... RETURNING *
    const updateSet = columns
      .filter((c) => c !== 'user_id')
      .map((c, i) => `"${c}" = $${i + 1}`);

    const sql = `
      INSERT INTO "${profileTable}" (${columns.map((c) => `"${c}"`).join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT ("user_id") DO UPDATE SET ${updateSet.join(', ')}
    `;

    await prisma.$executeRawUnsafe(sql, ...values);
    console.log(`   ✅ Profile created in ${profileTable}`);
  }

  // -------------------------------------------------------
  // 5) Summary
  // -------------------------------------------------------
  console.log('\n✅ Seed complete!');
  console.log('──────────────────────────────────────────────');
  console.log('  MBBS Doctor:    dr.arif@hhdms.com');
  console.log('  Nutritionist:   nutritionist.tanvir@hhdms.com');
  console.log('  Specialist:     dr.nusrat@hhdms.com');
  console.log('  Password (all): Password2026!');
  console.log('──────────────────────────────────────────────\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
