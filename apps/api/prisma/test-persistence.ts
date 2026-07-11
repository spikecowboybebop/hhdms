// HHDMS Persistence Test — verifies that clinical input fields from the MBBS
// doctor web dashboard are correctly persisted to the database.
// Run via: npx tsx prisma/test-persistence.ts
//
// Tests: Vital Signs, Diagnosis, Test Orders, Prescriptions, Referral
// Each test: sends POST via the real API, then queries Prisma to verify.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = process.env.TEST_API_URL || 'http://127.0.0.1:3001';

interface TestResult {
  feature: string;
  fieldsSent: string;
  fieldsVerified: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;

function pass(feature: string, detail: string) {
  passCount++;
  results.push({ feature, fieldsSent: '', fieldsVerified: '', passed: true, detail });
  console.log(`  ✅ ${feature}: ${detail}`);
}

function fail(feature: string, detail: string) {
  failCount++;
  results.push({ feature, fieldsSent: '', fieldsVerified: '', passed: false, detail });
  console.log(`  ❌ ${feature}: ${detail}`);
}

function log(feature: string, sent: string, verified: string, ok: boolean, detail: string) {
  if (ok) {
    passCount++;
    results.push({ feature, fieldsSent: sent, fieldsVerified: verified, passed: true, detail });
    console.log(`  ✅ ${feature}: ${detail}`);
  } else {
    failCount++;
    results.push({ feature, fieldsSent: sent, fieldsVerified: verified, passed: false, detail });
    console.log(`  ❌ ${feature}: ${detail}`);
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  HHDMS Persistence Test');
  console.log('═'.repeat(70));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // ── Find a testable assignment (arrived + granted preferred) ─────
  let assignment = await prisma.doctor_patient_assignments.findFirst({
    where: { appointment_activity: 'arrived', patient_consent: 'granted' },
    include: {
      doctor: { include: { user: { select: { id: true, email: true, firstNameEn: true, lastNameEn: true } } } },
      patient: { select: { id: true, first_name_en: true, last_name_en: true, mrn: true } },
    },
  });

  // Fallback: take any assignment and adjust its state
  if (!assignment) {
    assignment = await prisma.doctor_patient_assignments.findFirst({
      include: {
        doctor: { include: { user: { select: { id: true, email: true, firstNameEn: true, lastNameEn: true } } } },
        patient: { select: { id: true, first_name_en: true, last_name_en: true, mrn: true } },
      },
    });
    if (!assignment) {
      console.error('  No doctor_patient_assignments found in DB');
      process.exit(1);
    }
    // Save the original state and set to arrived + granted
    const origActivity = assignment.appointment_activity;
    const origConsent = assignment.patient_consent;
    await prisma.doctor_patient_assignments.update({
      where: { id: assignment.id },
      data: { appointment_activity: 'arrived', patient_consent: 'granted' },
    });
    console.log(`  Assignment ${assignment.id}: set arrived+granted (was ${origActivity}/${origConsent})`);
    (assignment as any)._origActivity = origActivity;
    (assignment as any)._origConsent = origConsent;
  } else {
    console.log(`  Assignment ${assignment.id}: already arrived+granted`);
  }

  const doctorUser = assignment.doctor.user;
  const patient = assignment.patient;
  console.log(`\n  Doctor: Dr. ${doctorUser.firstNameEn} ${doctorUser.lastNameEn} (${doctorUser.email})`);
  console.log(`  Patient: ${patient.first_name_en} ${patient.last_name_en} (${patient.mrn})`);

  // ── Login to get JWT ─────────────────────────────────────────────
  console.log('\n  Logging in...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: doctorUser.email, password: 'Password2026!' }),
  });
  if (!loginRes.ok) {
    const body = await loginRes.text();
    console.error(`  Login failed: ${loginRes.status} ${body}`);
    process.exit(1);
  }
  const loginData: any = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  if (!token) {
    console.error('  No token in login response');
    process.exit(1);
  }
  console.log('  Token acquired');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const pid = patient.id;
  const createdIds: { vitals?: string[]; diagnoses?: string[]; orders?: string[]; prescriptions?: string[]; referrals?: string[] } = {};

  // ═══════════════════════════════════════════════════════════════════
  //  1. VITAL SIGNS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  console.log('  TEST 1: Vital Signs');
  console.log('─'.repeat(50));

  try {
    const vitalsPayload = {
      systolic_bp: 148,
      diastolic_bp: 92,
      pulse_bpm: 88,
      temperature_c: 37.2,
      spo2_pct: 97,
      respiratory_rate: 18,
      weight_kg: 82.5,
      height_cm: 172.0,
      notes: 'Test vitals recording - patient reports occasional dizziness',
    };

    const vitalsRes = await fetch(`${API_BASE}/mbbs/patients/${pid}/vitals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(vitalsPayload),
    });

    if (vitalsRes.ok) {
      const vitalsData: any = await vitalsRes.json();

      // Verify via Prisma
      const dbRow = await prisma.patient_vital_signs.findUniqueOrThrow({
        where: { id: vitalsData.id },
      });

      const matches = {
        systolic_bp: dbRow.systolic_bp === vitalsPayload.systolic_bp,
        diastolic_bp: dbRow.diastolic_bp === vitalsPayload.diastolic_bp,
        pulse_bpm: dbRow.pulse_bpm === vitalsPayload.pulse_bpm,
        temperature_c: Number(dbRow.temperature_c) === vitalsPayload.temperature_c,
        spo2_pct: dbRow.spo2_pct === vitalsPayload.spo2_pct,
        respiratory_rate: dbRow.respiratory_rate === vitalsPayload.respiratory_rate,
        weight_kg: Number(dbRow.weight_kg) === vitalsPayload.weight_kg,
        height_cm: Number(dbRow.height_cm) === vitalsPayload.height_cm,
        bmi: Number(dbRow.bmi) > 0,
        is_abnormal: dbRow.is_abnormal === true,
        notes: dbRow.notes === vitalsPayload.notes,
        patient_id: dbRow.patient_id === pid,
        doctor_id: dbRow.doctor_id === doctorUser.id,
      };

      const allOk = Object.values(matches).every(Boolean);
      const failed = Object.entries(matches).filter(([, v]) => !v).map(([k]) => k);
      log('Vital Signs',
        JSON.stringify(vitalsPayload),
        JSON.stringify(dbRow, null, 1),
        allOk,
        allOk ? `All ${Object.keys(matches).length} fields match` : `Mismatch on: ${failed.join(', ')}`);

      if (!createdIds.vitals) createdIds.vitals = [];
      createdIds.vitals.push(vitalsData.id);
    } else {
      const errBody = await vitalsRes.json().catch(() => ({}));
      fail('Vital Signs', `API returned ${vitalsRes.status}: ${(errBody as any).message || 'unknown'}`);
    }
  } catch (err: any) {
    fail('Vital Signs', `Exception: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  2. DIAGNOSIS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  console.log('  TEST 2: Diagnosis');
  console.log('─'.repeat(50));

  try {
    const diagnosisPayload = {
      icd10_code: 'I10',
      chief_complaint: 'Recurrent headache and dizziness for 3 days',
      history_of_present_illness: 'Onset gradual, throbbing headache mostly in morning. No aura. No previous history.',
      review_of_systems: 'No visual disturbances, no palpitations, no chest pain',
      examination_findings: 'BP 148/92 mmHg, Pulse 88 bpm, BMI 27.9, Fundoscopy normal',
      preliminary_diagnosis: 'Essential hypertension',
      is_primary: true,
    };

    const diagRes = await fetch(`${API_BASE}/mbbs/patients/${pid}/diagnoses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(diagnosisPayload),
    });

    if (diagRes.ok) {
      const diagData: any = await diagRes.json();

      const dbRow = await prisma.patient_diagnoses.findUniqueOrThrow({
        where: { id: diagData.id },
      });

      const matches = {
        icd10_code: dbRow.icd10_code === diagnosisPayload.icd10_code,
        chief_complaint: dbRow.chief_complaint === diagnosisPayload.chief_complaint,
        history_of_present_illness: dbRow.history_of_present_illness === diagnosisPayload.history_of_present_illness,
        review_of_systems: dbRow.review_of_systems === diagnosisPayload.review_of_systems,
        examination_findings: dbRow.examination_findings === diagnosisPayload.examination_findings,
        preliminary_diagnosis: dbRow.preliminary_diagnosis === diagnosisPayload.preliminary_diagnosis,
        is_primary: dbRow.is_primary === diagnosisPayload.is_primary,
        patient_id: dbRow.patient_id === pid,
        doctor_id: dbRow.doctor_id === doctorUser.id,
      };

      const allOk = Object.values(matches).every(Boolean);
      const failed = Object.entries(matches).filter(([, v]) => !v).map(([k]) => k);
      log('Diagnosis',
        JSON.stringify(diagnosisPayload),
        JSON.stringify(dbRow, null, 1),
        allOk,
        allOk ? `All ${Object.keys(matches).length} fields match` : `Mismatch on: ${failed.join(', ')}`);

      if (!createdIds.diagnoses) createdIds.diagnoses = [];
      createdIds.diagnoses.push(diagData.id);
    } else {
      const errBody = await diagRes.json().catch(() => ({}));
      fail('Diagnosis', `API returned ${diagRes.status}: ${(errBody as any).message || 'unknown'}`);
    }
  } catch (err: any) {
    fail('Diagnosis', `Exception: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  3. DIAGNOSIS — only required fields (empty optionals)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  console.log('  TEST 3: Diagnosis (required fields only)');
  console.log('─'.repeat(50));

  try {
    const minimalPayload = {
      icd10_code: 'E11',
      chief_complaint: '',
      history_of_present_illness: '',
      review_of_systems: '',
      examination_findings: '',
      preliminary_diagnosis: 'Type 2 diabetes mellitus',
    };

    const diagRes = await fetch(`${API_BASE}/mbbs/patients/${pid}/diagnoses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(minimalPayload),
    });

    if (diagRes.ok) {
      const diagData: any = await diagRes.json();

      const dbRow = await prisma.patient_diagnoses.findUniqueOrThrow({
        where: { id: diagData.id },
      });

      const matches = {
        icd10_code: dbRow.icd10_code === minimalPayload.icd10_code,
        chief_complaint: dbRow.chief_complaint === minimalPayload.chief_complaint,
        history_of_present_illness: dbRow.history_of_present_illness === minimalPayload.history_of_present_illness,
        review_of_systems: dbRow.review_of_systems === minimalPayload.review_of_systems,
        examination_findings: dbRow.examination_findings === minimalPayload.examination_findings,
        preliminary_diagnosis: dbRow.preliminary_diagnosis === minimalPayload.preliminary_diagnosis,
        is_primary: dbRow.is_primary === false,
      };

      const allOk = Object.values(matches).every(Boolean);
      const failed = Object.entries(matches).filter(([, v]) => !v).map(([k]) => k);
      log('Diagnosis (minimal)',
        JSON.stringify(minimalPayload),
        JSON.stringify(dbRow, null, 1),
        allOk,
        allOk ? `All fields match, is_primary defaults to false` : `Mismatch on: ${failed.join(', ')}`);

      if (!createdIds.diagnoses) createdIds.diagnoses = [];
      createdIds.diagnoses.push(diagData.id);
    } else {
      const errBody = await diagRes.json().catch(() => ({}));
      fail('Diagnosis (minimal)', `API returned ${diagRes.status}: ${(errBody as any).message || 'unknown'}`);
    }
  } catch (err: any) {
    fail('Diagnosis (minimal)', `Exception: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  4. TEST ORDERS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  console.log('  TEST 4: Test Orders');
  console.log('─'.repeat(50));

  try {
    // Find a test from the catalog
    const catalog = await prisma.diagnostic_test_catalog.findFirst({
      where: { is_active: true },
      orderBy: { test_code: 'asc' },
    });
    if (!catalog) {
      fail('Test Orders', 'No tests found in catalog - run seed first');
    } else {
      const orderPayload = {
        test_ids: [catalog.id],
        clinical_notes: 'Fasting blood sample required for diabetes screening',
      };

      const orderRes = await fetch(`${API_BASE}/mbbs/patients/${pid}/test-orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      });

      if (orderRes.ok) {
        const orderData: any = await orderRes.json();
        const orders = Array.isArray(orderData)
          ? orderData
          : orderData.orders && Array.isArray(orderData.orders)
            ? orderData.orders
            : [orderData];

        let allOrderOk = true;
        const orderFailures: string[] = [];

        for (const order of orders) {
          const dbRow = await prisma.diagnostic_test_orders.findUniqueOrThrow({
            where: { id: order.id },
          });

          const matches = {
            test_id: dbRow.test_id === catalog.id,
            clinical_notes: dbRow.clinical_notes === orderPayload.clinical_notes,
            status: dbRow.status === 'ORDERED',
            patient_id: dbRow.patient_id === pid,
            doctor_id: dbRow.doctor_id === doctorUser.id,
          };

          const orderOk = Object.values(matches).every(Boolean);
          if (!orderOk) {
            allOrderOk = false;
            orderFailures.push(
              `Order ${order.id}: ${Object.entries(matches).filter(([, v]) => !v).map(([k]) => k).join(', ')}`,
            );
          }
        }

        log('Test Orders', JSON.stringify(orderPayload), `${orders.length} orders created`, allOrderOk,
          allOrderOk ? `${orders.length} order(s) match all fields` : orderFailures.join('; '));

        if (!createdIds.orders) createdIds.orders = [];
        for (const order of orders) createdIds.orders.push(order.id);
      } else {
        const errBody = await orderRes.json().catch(() => ({}));
        fail('Test Orders', `API returned ${orderRes.status}: ${(errBody as any).message || 'unknown'}`);
      }
    }
  } catch (err: any) {
    fail('Test Orders', `Exception: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  5. PRESCRIPTION
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  console.log('  TEST 5: Prescription');
  console.log('─'.repeat(50));

  try {
    const rxPayload = {
      notes: 'Test prescription - patient advised low salt diet',
      medications: [
        {
          generic_name: 'Amlodipine',
          brand_name: 'Camlos',
          dosage: '5mg',
          frequency: '1+0+0',
          duration_days: 30,
          route: 'Oral',
          special_instructions: 'Take once daily in the morning',
        },
        {
          generic_name: 'Losartan',
          brand_name: 'Losaar',
          dosage: '50mg',
          frequency: '0+0+1',
          duration_days: 30,
          route: 'Oral',
          special_instructions: '',
        },
      ],
    };

    const rxRes = await fetch(`${API_BASE}/mbbs/patients/${pid}/prescriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rxPayload),
    });

    if (rxRes.ok) {
      const rxData: any = await rxRes.json();
      const rxId = rxData.prescription?.id || rxData.id;

      const dbRx = await prisma.prescriptions.findUniqueOrThrow({
        where: { id: rxId },
        include: { medications: { orderBy: { generic_name: 'asc' } } },
      });

      const rxMatches = {
        notes: dbRx.notes === rxPayload.notes,
        status: dbRx.status === 'ACTIVE',
        patient_id: dbRx.patient_id === pid,
        doctor_id: dbRx.doctor_id === doctorUser.id,
      };

      const rxOk = Object.values(rxMatches).every(Boolean);
      const rxFailed = Object.entries(rxMatches).filter(([, v]) => !v).map(([k]) => k);

      let medsOk = true;
      const medFailures: string[] = [];

      if (dbRx.medications.length !== rxPayload.medications.length) {
        medsOk = false;
        medFailures.push(`Expected ${rxPayload.medications.length} meds, got ${dbRx.medications.length}`);
      } else {
        for (let i = 0; i < rxPayload.medications.length; i++) {
          const expected = rxPayload.medications[i];
          const actual = dbRx.medications[i];
          const medMatches = {
            generic_name: actual.generic_name === expected.generic_name,
            brand_name: actual.brand_name === expected.brand_name,
            dosage: actual.dosage === expected.dosage,
            frequency: actual.frequency === expected.frequency,
            duration_days: actual.duration_days === expected.duration_days,
            route: actual.route === expected.route,
            special_instructions: (actual.special_instructions || '') === expected.special_instructions,
          };
          const medOk = Object.values(medMatches).every(Boolean);
          if (!medOk) {
            medsOk = false;
            medFailures.push(
              `Med ${i} (${expected.generic_name}): ${Object.entries(medMatches).filter(([, v]) => !v).map(([k]) => k).join(', ')}`,
            );
          }
        }
      }

      const allOk = rxOk && medsOk;
      log('Prescription',
        JSON.stringify(rxPayload),
        JSON.stringify(dbRx, null, 1),
        allOk,
        allOk
          ? `Prescription + ${dbRx.medications.length} medication(s) all match`
          : [...rxFailed, ...medFailures].join('; '));

      if (!createdIds.prescriptions) createdIds.prescriptions = [];
      createdIds.prescriptions.push(rxId);
    } else {
      const errBody = await rxRes.json().catch(() => ({}));
      fail('Prescription', `API returned ${rxRes.status}: ${(errBody as any).message || 'unknown'}`);
    }
  } catch (err: any) {
    fail('Prescription', `Exception: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  6. REFERRAL
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  console.log('  TEST 6: Referral');
  console.log('─'.repeat(50));

  try {
    const referralPayload = {
      specialty_code: 'CARDIOLOGY',
      referral_reason: 'Uncontrolled hypertension with recent episodes of dizziness despite Amlodipine 5mg',
      clinical_summary: 'Patient has a history of high blood pressure, recently reading 148/92. Prescribed Amlodipine 5mg. Needs cardiac evaluation for possible secondary hypertension.',
      is_emergency: false,
    };

    const refRes = await fetch(`${API_BASE}/mbbs/patients/${pid}/referrals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(referralPayload),
    });

    if (refRes.ok) {
      const refData: any = await refRes.json();

      const dbRow = await prisma.specialist_referrals.findUniqueOrThrow({
        where: { id: refData.id },
      });

      const matches = {
        specialty_code: dbRow.specialty_code === referralPayload.specialty_code,
        referral_reason: dbRow.referral_reason === referralPayload.referral_reason,
        clinical_summary: dbRow.clinical_summary === referralPayload.clinical_summary,
        is_emergency: dbRow.is_emergency === referralPayload.is_emergency,
        status: dbRow.status === 'PENDING',
        patient_id: dbRow.patient_id === pid,
        referring_doctor_id: dbRow.referring_doctor_id === doctorUser.id,
      };

      const allOk = Object.values(matches).every(Boolean);
      const failed = Object.entries(matches).filter(([, v]) => !v).map(([k]) => k);
      log('Referral',
        JSON.stringify(referralPayload),
        JSON.stringify(dbRow, null, 1),
        allOk,
        allOk ? `All ${Object.keys(matches).length} fields match` : `Mismatch on: ${failed.join(', ')}`);

      if (!createdIds.referrals) createdIds.referrals = [];
      createdIds.referrals.push(refData.id);
    } else {
      const errBody = await refRes.json().catch(() => ({}));
      fail('Referral', `API returned ${refRes.status}: ${(errBody as any).message || 'unknown'}`);
    }
  } catch (err: any) {
    fail('Referral', `Exception: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('  RESULTS');
  console.log('═'.repeat(70));

  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.feature}: ${r.detail}`);
  }

  console.log(`\n  ${'─'.repeat(50)}`);
  console.log(`  Passed: ${passCount} / ${passCount + failCount}`);
  console.log(`  Failed: ${failCount} / ${passCount + failCount}`);

  // ── Cleanup ──────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('  Cleaning up test data...');

  if (createdIds.vitals) {
    await prisma.patient_vital_signs.deleteMany({ where: { id: { in: createdIds.vitals } } });
    console.log(`  Deleted ${createdIds.vitals.length} vital sign(s)`);
  }
  if (createdIds.diagnoses) {
    await prisma.patient_diagnoses.deleteMany({ where: { id: { in: createdIds.diagnoses } } });
    console.log(`  Deleted ${createdIds.diagnoses.length} diagnosis/diagnoses`);
  }
  if (createdIds.orders) {
    await prisma.diagnostic_test_orders.deleteMany({ where: { id: { in: createdIds.orders } } });
    console.log(`  Deleted ${createdIds.orders.length} test order(s)`);
  }
  if (createdIds.prescriptions) {
    // Delete child medications first
    await prisma.prescription_medications.deleteMany({ where: { prescription_id: { in: createdIds.prescriptions } } });
    await prisma.prescriptions.deleteMany({ where: { id: { in: createdIds.prescriptions } } });
    console.log(`  Deleted ${createdIds.prescriptions.length} prescription(s) + medications`);
  }
  if (createdIds.referrals) {
    await prisma.specialist_referrals.deleteMany({ where: { id: { in: createdIds.referrals } } });
    console.log(`  Deleted ${createdIds.referrals.length} referral(s)`);
  }

  // Restore assignment state
  const origActivity = (assignment as any)._origActivity;
  const origConsent = (assignment as any)._origConsent;
  if (origActivity !== undefined) {
    await prisma.doctor_patient_assignments.update({
      where: { id: assignment.id },
      data: { appointment_activity: origActivity, patient_consent: origConsent },
    });
    console.log(`  Assignment restored: ${origActivity} / ${origConsent}`);
  } else {
    console.log('  Assignment was not modified, no restore needed');
  }

  console.log('\n' + '═'.repeat(70));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test failed with exception:', err);
  process.exit(1);
});
