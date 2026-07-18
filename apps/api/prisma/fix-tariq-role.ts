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
  const specRole = await prisma.role.findUnique({ where: { name: 'SPECIALIST' } });
  if (!specRole) { console.error('SPECIALIST role not found'); process.exit(1); }
  const user = await prisma.user.update({
    where: { email: 'dr.tariq@hhdms.com' },
    data: { roleId: specRole.id },
    select: { email: true, role: { select: { name: true } } },
  });
  console.log('Updated:', user.email, 'role:', user.role.name);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
