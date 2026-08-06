// Create ADMIN role + admin@hhdms.com user (used by the admin dashboard)
// npx tsx prisma/seed-admin.ts

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = 'admin@hhdms.com';
const ADMIN_PASSWORD = 'Password2026!';

async function main() {
  // 1. Upsert ADMIN role
  const role = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { description: 'System Administrator' },
    create: { name: 'ADMIN', description: 'System Administrator' },
  });
  console.log(`Role ADMIN ready (id=${role.id})`);

  // 2. Pick a phone number that is not already used (phone_number is unique + required)
  let phone = '+8801999999999';
  const existingPhone = await prisma.user.findUnique({
    where: { phoneNumber: phone },
    select: { id: true },
  });
  if (existingPhone) {
    for (let i = 0; i < 100; i++) {
      const candidate = `+880199${String(i).padStart(6, '0')}`;
      const taken = await prisma.user.findUnique({
        where: { phoneNumber: candidate },
        select: { id: true },
      });
      if (!taken) {
        phone = candidate;
        break;
      }
    }
  }

  // 3. Upsert the admin user
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      roleId: role.id,
      phoneNumber: phone,
      firstNameEn: 'Admin',
      lastNameEn: 'HHDMS',
      status: 'ACTIVE',
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      phoneNumber: phone,
      firstNameEn: 'Admin',
      lastNameEn: 'HHDMS',
      roleId: role.id,
      status: 'ACTIVE',
      mfaEnabled: false,
    },
    select: {
      id: true,
      email: true,
      firstNameEn: true,
      lastNameEn: true,
      phoneNumber: true,
      role: { select: { name: true } },
      status: true,
    },
  });

  console.log('Admin user ready:', user.email, '| role:', user.role.name, '| status:', user.status, '| phone:', user.phoneNumber);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Script failed:', e);
  process.exit(1);
});
