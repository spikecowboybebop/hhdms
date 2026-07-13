import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PRODUCTION_HOSTS = ['ep-steep-silence-ao9uma2e-pooler.c-2.ap-southeast-1.aws.neon.tech'];
const dbUrl = process.env.DATABASE_URL ?? '';
if (PRODUCTION_HOSTS.some((host) => dbUrl.includes(host))) {
  console.error('Refusing to run against production database.');
  if (!process.env.ALLOW_DESTRUCTIVE_SEED) process.exit(1);
}

interface SpecialistInfo {
  email: string;
  specialtyCode: string;
  name: string;
}

const SPECIALISTS: SpecialistInfo[] = [
  { email: 'dr.ashfaq@hhdms.com', specialtyCode: 'PULM', name: 'Dr. Ashfaq Rahman' },
  { email: 'dr.ayesha@hhdms.com', specialtyCode: 'NEPH', name: 'Dr. Ayesha Sultana' },
  { email: 'dr.farida@hhdms.com', specialtyCode: 'DERM', name: 'Dr. Farida Begum' },
  { email: 'dr.tariq@hhdms.com', specialtyCode: 'ENT', name: 'Dr. Tariq Islam' },
  { email: 'dr.imran@hhdms.com', specialtyCode: 'SURG', name: 'Dr. Imran Hossain' },
  { email: 'dr.khadija@hhdms.com', specialtyCode: 'GYNEC', name: 'Dr. Khadija Akhter' },
  { email: 'dr.mahmud@hhdms.com', specialtyCode: 'INTERN', name: 'Dr. Mahmud Hasan' },
  { email: 'dr.sabrina@hhdms.com', specialtyCode: 'PAIN', name: 'Dr. Sabrina Khan' },
  { email: 'dr.munir@hhdms.com', specialtyCode: 'ONCO', name: 'Dr. Munir Hossain' },
];

interface ReferralSeed {
  patientIdx: number;
  referringDoctorEmail: string;
  reason: string;
  clinicalSummary: string;
}

const REFERRALS: Record<string, ReferralSeed> = {
  'PULM':  { patientIdx: 0, referringDoctorEmail: 'dr.arif@hhdms.com',    reason: 'Persistent cough with dyspnea for 4 weeks, suspect COPD exacerbation.',                     clinicalSummary: 'Smoker 30 pack-years. Spirometry shows FEV1/FVC <0.7. Chest X-ray shows hyperinflation. Needs pulmonology evaluation.' },
  'NEPH':  { patientIdx: 1, referringDoctorEmail: 'dr.arif@hhdms.com',    reason: 'Elevated serum creatinine (2.1 mg/dL) with proteinuria on routine labs.',                    clinicalSummary: 'Diabetic with HbA1c 8.5%. Urine ACR 300 mg/g. eGFR 32 mL/min. Needs nephrology workup for CKD.' },
  'DERM':  { patientIdx: 2, referringDoctorEmail: 'dr.sajid@hhdms.com',   reason: 'Chronic plaque psoriasis not responding to topical treatment.',                              clinicalSummary: 'Widespread scaly plaques on elbows, knees, and scalp. PASI score 14. Failed clobetasol and calcipotriol. Needs dermatology review.' },
  'ENT':   { patientIdx: 3, referringDoctorEmail: 'dr.nasrin@hhdms.com',  reason: 'Chronic sinusitis refractory to antibiotics — recurrent episodes for 6 months.',             clinicalSummary: 'CT sinuses shows bilateral maxillary sinus opacification. Nasal endoscopy reveals mucosal edema. Needs ENT assessment.' },
  'SURG':  { patientIdx: 0, referringDoctorEmail: 'dr.arif@hhdms.com',    reason: 'Right inguinal hernia causing intermittent pain on exertion.',                                clinicalSummary: 'Reducible right indirect inguinal hernia on examination. Ultrasound confirms defect. Needs surgical repair evaluation.' },
  'GYNEC': { patientIdx: 1, referringDoctorEmail: 'dr.farzana@hhdms.com', reason: 'Abnormal uterine bleeding with anemia for 3 months.',                                         clinicalSummary: 'Hb 9.8 g/dL. Ultrasound shows endometrial thickness 14mm. Needs gynecological evaluation and possible biopsy.' },
  'INTERN':{ patientIdx: 2, referringDoctorEmail: 'dr.sajid@hhdms.com',   reason: 'Poorly controlled diabetes and hypertension — recurrent hypoglycemic episodes.',                clinicalSummary: 'Erratic blood glucose. HbA1c 9.1%. BP 155/95 on 2 agents. Needs internal medicine optimization of treatment regimen.' },
  'PAIN':  { patientIdx: 3, referringDoctorEmail: 'dr.nasrin@hhdms.com',  reason: 'Chronic fibromyalgia with widespread pain not responding to standard therapy.',                 clinicalSummary: 'Diagnosed fibromyalgia 2 years ago. Failed response to amitriptyline, duloxetine, and pregabalin. Needs multidisciplinary pain management.' },
  'ONCO':  { patientIdx: 0, referringDoctorEmail: 'dr.arif@hhdms.com',    reason: 'Incidental lung nodule on chest X-ray — 1.8cm speculated lesion in right upper lobe.',        clinicalSummary: 'Asymptomatic, 30 pack-year smoking history. CT chest confirms solid nodule with spiculated margins. PET-CT and biopsy needed.' },
};

async function main() {
  const patients = [
    await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0001' } }), // Rahim (M)
    await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0002' } }), // Fatema (F)
    await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0003' } }), // Kabir (M)
    await prisma.patients.findUniqueOrThrow({ where: { mrn: 'MRN-2024-0004' } }), // Shahnaz (F)
  ];

  let created = 0;
  let skipped = 0;

  for (const spec of SPECIALISTS) {
    const specialistUser = await prisma.user.findUnique({ where: { email: spec.email } });
    if (!specialistUser) {
      console.log(`  SKIP  ${spec.email} — user not found`);
      skipped++;
      continue;
    }

    const pendingCount = await prisma.specialist_referrals.count({
      where: { specialist_id: specialistUser.id, status: 'PENDING' },
    });

    if (pendingCount > 0) {
      console.log(`  SKIP  ${spec.email} (${spec.specialtyCode}) — already has ${pendingCount} pending referral(s)`);
      skipped++;
      continue;
    }

    const seed = REFERRALS[spec.specialtyCode];
    if (!seed) {
      console.log(`  SKIP  ${spec.email} (${spec.specialtyCode}) — no referral seed defined`);
      skipped++;
      continue;
    }

    const referringDoctor = await prisma.user.findUniqueOrThrow({
      where: { email: seed.referringDoctorEmail },
    });
    const patient = patients[seed.patientIdx];

    await prisma.specialist_referrals.create({
      data: {
        patient_id: patient.id,
        referring_doctor_id: referringDoctor.id,
        specialist_id: specialistUser.id,
        specialty_code: spec.specialtyCode,
        referral_reason: seed.reason,
        clinical_summary: seed.clinicalSummary,
        is_emergency: false,
        status: 'PENDING',
      },
    });

    console.log(`  OK    ${spec.email} (${spec.specialtyCode}) → ${patient.first_name_en} ${patient.last_name_en} [PENDING]`);
    created++;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
