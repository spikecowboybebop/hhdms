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

// ── Types ──────────────────────────────────────────────────

export interface SonologistProfile {
  user_id: string;
  license_number?: string;
  qualification?: string;
  years_of_experience?: number;
  consultation_fee?: number;
  equipment_ids?: string;
  usg_specializations?: string;
  is_available: boolean;
  user: {
    email: string;
    firstNameEn: string;
    lastNameEn: string;
    firstNameBn?: string;
    lastNameBn?: string;
  };
}

export interface SonologistStudy {
  id: string;
  sonologist_id: string;
  patient_id: string;
  modality: string;
  body_part?: string;
  study_date: string;
  dicom_series_uids?: string;
  storage_url?: string;
  findings?: string;
  impression?: string;
  is_abnormal: boolean;
  status: string;
  patient: {
    id: string;
    mrn: string;
    first_name_en: string;
    last_name_en: string;
    sex: string;
    date_of_birth?: string;
  };
  reports: SonologistReport[];
}

export interface SonologistReport {
  id: string;
  study_id: string;
  sonologist_id: string;
  patient_id: string;
  findings: string;
  impression?: string;
  annotated_images?: string;
  digital_signature_url?: string;
  report_date: string;
  patient?: {
    mrn: string;
    first_name_en: string;
    last_name_en: string;
  };
  study?: {
    id: string;
    body_part?: string;
    modality: string;
  };
}

export interface SonologistDashboardStats {
  total_studies: number;
  total_reports: number;
  recent_studies: SonologistStudy[];
}

export interface CreateUsgReportPayload {
  patient_id: string;
  body_part: string;
  findings: string;
  impression?: string;
  annotated_images?: string;
  storage_url?: string;
  dicom_series_uids?: string;
}

// ── API Functions ──────────────────────────────────────────

export const sonologistApi = {
  getProfile: () => apiFetch<SonologistProfile>('/sonologist/profile'),

  getDashboardStats: () => apiFetch<SonologistDashboardStats>('/sonologist/dashboard'),

  getMyPatients: () => apiFetch<SonologistStudy['patient'][]>('/sonologist/patients'),

  getMyStudies: () => apiFetch<SonologistStudy[]>('/sonologist/studies'),

  getStudy: (id: string) => apiFetch<SonologistStudy>(`/sonologist/studies/${id}`),

  createStudy: (data: CreateUsgReportPayload) =>
    apiFetch<SonologistStudy>('/sonologist/studies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyReports: () => apiFetch<SonologistReport[]>('/sonologist/reports'),
};
