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

export interface RegisterPatientPayload {
  full_name_en: string;
  full_name_bn: string;
  date_of_birth: string;
  sex: string;
  blood_group?: string;
  primary_phone: string;
  alternative_phone?: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  division: string;
  district: string;
  thana: string;
  address_detail: string;
  agent_notes?: string;
  has_emergency_flag?: boolean;
  booked_by?: string;
}

export interface RegisterPatientResult {
  id: string;
  mrn: string;
  message: string;
}

export interface PastPatient {
  id: string;
  mrn: string;
  full_name_en: string;
  full_name_bn: string;
  date_of_birth: string;
  sex: 'Male' | 'Female' | 'Child';
  blood_group: string;
  primary_phone: string;
  address_line1: string;
  address_line2: string;
  district: string;
  emergency_contact: string;
}

export interface PatientProfile {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
  first_name_bn?: string;
  last_name_bn?: string;
  sex: string;
  phone_number?: string;
  district?: string;
  date_of_birth?: string;
  blood_group?: string;
  address_line1?: string;
  address_line2?: string;
  has_emergency_flag: boolean;
}

export interface ServiceTicketPayload {
  service_type: string;
  scheduled_date?: string;
  scheduled_time_slot?: string;
  price: number;
  assigned_provider_id?: string;
  additional_meta?: Record<string, unknown>;
}

export interface CreateBookingSessionPayload {
  patient_id: string;
  booked_by?: string;
  agent_id?: string;
  services: ServiceTicketPayload[];
}

export interface TicketResult {
  id: string;
  ticket_no: string;
  service_type: string;
  price: number | null;
  status: string;
}

export interface BookingSessionResult {
  session_id: string;
  total_amount: number;
  status: string;
  tickets: TicketResult[];
}

export interface AvailableProvider {
  id: string;
  name: string;
  service_type: string;
  distance?: string;
  rating?: number;
  is_available: boolean;
}

export const callCenterApi = {
  registerPatient: (data: RegisterPatientPayload) =>
    apiFetch<RegisterPatientResult>('/patients/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  fetchPastPatients: (bookedBy: string) =>
    apiFetch<PastPatient[]>(`/patients?booked_by=${encodeURIComponent(bookedBy)}`),

  getPatient: (id: string) =>
    apiFetch<PatientProfile>(`/patients/${id}`),

  createBookingSession: (data: CreateBookingSessionPayload) =>
    apiFetch<BookingSessionResult>('/bookings/create-session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAvailableProviders: (params: { service_type: string; date: string; district: string }) =>
    apiFetch<AvailableProvider[]>(`/providers/available?service_type=${encodeURIComponent(params.service_type)}&date=${encodeURIComponent(params.date)}&district=${encodeURIComponent(params.district)}`),
};
