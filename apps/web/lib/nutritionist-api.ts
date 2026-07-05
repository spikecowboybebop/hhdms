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

export interface DashboardMetrics {
  active_plans: number;
  upcoming_follow_ups: number;
  food_items: number;
  templates: number;
}

export interface PatientSummary {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
  date_of_birth?: string;
  sex?: string;
  phone_number?: string;
}

export interface MedicalHistory {
  patient: {
    id: string;
    mrn: string;
    first_name_en: string;
    last_name_en: string;
    first_name_bn?: string;
    last_name_bn?: string;
    date_of_birth?: string;
    sex?: string;
    blood_group?: string;
    known_allergies?: string;
    current_medications?: string;
    past_medical_history?: string;
    family_history?: string;
    height_cm?: number;
    weight_kg?: number;
  };
  diagnoses: {
    id: string;
    icd10_code: string;
    description: string;
    preliminary_diagnosis: string;
    is_primary: boolean;
    diagnosed_at: string;
    doctor: string | null;
  }[];
  lab_results: {
    kidney_function: LabResult[];
    glucose: LabResult[];
    lipids: LabResult[];
  };
  specialist_notes: SpecialistNote[];
}

export interface LabResult {
  test_name: string;
  test_code: string;
  result: string | null;
  normal_range: string | null;
  unit: string | null;
  resulted_at: string | null;
}

export interface SpecialistNote {
  id: string;
  specialty_code: string;
  referral_reason: string;
  clinical_summary: string | null;
  response_notes: string | null;
  status: string;
  referring_doctor: string | null;
  specialist: string | null;
  created_at: string;
}

export interface AnthropometricRecord {
  id: string;
  patient_id: string;
  recorded_by: string;
  height_cm?: number;
  weight_kg?: number;
  waist_cm?: number;
  hip_cm?: number;
  bmi?: number;
  bmi_category?: string;
  ideal_body_weight?: number;
  caloric_needs?: { basal: number; total: number } | null;
  notes?: string;
  recorded_at: string;
}

export interface CreateAnthropometricPayload {
  patient_id: string;
  height_cm?: number;
  weight_kg?: number;
  waist_cm?: number;
  hip_cm?: number;
  notes?: string;
}

export interface DietTemplate {
  id: string;
  condition_name: string;
  total_calories: number;
  description?: string;
}

export interface DietTemplateFull extends DietTemplate {
  meals: DietTemplateMeal[];
}

export interface DietTemplateMeal {
  id: string;
  template_id: string;
  meal_slot: string;
  calories?: number;
  preparation_guidance?: string;
  foods_json: string;
  sort_order: number;
}

export interface DietPlan {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  title: string;
  condition_name?: string;
  total_calories?: number;
  language: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  meals: DietPlanMeal[];
  patient?: { id: string; mrn: string; first_name_en: string; last_name_en: string };
}

export interface DietPlanMeal {
  id: string;
  plan_id: string;
  meal_slot: string;
  calories?: number;
  preparation_guidence?: string;
  foods_json: string;
  sort_order: number;
}

export interface CreateDietPlanPayload {
  patient_id: string;
  title?: string;
  condition_name?: string;
  language?: string;
  total_calories?: number;
  notes?: string;
  meals?: {
    meal_slot: string;
    calories?: number;
    preparation_guidance?: string;
    foods: { name: string; quantity: string; grams?: number }[];
  }[];
}

export interface FoodItem {
  id: string;
  name_en: string;
  name_bn?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  is_active: boolean;
}

export interface NutrientBreakdown {
  summary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
  };
  breakdown: {
    food_id: string;
    name_en: string;
    name_bn: string | null;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }[];
}

export interface FollowUp {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  plan_id?: string;
  interval: string;
  follow_up_at?: string;
  reminder_channel: string;
  status: string;
  notes?: string;
  created_at: string;
  patient?: { id: string; mrn: string; first_name_en: string; last_name_en: string };
}

export interface CreateFollowUpPayload {
  patient_id: string;
  plan_id?: string;
  interval: 'TWO_WEEKS' | 'ONE_MONTH' | 'THREE_MONTHS';
  follow_up_at?: string;
  reminder_channel?: string;
  notes?: string;
}

export interface AdherenceLog {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  plan_id?: string;
  follow_up_id?: string;
  adherence_score: number;
  weight_kg?: number;
  challenges?: string;
  modifications?: string;
  logged_at: string;
  patient?: { id: string; mrn: string; first_name_en: string; last_name_en: string };
}

export interface CreateAdherencePayload {
  patient_id: string;
  follow_up_id?: string;
  adherence_score: number;
  challenges?: string;
  modifications?: string;
  weight_kg?: number;
}

export interface ConsultationBooking {
  consultation_id: string;
  session_id: string;
  ticket_no: string;
  consultation_type: string;
  scheduled_at: string;
  nutritionist_id: string;
  patient_id: string;
  status: string;
  notes?: string;
}

export interface BookConsultationPayload {
  patient_id: string;
  consultation_type: 'HOME_VISIT' | 'TELECONSULTATION';
  preferred_at?: string;
  area?: string;
  notes?: string;
}

export interface AvailabilityCheck {
  patient_area: string;
  available_nutritionists: number;
  consultation_type: string;
  next_available_slot: string;
}

export interface EducationMaterial {
  id: string;
  patient_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  uploaded_at: string;
}

export interface CreateEducationMaterialPayload {
  patient_id: string;
  uploaded_by: string;
  title: string;
  title_bn?: string;
  material_type: string;
  language?: string;
  file_url: string;
  mime_type?: string;
  shared_via_portal?: boolean;
  shared_via_whatsapp?: boolean;
}

// ---- API Functions ----

export const nutritionistApi = {
  // Food Items
  getFoodItems: () => apiFetch<FoodItem[]>('/nutritionist/food-items'),

  // Dashboard
  getDashboard: () => apiFetch<DashboardMetrics>('/nutritionist/dashboard'),
  getPatients: () => apiFetch<PatientSummary[]>('/nutritionist/patients'),

  // Medical History (NU-002)
  getPatientMedicalHistory: (patientId: string) =>
    apiFetch<MedicalHistory>(`/nutritionist/patient/${patientId}/history`),

  // Consultation Booking (NU-001)
  checkAvailability: (patientId: string, consultationType: string) =>
    apiFetch<AvailabilityCheck>(`/nutritionist/consultation/check-availability`, {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId, consultation_type: consultationType }),
    }),
  bookConsultation: (payload: BookConsultationPayload) =>
    apiFetch<ConsultationBooking>('/nutritionist/consultation/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Anthropometrics (NU-003)
  recordAnthropometrics: (payload: CreateAnthropometricPayload) =>
    apiFetch<AnthropometricRecord>('/nutritionist/metrics', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAnthropometricHistory: (patientId: string) =>
    apiFetch<AnthropometricRecord[]>(`/nutritionist/metrics/${patientId}`),

  // Diet Plans (NU-004)
  createDietPlan: (payload: CreateDietPlanPayload) =>
    apiFetch<DietPlan>('/nutritionist/diet-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDietPlans: (patientId?: string) =>
    apiFetch<DietPlan[]>(`/nutritionist/diet-plans${patientId ? `?patientId=${patientId}` : ''}`),
  getDietPlan: (planId: string) =>
    apiFetch<DietPlan>(`/nutritionist/diet-plan/${planId}`),
  getDietPlanPdfUrl: (planId: string) =>
    `${API_BASE}/nutritionist/diet-plan/${planId}/pdf`,
  downloadDietPlanPdf: async (planId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/nutritionist/diet-plan/${planId}/pdf`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diet-plan-${planId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Condition-Specific Templates (NU-005)
  getTemplates: () => apiFetch<DietTemplate[]>('/nutritionist/templates'),
  getTemplateById: (templateId: string) =>
    apiFetch<DietTemplateFull>(`/nutritionist/templates/${templateId}`),

  // Follow-ups (NU-007)
  scheduleFollowUp: (payload: CreateFollowUpPayload) =>
    apiFetch<FollowUp>('/nutritionist/follow-up', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getFollowUps: () => apiFetch<FollowUp[]>('/nutritionist/follow-ups'),

  // Adherence (NU-008)
  logAdherence: (payload: CreateAdherencePayload) =>
    apiFetch<AdherenceLog>('/nutritionist/adherence', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdherenceLogs: (patientId?: string) =>
    apiFetch<AdherenceLog[]>(`/nutritionist/adherence${patientId ? `?patientId=${patientId}` : ''}`),

  // Nutrient Calculator (NU-009)
  calculateNutrients: (foods: { food_item_id: string; grams: number }[]) =>
    apiFetch<NutrientBreakdown>('/nutritionist/calculate-nutrients', {
      method: 'POST',
      body: JSON.stringify({ foods }),
    }),

  // Education Materials (NU-010)
  createEducationMaterial: (payload: CreateEducationMaterialPayload) =>
    apiFetch<EducationMaterial>('/nutritionist/education-materials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEducationMaterials: (patientId: string) =>
    apiFetch<EducationMaterial[]>(`/nutritionist/education-materials/${patientId}`),
};
