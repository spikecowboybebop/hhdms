import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required?: boolean;
}

interface TemplateSeed {
  specialty_code: string;
  template_name: string;
  description: string;
  schema: TemplateField[];
}

const TEMPLATES: TemplateSeed[] = [
  // ── CARD (Cardiology) ──────────────────────────────────────────────
  {
    specialty_code: 'CARD',
    template_name: 'Cardiac Stress Protocol',
    description: 'Standard cardiac stress test evaluation template',
    schema: [
      { id: 'cardiac_rhythm', label: 'Cardiac Rhythm', type: 'select', options: ['Normal Sinus', 'Atrial Fibrillation', 'Atrial Flutter', 'Sinus Tachycardia', 'Sinus Bradycardia', 'Other'], required: true },
      { id: 'stress_duration', label: 'Duration (mins)', type: 'number', required: false },
      { id: 'max_hr', label: 'Maximum Heart Rate (bpm)', type: 'number', required: true },
      { id: 'hr_percentage', label: 'HR % of Predicted', type: 'number', required: false },
      { id: 'bp_response', label: 'Blood Pressure Response', type: 'select', options: ['Normal', 'Hypertensive', 'Hypotensive', 'Blunted'], required: true },
      { id: 'st_segment', label: 'ST Segment Analysis', type: 'text', required: true },
      { id: 'symptoms', label: 'Symptoms During Test', type: 'text', required: false },
      { id: 'interpretation', label: 'Interpretation', type: 'select', options: ['Negative for ischemia', 'Positive for ischemia', 'Equivocal', 'Non-diagnostic'], required: true },
    ],
  },
  {
    specialty_code: 'CARD',
    template_name: 'Heart Failure Assessment',
    description: 'Initial and follow-up evaluation for heart failure patients',
    schema: [
      { id: 'nyha_class', label: 'NYHA Functional Class', type: 'select', options: ['Class I', 'Class II', 'Class III', 'Class IV'], required: true },
      { id: 'ejection_fraction', label: 'Ejection Fraction (%)', type: 'number', required: true },
      { id: 'pedal_edema', label: 'Pedal Edema', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'], required: true },
      { id: 'jugular_venous', label: 'Jugular Venous Distension', type: 'select', options: ['Absent', 'Present', 'Not assessed'], required: false },
      { id: 'lung_auscultation', label: 'Lung Auscultation Findings', type: 'text', required: true },
      { id: 'medication_adherence', label: 'Medication Adherence', type: 'select', options: ['Good', 'Partial', 'Poor'], required: true },
      { id: 'recommendations', label: 'Recommendations', type: 'text', required: true },
    ],
  },

  // ── NEURO (Neurology) ──────────────────────────────────────────────
  {
    specialty_code: 'NEURO',
    template_name: 'Neurological Examination',
    description: 'Comprehensive neurological examination template',
    schema: [
      { id: 'mental_status', label: 'Mental Status', type: 'select', options: ['Alert and oriented', 'Confused', 'Drowsy', 'Unresponsive'], required: true },
      { id: 'cranial_nerves', label: 'Cranial Nerves', type: 'text', required: true },
      { id: 'motor_strength', label: 'Motor Strength (MRC Scale)', type: 'text', required: true },
      { id: 'sensory_exam', label: 'Sensory Examination', type: 'text', required: false },
      { id: 'reflexes', label: 'Deep Tendon Reflexes', type: 'text', required: true },
      { id: 'coordination', label: 'Coordination & Gait', type: 'text', required: true },
      { id: 'diagnosis', label: 'Clinical Diagnosis', type: 'text', required: true },
    ],
  },
  {
    specialty_code: 'NEURO',
    template_name: 'Stroke Assessment',
    description: 'Acute and follow-up stroke evaluation',
    schema: [
      { id: 'onset_time', label: 'Symptom Onset', type: 'text', required: true },
      { id: 'nihss_score', label: 'NIHSS Score', type: 'number', required: true },
      { id: 'side_affected', label: 'Side Affected', type: 'select', options: ['Left', 'Right', 'Bilateral', 'None'], required: true },
      { id: 'thrombolysis', label: 'Thrombolysis Given', type: 'select', options: ['Yes', 'No'], required: true },
      { id: 'imaging_findings', label: 'Imaging Findings', type: 'text', required: true },
      { id: 'secondary_prevention', label: 'Secondary Prevention Plan', type: 'text', required: true },
    ],
  },

  // ── PULM (Pulmonology) ─────────────────────────────────────────────
  {
    specialty_code: 'PULM',
    template_name: 'COPD Assessment',
    description: 'COPD exacerbation and follow-up evaluation',
    schema: [
      { id: 'gold_stage', label: 'GOLD Stage', type: 'select', options: ['Stage 1 (Mild)', 'Stage 2 (Moderate)', 'Stage 3 (Severe)', 'Stage 4 (Very Severe)'], required: true },
      { id: 'spirometry_fev1', label: 'FEV1 (% Predicted)', type: 'number', required: true },
      { id: 'oxygen_saturation', label: 'O2 Saturation (%)', type: 'number', required: true },
      { id: 'exacerbation_frequency', label: 'Exacerbations (past year)', type: 'number', required: false },
      { id: 'cat_score', label: 'CAT Score', type: 'number', required: false },
      { id: 'inhaler_technique', label: 'Inhaler Technique', type: 'select', options: ['Adequate', 'Needs training', 'Poor'], required: true },
      { id: 'management_plan', label: 'Management Plan', type: 'text', required: true },
    ],
  },
  {
    specialty_code: 'PULM',
    template_name: 'Pneumonia Workup',
    description: 'Community-acquired pneumonia assessment',
    schema: [
      { id: 'curb65_score', label: 'CURB-65 Score', type: 'number', required: true },
      { id: 'temperature', label: 'Temperature (°C)', type: 'number', required: true },
      { id: 'respiratory_rate', label: 'Respiratory Rate (/min)', type: 'number', required: true },
      { id: 'oxygen_needs', label: 'Oxygen Requirement', type: 'select', options: ['None', 'Nasal cannula', 'Face mask', 'Non-rebreather', 'Mechanical ventilation'], required: true },
      { id: 'chest_xray', label: 'Chest X-Ray Findings', type: 'text', required: true },
      { id: 'antibiotics', label: 'Antibiotics Prescribed', type: 'text', required: true },
      { id: 'admission_decision', label: 'Admission Decision', type: 'select', options: ['Home management', 'Inpatient ward', 'ICU admission'], required: true },
    ],
  },

  // ── NEPH (Nephrology) ──────────────────────────────────────────────
  {
    specialty_code: 'NEPH',
    template_name: 'CKD Staging & Assessment',
    description: 'Chronic Kidney Disease staging and management',
    schema: [
      { id: 'ckd_stage', label: 'CKD Stage', type: 'select', options: ['Stage 1', 'Stage 2', 'Stage 3a', 'Stage 3b', 'Stage 4', 'Stage 5'], required: true },
      { id: 'egfr', label: 'eGFR (mL/min/1.73m²)', type: 'number', required: true },
      { id: 'urine_acr', label: 'Urine ACR (mg/g)', type: 'number', required: false },
      { id: 'serum_creatinine', label: 'Serum Creatinine (mg/dL)', type: 'number', required: true },
      { id: 'potassium', label: 'Serum Potassium (mEq/L)', type: 'number', required: true },
      { id: 'bp_control', label: 'Blood Pressure Control', type: 'select', options: ['Optimal', 'Suboptimal', 'Poor'], required: true },
      { id: 'dialysis_plan', label: 'Dialysis Planning', type: 'text', required: false },
    ],
  },

  // ── DERM (Dermatology) ─────────────────────────────────────────────
  {
    specialty_code: 'DERM',
    template_name: 'Eczema / Atopic Dermatitis Assessment',
    description: 'Eczema severity and treatment evaluation',
    schema: [
      { id: 'body_surface_area', label: 'Body Surface Area (%)', type: 'number', required: true },
      { id: 'severity', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe'], required: true },
      { id: 'itching_score', label: 'Itching Score (0-10)', type: 'number', required: true },
      { id: 'sleep_disturbance', label: 'Sleep Disturbance', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'], required: false },
      { id: 'topical_treatment', label: 'Topical Treatment', type: 'text', required: true },
      { id: 'infection_signs', label: 'Signs of Secondary Infection', type: 'select', options: ['None', 'Suspected', 'Confirmed'], required: true },
    ],
  },

  // ── ENT ────────────────────────────────────────────────────────────
  {
    specialty_code: 'ENT',
    template_name: 'Sinusitis Evaluation',
    description: 'Acute and chronic sinusitis assessment',
    schema: [
      { id: 'symptom_duration', label: 'Symptom Duration (days)', type: 'number', required: true },
      { id: 'facial_pain', label: 'Facial Pain/Pressure', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'], required: true },
      { id: 'nasal_discharge', label: 'Nasal Discharge', type: 'select', options: ['Clear', 'Purulent', 'Blood-tinged', 'None'], required: true },
      { id: 'fever', label: 'Fever (°C)', type: 'number', required: false },
      { id: 'endoscopy_findings', label: 'Nasal Endoscopy Findings', type: 'text', required: false },
      { id: 'treatment_plan', label: 'Treatment Plan', type: 'text', required: true },
    ],
  },

  // ── SURG (General Surgery) ─────────────────────────────────────────
  {
    specialty_code: 'SURG',
    template_name: 'Post-Surgical Wound Assessment',
    description: 'Post-operative wound evaluation and care plan',
    schema: [
      { id: 'wound_location', label: 'Wound Location', type: 'text', required: true },
      { id: 'wound_condition', label: 'Wound Condition', type: 'select', options: ['Clean & healing', 'Erythema', 'Serous drainage', 'Purulent drainage', 'Dehiscence', 'Necrotic'], required: true },
      { id: 'surgical_site_infection', label: 'Surgical Site Infection', type: 'select', options: ['No', 'Superficial', 'Deep'], required: true },
      { id: 'pain_score', label: 'Pain Score (0-10)', type: 'number', required: true },
      { id: 'dressing_change', label: 'Dressing Change Frequency', type: 'text', required: false },
      { id: 'antibiotics_needed', label: 'Antibiotics Required', type: 'select', options: ['Yes', 'No'], required: true },
    ],
  },

  // ── GYNEC (Gynecology & Obstetrics) ────────────────────────────────
  {
    specialty_code: 'GYNEC',
    template_name: 'Antenatal Check-up',
    description: 'Routine antenatal care visit template',
    schema: [
      { id: 'gestational_age', label: 'Gestational Age (weeks)', type: 'number', required: true },
      { id: 'fundal_height', label: 'Fundal Height (cm)', type: 'number', required: true },
      { id: 'fetal_heart_rate', label: 'Fetal Heart Rate (bpm)', type: 'number', required: true },
      { id: 'fetal_presentation', label: 'Fetal Presentation', type: 'select', options: ['Cephalic', 'Breech', 'Transverse', 'Not assessed'], required: true },
      { id: 'bp', label: 'Blood Pressure (mmHg)', type: 'text', required: true },
      { id: 'urine_protein', label: 'Urine Protein', type: 'select', options: ['Negative', 'Trace', '+1', '+2', '+3'], required: true },
      { id: 'complications', label: 'Complications / Concerns', type: 'text', required: false },
    ],
  },

  // ── INTERN (Internal Medicine) ─────────────────────────────────────
  {
    specialty_code: 'INTERN',
    template_name: 'Diabetes Management Review',
    description: 'Diabetes mellitus follow-up assessment',
    schema: [
      { id: 'diabetes_type', label: 'Diabetes Type', type: 'select', options: ['Type 1', 'Type 2', 'Gestational', 'Pre-diabetes'], required: true },
      { id: 'hba1c', label: 'HbA1c (%)', type: 'number', required: true },
      { id: 'fasting_glucose', label: 'Fasting Glucose (mg/dL)', type: 'number', required: true },
      { id: 'medication', label: 'Current Medication', type: 'text', required: true },
      { id: 'hypoglycemia_episodes', label: 'Hypoglycemia Episodes (past month)', type: 'number', required: false },
      { id: 'foot_exam', label: 'Foot Examination', type: 'select', options: ['Normal', 'Reduced sensation', 'Ulceration', 'Deformity'], required: true },
      { id: 'diet_adherence', label: 'Diet Adherence', type: 'select', options: ['Good', 'Fair', 'Poor'], required: true },
      { id: 'plan', label: 'Management Plan', type: 'text', required: true },
    ],
  },

  // ── PAIN (Pain Management) ─────────────────────────────────────────
  {
    specialty_code: 'PAIN',
    template_name: 'Chronic Pain Assessment',
    description: 'Chronic pain initial evaluation and follow-up',
    schema: [
      { id: 'pain_location', label: 'Pain Location', type: 'text', required: true },
      { id: 'pain_duration', label: 'Pain Duration (months)', type: 'number', required: true },
      { id: 'pain_severity', label: 'Pain Severity (0-10)', type: 'number', required: true },
      { id: 'pain_type', label: 'Pain Type', type: 'select', options: ['Neuropathic', 'Nociceptive', 'Mixed', 'Visceral'], required: true },
      { id: 'current_medications', label: 'Current Analgesic Medications', type: 'text', required: true },
      { id: 'functional_impact', label: 'Functional Impact', type: 'text', required: true },
      { id: 'interventions', label: 'Interventions Tried', type: 'text', required: false },
      { id: 'plan', label: 'Treatment Plan', type: 'text', required: true },
    ],
  },

  // ── ONCO (Oncology) ────────────────────────────────────────────────
  {
    specialty_code: 'ONCO',
    template_name: 'Chemotherapy Support Note',
    description: 'Chemotherapy cycle assessment and side effect monitoring',
    schema: [
      { id: 'cycle_number', label: 'Cycle Number', type: 'number', required: true },
      { id: 'regimen', label: 'Chemotherapy Regimen', type: 'text', required: true },
      { id: 'ecog_status', label: 'ECOG Performance Status', type: 'select', options: ['0', '1', '2', '3', '4'], required: true },
      { id: 'side_effects', label: 'Side Effects', type: 'text', required: true },
      { id: 'neutrophil_count', label: 'Neutrophil Count (cells/μL)', type: 'number', required: true },
      { id: 'hemoglobin', label: 'Hemoglobin (g/dL)', type: 'number', required: true },
      { id: 'platelet_count', label: 'Platelet Count (cells/μL)', type: 'number', required: true },
      { id: 'dose_modification', label: 'Dose Modification', type: 'select', options: ['None', 'Reduced', 'Delayed', 'Discontinued'], required: true },
      { id: 'next_cycle_date', label: 'Next Cycle Date', type: 'text', required: true },
    ],
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const t of TEMPLATES) {
    const existing = await prisma.specialty_templates.findFirst({
      where: {
        specialty_code: t.specialty_code,
        template_name: t.template_name,
      },
    });

    if (existing) {
      console.log(`  SKIP  [${t.specialty_code}] ${t.template_name}`);
      skipped++;
      continue;
    }

    await prisma.specialty_templates.create({
      data: {
        specialty_code: t.specialty_code,
        template_name: t.template_name,
        description: t.description,
        schema: t.schema as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`  OK    [${t.specialty_code}] ${t.template_name}`);
    created++;
  }

  console.log(`\n✅ Done. ${created} created, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
