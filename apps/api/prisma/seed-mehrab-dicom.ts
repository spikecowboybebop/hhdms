import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PATIENT_ID = '931aabf2-327b-4eb3-8f63-6a3d502bbc36';

const STUDIES: {
  url: string;
  desc: string;
  modality?: string;
  body_part?: string;
}[] = [
  {
    url: 'https://38f6hm6lp4.ucarecd.net/cd9952e7-8e17-4450-ab55-03b2e90e7279/dxchestcovid19nysbuinstance.dcm',
    desc: 'Chest X-ray - COVID-19 (NYSBU)',
  },
  {
    url: 'https://38f6hm6lp4.ucarecd.net/5e0da00e-881b-4ef5-a157-3ccf45971dfb/dxchestvarepopapolloinstance.dcm',
    desc: 'Chest X-ray - Varicella pneumonia (Apollo) #1',
  },
  {
    url: 'https://38f6hm6lp4.ucarecd.net/7b68012e-64ac-4fe4-9499-57887ee5b075/dxchestvarepopapolloinstance.dcm',
    desc: 'Chest X-ray - Varicella pneumonia (Apollo) #2',
  },
  {
    url: 'https://38f6hm6lp4.ucarecd.net/62c5a60c-529c-4194-97f9-e3de5cb049f9/dxchestlidcidriinstance.dcm',
    desc: 'Chest X-ray - LIDC/IDRI',
  },
  {
    url: 'https://38f6hm6lp4.ucarecd.net/e30dad72-6a54-4bf2-bcb6-da00492606e7/usliverbmodeceusinstance.dcm',
    desc: 'Liver Ultrasound - B-mode + CEUS',
    modality: 'USG',
    body_part: 'Liver',
  },
  {
    url: 'https://38f6hm6lp4.ucarecd.net/6d1eaefd-6b4d-4a73-bb82-1449cd42ab64/usprostatemribiopsyinstance.dcm',
    desc: 'Prostate Ultrasound - MRI fusion biopsy',
    modality: 'USG',
    body_part: 'Prostate',
  },
  {
    url: 'https://38f6hm6lp4.ucarecd.net/5f8c8844-c5e4-4758-ac2b-ff675b1bda31/uskidneycmbcrcinstance.dcm',
    desc: 'Kidney Ultrasound - CMB/CRC',
    modality: 'USG',
    body_part: 'Kidney',
  },
];

async function main() {
  for (const s of STUDIES) {
    const existing = await prisma.specialist_dicom_studies.findFirst({
      where: { file_path: s.url },
    });
    if (existing) {
      console.log(`Skipping (already exists): ${s.desc}`);
      continue;
    }

    await prisma.specialist_dicom_studies.create({
      data: {
        patient_id: PATIENT_ID,
        file_path: s.url,
        modality: s.modality ?? 'X-RAY',
        body_part: s.body_part ?? 'Chest',
        description: s.desc,
      },
    });
    console.log(`Created: ${s.desc}`);
  }

  console.log(`\n✅ Done. ${STUDIES.length} DICOM studies assigned to patient ${PATIENT_ID}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
