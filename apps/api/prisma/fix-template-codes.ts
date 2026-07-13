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
  const fixes = [
    { from: 'PULMO', to: 'PULM' },
    { from: 'NEPHRO', to: 'NEPH' },
    { from: 'DERMA', to: 'DERM' },
    { from: 'GYNAE', to: 'GYNEC' },
    { from: 'MED', to: 'INTERN' },
  ];

  for (const f of fixes) {
    const result = await prisma.$executeRawUnsafe(
      'UPDATE specialty_templates SET specialty_code = $1 WHERE specialty_code = $2',
      f.to, f.from,
    );
      console.log(f.from + ' \u2192 ' + f.to + ': ' + result + ' row(s) updated');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
