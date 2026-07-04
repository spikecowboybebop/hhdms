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
  const MEHRAB_USER_ID = '5fc67eee-afa8-4185-893e-497696593b77';
  const ARIF_DOCTOR_ID = '50978385-bb41-4e97-a99b-f01045d6fbb4';

  // 1. Find a unique MRN
  const allMrns = await prisma.patients.findMany({ select: { mrn: true } });
  const mrnSet = new Set(allMrns.map((p) => p.mrn));
  let newMrn = '';
  for (let i = 1; i <= 9999; i++) {
    const candidate = `MRN-2024-${String(i).padStart(4, '0')}`;
    if (!mrnSet.has(candidate)) {
      newMrn = candidate;
      break;
    }
  }
  if (!newMrn) throw new Error('No available MRN');

  console.log(`Creating patient with MRN: ${newMrn}`);

  // 2. Create the patient linked to mehrab
  const patient = await prisma.patients.create({
    data: {
      mrn: newMrn,
      first_name_en: 'Mehrab',
      last_name_en: 'Hossain',
      first_name_bn: 'মেহরাব',
      last_name_bn: 'হোসেন',
      date_of_birth: new Date('1995-08-22'),
      sex: 'M',
      blood_group: 'A+',
      phone_number: '+8801700000050',
      email: 'mehrab@gmail.com',
      address_line1: 'House 12, Road 5',
      district: 'Dhaka',
      emergency_contact: '+8801700000099',
      known_allergies: 'Penicillin, Dust',
      current_medications: 'None',
      past_medical_history: 'No significant history',
      family_history: 'Father has hypertension',
      height_cm: 172,
      weight_kg: 68,
      user_id: MEHRAB_USER_ID,
    },
  });

  console.log(`Patient created: ${patient.id}`);

  // 3. Assign to Dr. Arif (current appointment)
  await prisma.doctor_patient_assignments.upsert({
    where: {
      doctor_id_patient_id: {
        doctor_id: ARIF_DOCTOR_ID,
        patient_id: patient.id,
      },
    },
    update: {},
    create: {
      doctor_id: ARIF_DOCTOR_ID,
      patient_id: patient.id,
      appointment_activity: 'pending',
    },
  });

  console.log('Assigned to Dr. Arif (pending appointment)');

  // 4. Create a vital signs record
  await prisma.patient_vital_signs.create({
    data: {
      patient_id: patient.id,
      doctor_id: ARIF_DOCTOR_ID,
      systolic_bp: 135,
      diastolic_bp: 88,
      pulse_bpm: 78,
      temperature_c: 36.8,
      spo2_pct: 98,
      respiratory_rate: 16,
      weight_kg: 68,
      height_cm: 172,
      bmi: 23.0,
      notes: 'Patient looks healthy. Slightly elevated BP.',
      is_abnormal: false,
    },
  });

  console.log('Vitals created');

  // 5. Create a diagnosis (essential hypertension)
  const diagnosis = await prisma.patient_diagnoses.create({
    data: {
      patient_id: patient.id,
      doctor_id: ARIF_DOCTOR_ID,
      icd10_code: 'I10',
      chief_complaint: 'Mild headache and occasional dizziness for 1 week',
      history_of_present_illness: 'Patient reports intermittent headaches, mostly in the mornings. No visual disturbances. No nausea.',
      review_of_systems: 'CVS: Normal. CNS: Normal. Respiratory: Clear.',
      examination_findings: 'BP 135/88, HR 78, regular. No edema.',
      preliminary_diagnosis: 'Essential hypertension (Stage 1)',
      is_primary: true,
    },
  });

  console.log('Diagnosis created');

  // 6. Create a prescription
  const prescription = await prisma.prescriptions.create({
    data: {
      patient_id: patient.id,
      doctor_id: ARIF_DOCTOR_ID,
      diagnosis_id: diagnosis.id,
      notes: 'Advised low sodium diet, regular exercise 30min/day, reduce caffeine.',
    },
  });

  // 7. Add medications to the prescription
  await prisma.prescription_medications.create({
    data: {
      prescription_id: prescription.id,
      generic_name: 'Amlodipine',
      brand_name: 'Amlopin',
      dosage: '5mg',
      frequency: '1+0+0 (once daily after breakfast)',
      duration_days: 30,
      route: 'Oral',
      special_instructions: 'Take in the morning. Avoid grapefruit juice.',
    },
  });

  await prisma.prescription_medications.create({
    data: {
      prescription_id: prescription.id,
      generic_name: 'Losartan Potassium',
      brand_name: 'Losar',
      dosage: '25mg',
      frequency: '1+0+0 (once daily)',
      duration_days: 30,
      route: 'Oral',
      special_instructions: 'Take at bedtime if night BP is high.',
    },
  });

  console.log('Prescription with medications created');

  // 8. Create test orders
  const cbcTest = await prisma.diagnostic_test_catalog.findFirst({ where: { test_code: 'CBC' } });
  const fbgTest = await prisma.diagnostic_test_catalog.findFirst({ where: { test_code: 'FBG' } });
  const lipidTest = await prisma.diagnostic_test_catalog.findFirst({ where: { test_code: 'LIPID' } });

  if (cbcTest) {
    const order = await prisma.diagnostic_test_orders.create({
      data: {
        patient_id: patient.id,
        doctor_id: ARIF_DOCTOR_ID,
        test_id: cbcTest.id,
        status: 'ORDERED',
        clinical_notes: 'Routine checkup - baseline CBC',
      },
    });
    console.log(`Test order created: ${order.id} (CBC)`);
  }

  if (fbgTest) {
    const order = await prisma.diagnostic_test_orders.create({
      data: {
        patient_id: patient.id,
        doctor_id: ARIF_DOCTOR_ID,
        test_id: fbgTest.id,
        status: 'ORDERED',
        clinical_notes: 'Check for diabetes risk due to family history',
      },
    });
    console.log(`Test order created: ${order.id} (FBG)`);
  }

  if (lipidTest) {
    const order = await prisma.diagnostic_test_orders.create({
      data: {
        patient_id: patient.id,
        doctor_id: ARIF_DOCTOR_ID,
        test_id: lipidTest.id,
        status: 'ORDERED',
        clinical_notes: 'Lipid profile for hypertension workup',
      },
    });
    console.log(`Test order created: ${order.id} (Lipid Profile)`);
  }

  console.log('\n✅ Done! Patient Mehrab Hossain is now visible in the MBBS module.');
  console.log(`   MRN: ${newMrn}`);
  console.log(`   Patient ID: ${patient.id}`);
  console.log(`   Assigned to Dr. Arif Hossain`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
