// Caregiver Module — API Client

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

export interface CaregiverProfile {
  user_id: string;
  gender?: string;
  experience_years?: number;
  specializations?: string;
  verification_status: string;
  training_certs?: string;
  rating?: number;
  phone_number?: string;
  address?: string;
  is_available: boolean;
  user: {
    email: string;
    firstNameEn: string;
    lastNameEn: string;
    firstNameBn?: string;
    lastNameBn?: string;
  };
  patient_assignments: {
    patient: CaregiverPatient;
  }[];
}

export interface CaregiverPatient {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
  sex: string;
  blood_group?: string;
  phone_number?: string;
  address_line1?: string;
  district?: string;
  service_type?: string;
  patient_type?: string;
}

export interface ActivityLog {
  id: string;
  caregiver_id: string;
  patient_id: string;
  shift_date: string;
  activity_type: string;
  notes?: string;
  created_at: string;
  patient?: { id: string; first_name_en: string; last_name_en: string };
}

export interface ConditionReport {
  id: string;
  caregiver_id: string;
  patient_id: string;
  report_type: string;
  description: string;
  severity: string;
  alert_sent_to_nurse: boolean;
  alert_sent_to_doctor: boolean;
  created_at: string;
  patient?: { id: string; first_name_en: string; last_name_en: string };
}

export interface CreateActivityLogPayload {
  patient_id: string;
  activity_type: string;
  notes?: string;
}

export interface CreateConditionReportPayload {
  patient_id: string;
  report_type: string;
  description: string;
  severity?: string;
}

// ---- API Functions ----

export const caregiverApi = {
  getProfile: () => apiFetch<CaregiverProfile>('/caregiver/profile'),

  getMyPatients: () => apiFetch<CaregiverPatient[]>('/caregiver/patients'),

  createActivityLog: (data: CreateActivityLogPayload) =>
    apiFetch<ActivityLog>('/caregiver/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getActivityLogs: (patientId?: string) =>
    apiFetch<ActivityLog[]>(`/caregiver/activities${patientId ? `?patient_id=${patientId}` : ''}`),

  createConditionReport: (data: CreateConditionReportPayload) =>
    apiFetch<ConditionReport>('/caregiver/condition-reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getConditionReports: (patientId?: string) =>
    apiFetch<ConditionReport[]>(`/caregiver/condition-reports${patientId ? `?patient_id=${patientId}` : ''}`),

  sendAlert: (reportId: string, target: 'nurse' | 'doctor') =>
    apiFetch<{ message: string; report_id: string; target: string }>(
      `/caregiver/condition-reports/${reportId}/alert/${target}`,
      { method: 'POST' },
    ),
};
