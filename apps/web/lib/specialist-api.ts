// Specialist Module — API Client

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

function getAuthHeaders(): Record<string, string> {
  const session =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('hhdms.session')
      : null;
  const token = session
    ? (() => {
        try {
          return JSON.parse(session).token;
        } catch {
          return '';
        }
      })()
    : '';
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

// ── Types ──────────────────────────────────────────────────────────

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required?: boolean;
}

export interface SpecialtyTemplate {
  id: string;
  template_name: string;
  description?: string;
  schema: TemplateField[];
}

export interface SpecialistReportPayload {
  referralId: string;
  templateId: string;
  formData: Record<string, unknown>;
}

export interface SpecialistReport {
  id: string;
  referral_id: string;
  template_id: string;
  form_data: Record<string, unknown>;
  created_at: string;
}

// ── Prescription Types ────────────────────────────────────────────

export interface TaperStep {
  days_range: string;
  dosage: string;
}

export interface SpecialistMedicationEntry {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  special_instructions?: string;
  conditional_flag: boolean;
  taper_details?: TaperStep[];
}

export interface CreateSpecialistPrescriptionPayload {
  referralId: string;
  medications: SpecialistMedicationEntry[];
}

export interface SpecialistPrescriptionMedication {
  id: string;
  prescription_id: string;
  generic_name: string;
  brand_name?: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  route: string;
  special_instructions?: string;
  conditional_flag: boolean;
  taper_details?: { schedule: TaperStep[] } | null;
}

export interface SpecialistPrescription {
  id: string;
  patient_id: string;
  provider_type: string;
  specialist_id: string;
  notes?: string;
  digital_signature_url?: string;
  status: string;
  issued_at: string;
  medications: SpecialistPrescriptionMedication[];
  doctor?: {
    user: { firstNameEn: string; lastNameEn: string } | null;
  } | null;
  specialist?: {
    user: { firstNameEn: string; lastNameEn: string } | null;
  } | null;
}

export interface CreatePrescriptionResponse {
  prescription: SpecialistPrescription;
  interaction_warnings_found: boolean;
  warnings: Array<{
    drug_a: string;
    drug_b: string;
    severity: string;
    description: string;
  }>;
  digital_signature_applied: boolean;
}

// ── Test Order Types ───────────────────────────────────────────────

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

export interface TestOrderResult {
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

export interface DiagnosticTestOrder {
  id: string;
  patient_id: string;
  test_id: string;
  status: string;
  clinical_notes?: string;
  ordered_at: string;
  completed_at?: string;
  provider_type: string;
  doctor_id?: string;
  specialist_id?: string;
  test?: TestCatalogItem;
  results?: TestOrderResult[];
}

export interface OrderAdditionalTestsPayload {
  referralId: string;
  test_ids: string[];
  clinical_notes?: string;
}

export interface OrderAdditionalTestsResponse {
  orders: DiagnosticTestOrder[];
  test_catalog: TestCatalogItem[];
}

// ── Referral & Shared Types ────────────────────────────────────────

export interface IncomingReferral {
  id: string;
  patient_id: string;
  specialty_code: string;
  status: 'PENDING' | 'COMPLETED';
  created_at: string;
  patient: {
    mrn: string;
    first_name_en: string;
    last_name_en: string;
    sex: string;
    known_allergies: string | null;
    vital_signs?: Array<{
      blood_pressure_systolic: number;
      blood_pressure_diastolic: number;
      pulse: number;
      temperature: number;
      spo2: number;
    }>;
  };
}

export interface DicomStudy {
  id: string;
  patient_id: string;
  file_path: string;
  modality: string;
  body_part?: string;
  study_date?: string;
  description?: string;
  created_at: string;
  patient: {
    id: string;
    mrn: string;
    first_name_en: string;
    last_name_en: string;
  };
}

export interface CompleteConsultationPayload {
  referralId: string;
  responseNotes: string;
}

export interface CompleteConsultationResponse {
  success: boolean;
  message: string;
  referral: Record<string, unknown>;
}

export interface SpecialistReportItem {
  id: string;
  patient: string;
  mrn: string;
  type: string;
  status: 'SIGNED' | 'ARCHIVED';
  date: string;
  hash: string;
  findings: string;
}

export interface MedicationRoute {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
}

// ── API methods ────────────────────────────────────────────────────

export const specialistApi = {
  getRoutes: () =>
    apiFetch<MedicationRoute[]>('/api/specialist/routes'),

  getTemplates: (specialtyCode: string) =>
    apiFetch<SpecialtyTemplate[]>(
      `/api/specialist/templates?specialtyCode=${encodeURIComponent(specialtyCode)}`,
    ),

  getTemplate: (id: string) =>
    apiFetch<SpecialtyTemplate>(`/api/specialist/templates/${id}`),

  createReport: (data: SpecialistReportPayload) =>
    apiFetch<SpecialistReport>(`/api/specialist/reports`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createPrescription: (data: CreateSpecialistPrescriptionPayload) =>
    apiFetch<CreatePrescriptionResponse>(`/api/specialist/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPrescriptions: (referralId: string) =>
    apiFetch<SpecialistPrescription[]>(
      `/api/specialist/prescriptions?referralId=${encodeURIComponent(referralId)}`,
    ),

  getTestCatalog: (category?: string) =>
    apiFetch<TestCatalogItem[]>(
      `/api/specialist/tests/catalog${category ? `?category=${encodeURIComponent(category)}` : ''}`,
    ),

  orderTests: (data: OrderAdditionalTestsPayload) =>
    apiFetch<OrderAdditionalTestsResponse>(`/api/specialist/tests/order`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTestOrders: (referralId: string) =>
    apiFetch<DiagnosticTestOrder[]>(
      `/api/specialist/tests/orders/${encodeURIComponent(referralId)}`,
    ),

  getReferrals: () =>
    apiFetch<IncomingReferral[]>('/api/specialist/referrals'),

  getReports: () =>
    apiFetch<SpecialistReportItem[]>('/api/specialist/reports'),

  getDicomStudies: (patientId?: string) =>
    apiFetch<DicomStudy[]>(
      `/api/specialist/dicom${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''}`,
    ),

  getPatientHistory: (referralId: string) =>
    apiFetch<Record<string, unknown>>(
      `/api/specialist/referral/${encodeURIComponent(referralId)}/patient-history`,
    ),

  getSpecialistsBySpecialty: (specialtyCode: string) =>
    apiFetch<Array<{
      user_id: string;
      first_name_en: string;
      last_name_en: string;
      email: string;
      specialty_code: string;
      qualification: string;
      years_of_experience: number;
      consultation_fee: number;
      is_available: boolean;
    }>>(
      `/api/specialist/by-specialty?specialtyCode=${encodeURIComponent(specialtyCode)}`,
    ),

  completeConsultation: (data: CompleteConsultationPayload) =>
    apiFetch<CompleteConsultationResponse>('/api/specialist/consultation/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
