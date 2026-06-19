// MBBS Doctor Module — API Client
// Base URL from environment variable
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

function getAuthHeaders(): Record<string, string> {
  const session = typeof window !== 'undefined'
    ? window.localStorage.getItem('hhdms.session')
    : null;
  const token = session ? (() => { try { return JSON.parse(session).token; } catch { return ''; } })() : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }
  return res.json();
}

// ---- Types ----

export interface Patient {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
  first_name_bn?: string;
  last_name_bn?: string;
  date_of_birth?: string;
  sex: string;
  blood_group?: string;
  phone_number?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  district?: string;
  emergency_contact?: string;
  known_allergies?: string;
  current_medications?: string;
  past_medical_history?: string;
  family_history?: string;
  height_cm?: number;
  weight_kg?: number;
  has_emergency_flag: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PatientProfile {
  patient: Patient;
  vitals: VitalSigns[];
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  referrals: Referral[];
  emergency_flags: EmergencyFlag[];
  referral_chain: ReferralChainEvent[];
}

export interface VitalSigns {
  id: string;
  patient_id: string;
  doctor_id: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  pulse_bpm?: number;
  temperature_c?: number;
  spo2_pct?: number;
  respiratory_rate?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  notes?: string;
  is_abnormal: boolean;
  recorded_at: string;
}

export interface CreateVitalsPayload {
  systolic_bp?: number;
  diastolic_bp?: number;
  pulse_bpm?: number;
  temperature_c?: number;
  spo2_pct?: number;
  respiratory_rate?: number;
  weight_kg?: number;
  height_cm?: number;
  notes?: string;
}

export interface Icd10Code {
  code: string;
  description: string;
  category?: string;
  subcategory?: string;
}

export interface Diagnosis {
  id: string;
  patient_id: string;
  doctor_id: string;
  icd10_code: string;
  chief_complaint?: string;
  history_of_present_illness?: string;
  review_of_systems?: string;
  examination_findings?: string;
  preliminary_diagnosis: string;
  is_primary: boolean;
  diagnosed_at: string;
  icd10?: Icd10Code;
}

export interface CreateDiagnosisPayload {
  icd10_code: string;
  chief_complaint?: string;
  history_of_present_illness?: string;
  review_of_systems?: string;
  examination_findings?: string;
  preliminary_diagnosis: string;
  is_primary?: boolean;
}

export interface TestCatalogItem {
  id: string;
  test_name: string;
  test_code: string;
  category: string;
  description?: string;
  normal_range?: string;
  unit?: string;
  turnaround_hours?: number;
  is_active: boolean;
}

export interface TestOrder {
  id: string;
  patient_id: string;
  doctor_id: string;
  test_id: string;
  status: string;
  clinical_notes?: string;
  ordered_at: string;
  completed_at?: string;
  test?: TestCatalogItem;
  results?: TestResult[];
}

export interface TestResult {
  id: string;
  order_id: string;
  result_value: string;
  result_numeric?: number;
  is_critical: boolean;
  is_abnormal: boolean;
  notes?: string;
  lab_technician?: string;
  resulted_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis_id?: string;
  notes?: string;
  digital_signature_url?: string;
  status: string;
  issued_at: string;
  expires_at?: string;
  medications: PrescriptionMedication[];
}

export interface PrescriptionMedication {
  id: string;
  prescription_id: string;
  generic_name: string;
  brand_name?: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  route: string;
  special_instructions?: string;
}

export interface CreatePrescriptionPayload {
  diagnosis_id?: string;
  notes?: string;
  medications: {
    generic_name: string;
    brand_name?: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    route: string;
    special_instructions?: string;
  }[];
}

export interface Referral {
  id: string;
  patient_id: string;
  referring_doctor_id: string;
  specialty_code: string;
  referral_reason: string;
  clinical_summary?: string;
  is_emergency: boolean;
  status: string;
  specialist_id?: string;
  response_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateReferralPayload {
  specialty_code: string;
  referral_reason: string;
  clinical_summary?: string;
  is_emergency?: boolean;
}

export interface EmergencyFlag {
  id: string;
  patient_id: string;
  flagged_by: string;
  reason?: string;
  is_active: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface ReferralChainEvent {
  id: string;
  patient_id: string;
  step_type: string;
  step_id: string;
  step_label: string;
  actor_role?: string;
  actor_name?: string;
  notes?: string;
  created_at: string;
}

// ---- API Functions ----

export const mbbsApi = {
  // Patients
  getMyPatients: () => apiFetch<Patient[]>('/mbbs/patients'),
  getPatientProfile: (id: string) => apiFetch<PatientProfile>(`/mbbs/patients/${id}`),

  // Vital Signs
  recordVitals: (patientId: string, data: CreateVitalsPayload) =>
    apiFetch<VitalSigns>(`/mbbs/patients/${patientId}/vitals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getVitalsHistory: (patientId: string) =>
    apiFetch<VitalSigns[]>(`/mbbs/patients/${patientId}/vitals`),

  // ICD-10
  searchIcd10: (query: string) => apiFetch<Icd10Code[]>(`/mbbs/icd10/search?q=${encodeURIComponent(query)}`),

  // Diagnoses
  createDiagnosis: (patientId: string, data: CreateDiagnosisPayload) =>
    apiFetch<Diagnosis>(`/mbbs/patients/${patientId}/diagnoses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDiagnosisHistory: (patientId: string) =>
    apiFetch<Diagnosis[]>(`/mbbs/patients/${patientId}/diagnoses`),

  // Tests
  getTestCatalog: (category?: string) =>
    apiFetch<TestCatalogItem[]>(`/mbbs/tests/catalog${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  orderTests: (patientId: string, testIds: string[], clinicalNotes?: string) =>
    apiFetch<any>(`/mbbs/patients/${patientId}/test-orders`, {
      method: 'POST',
      body: JSON.stringify({ test_ids: testIds, clinical_notes: clinicalNotes }),
    }),
  getTestOrders: (patientId: string) => apiFetch<TestOrder[]>(`/mbbs/patients/${patientId}/test-orders`),
  getTestResults: (patientId: string) => apiFetch<any[]>(`/mbbs/patients/${patientId}/test-results`),

  // Referrals
  createReferral: (patientId: string, data: CreateReferralPayload) =>
    apiFetch<Referral>(`/mbbs/patients/${patientId}/referrals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReferralHistory: (patientId: string) => apiFetch<Referral[]>(`/mbbs/patients/${patientId}/referrals`),

  // Referral Chain
  getReferralChain: (patientId: string) => apiFetch<ReferralChainEvent[]>(`/mbbs/patients/${patientId}/referral-chain`),

  // Prescriptions
  createPrescription: (patientId: string, data: CreatePrescriptionPayload) =>
    apiFetch<any>(`/mbbs/patients/${patientId}/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPrescriptionHistory: (patientId: string) => apiFetch<Prescription[]>(`/mbbs/patients/${patientId}/prescriptions`),

  // Emergency
  setEmergencyFlag: (patientId: string, reason?: string) =>
    apiFetch<any>(`/mbbs/patients/${patientId}/emergency-flag`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getEmergencyFlags: (patientId: string) => apiFetch<EmergencyFlag[]>(`/mbbs/patients/${patientId}/emergency-flags`),

  // Schedule
  getSchedule: () => apiFetch<any[]>('/mbbs/schedule'),

  // Doctor Profile
  getDoctorProfile: () => apiFetch<{
    first_name_en: string;
    last_name_en: string;
    bmdc_registration?: string;
    specialization?: string;
    qualification?: string;
    signature_url?: string | null;
  }>('/mbbs/doctor-profile'),

  // Signature
  getSignature: () => apiFetch<{ signature_url: string | null }>('/mbbs/signature'),
  updateSignature: (signatureUrl: string) =>
    apiFetch<any>('/mbbs/signature', {
      method: 'PATCH',
      body: JSON.stringify({ signature_url: signatureUrl }),
    }),

  // Differential Diagnosis (stub)
  getDifferentialDiagnosis: (patientId: string) =>
    apiFetch<any>(`/mbbs/patients/${patientId}/differential-diagnosis`),
};
