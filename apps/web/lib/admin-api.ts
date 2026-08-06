// Admin Module — API Client

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

// ── Types ──────────────────────────────────────────────────────

export type StaffRole =
  | 'MBBS_DOCTOR'
  | 'SPECIALIST'
  | 'NURSE'
  | 'CAREGIVER'
  | 'NUTRITIONIST';

export interface StaffRoleOption {
  id: number;
  name: StaffRole;
}

export interface CreateStaffPayload {
  email: string;
  phone_number: string;
  first_name_en: string;
  last_name_en: string;
  first_name_bn?: string;
  last_name_bn?: string;
  nid?: string;
  photo_url?: string;
  role: StaffRole;
  license_number?: string;
  bmdc_registration?: string;
  specialization?: string;
  qualification?: string;
  years_of_experience?: number;
  consultation_fee?: number;
  signature_url?: string;
  district?: string;
  thana?: string;
  service_area?: string;
  specialty_code?: string;
  sub_specialties?: string;
  nurse_type?: string;
  bnmc_registration?: string;
  skills?: string;
  shift_preference?: string;
  gps_device_id?: string;
  gender?: string;
  specializations?: string;
  training_certs?: string;
  address?: string;
  qualifications?: string;
}

export type UpdateStaffPayload = Partial<CreateStaffPayload> & {
  is_available?: boolean;
};

export interface StaffRecord {
  id: string;
  email: string;
  phone_number: string;
  first_name_en: string;
  last_name_en: string;
  nid: string | null;
  photo_url: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  role: StaffRole;
  created_at: string | null;
  is_available: boolean | null;
  profile: Record<string, unknown> | null;
}

export interface StaffListResult {
  staff: StaffRecord[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface StaffListParams {
  role?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStaffResult {
  id: string;
  email: string;
  role: StaffRole;
  message: string;
  temporary_password: string;
  require_password_change: boolean;
}

export interface ResetPasswordResult {
  id: string;
  message: string;
  temporary_password: string;
  require_password_change: boolean;
}

export type AuditAction =
  | "CREATE_STAFF"
  | "UPDATE_STAFF"
  | "SUSPEND_STAFF"
  | "ACTIVATE_STAFF"
  | "RESET_PASSWORD"
  | "REASSIGN_TICKET"
  | "UPDATE_PAYMENT"
  | "INVOICE_GENERATED";

export interface AuditLogRecord {
  id: string;
  actorUserId: string;
  actorRole: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  prevHash: string;
  contentHash: string;
  createdAt: string;
}

export interface AuditLogListResult {
  logs: AuditLogRecord[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface AuditLogListParams {
  action?: string;
  entityType?: string;
  actorUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminTicketProvider {
  id: string;
  name: string;
  title: string;
}

export interface AdminTicketPatient {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
  phone_number: string | null;
}

export interface AdminTicket {
  id: string;
  ticket_no: string;
  session_id: string;
  service_type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  price: string | number | null;
  assigned_provider_id: string | null;
  created_at: string | null;
  patient: AdminTicketPatient;
  provider: AdminTicketProvider | null;
}

export interface AdminTicketListResult {
  tickets: AdminTicket[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface AdminTicketListParams {
  status?: string;
  serviceType?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminProvider {
  id: string;
  first_name_en: string;
  last_name_en: string;
  email: string;
  phone_number: string | null;
  role: string;
  is_available: boolean;
  title: string;
}

export interface AdminProviderListResult {
  providers: AdminProvider[];
}

export interface TicketReassignResult {
  id: string;
  ticket_no: string;
  assigned_provider_id: string;
  status: string;
  message: string;
}

export interface TicketDetailPatient {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
  phone_number: string | null;
  sex: string | null;
  district: string | null;
}

export interface TicketDetailProvider {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone_number: string | null;
}

export interface TicketDetailPayment {
  id: string;
  status: string;
  amount: number;
  service_type: string;
  completed_at: string | null;
  created_at: string | null;
}

export interface TicketAuditRow {
  id: string;
  action: string;
  actor_name: string | null;
  actor_role: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface TicketDetail {
  ticket: {
    id: string;
    ticket_no: string;
    service_type: string;
    status: string;
    scheduled_date: string | null;
    scheduled_time_slot: string | null;
    price: number | null;
    created_at: string | null;
  };
  patient: TicketDetailPatient;
  provider: TicketDetailProvider | null;
  session: {
    id: string;
    total_amount: number | null;
    created_at: string | null;
    booked_by: string | null;
  };
  payment: TicketDetailPayment | null;
  audit: TicketAuditRow[];
}

export interface AuditVerifyResult {
  valid: boolean;
  checked: number;
  broken_at_index: number | null;
  broken_at_id: string | null;
  reason?: string;
}

export interface DashboardKpis {
  bookingsToday: number;
  pendingTickets: number;
  assignedTickets: number;
  totalTickets: number;
  revenueTotal: number;
  revenueMonth: number;
  activeProviders: number;
}

export interface RevenueDay {
  day: string;
  value: number;
}

export interface ServiceMixRow {
  service_type: string;
  count: number;
  revenue: number;
}

export interface RecentTicketRow {
  id: string;
  ticket_no: string;
  service_type: string;
  status: string;
  price: number | null;
  scheduled_date: string | null;
  patient: { full_name: string; mrn: string } | null;
}

export interface OnDutyStaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_available: boolean;
  busy: boolean;
}

export interface DashboardStats {
  kpis: DashboardKpis;
  revenueSeries: RevenueDay[];
  serviceMix: ServiceMixRow[];
  recentTickets: RecentTicketRow[];
  onDuty: OnDutyStaffRow[];
}

export type PaymentStatus = "completed" | "pending" | "failed" | "refunded";

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  service_type: string;
  created_at: string | null;
  completed_at: string | null;
  patient: {
    id: string;
    mrn: string;
    first_name_en: string;
    last_name_en: string;
    phone_number: string | null;
  } | null;
  ticket_no: string | null;
}

export interface PaymentListResult {
  payments: PaymentRecord[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface PaymentListParams {
  status?: string;
  serviceType?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PaymentSummary {
  total_collected: number;
  total_count: number;
  month_collected: number;
  month_count: number;
  pending_total: number;
  pending_count: number;
  failed_count: number;
  by_service: {
    service_type: string;
    count: number;
    collected: number;
  }[];
}

export interface UpdatePaymentResult {
  id: string;
  status: PaymentStatus;
  amount: number;
  message: string;
}

export interface InvoiceRecord {
  id: string;
  invoice_no: string;
  service_type: string;
  amount: number;
  currency: string;
  status: string;
  issued_at: string;
  paid_at: string | null;
  file_url: string | null;
  patient: {
    id: string;
    mrn: string;
    first_name_en: string;
    last_name_en: string;
    phone_number: string | null;
  } | null;
  ticket_no: string | null;
  payment: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    service_type: string;
    completed_at: string | null;
  } | null;
}

export interface InvoicePdfResult {
  file_url: string;
}

export interface ServicePrice {
  service_type: string;
  price: number;
  currency: string;
  updated_at: string | null;
}

// ── Constants for the form ─────────────────────────────────────

export const SPECIALTY_CODES = [
  { code: 'SP-LUNG', label: 'Pulmonology (Lung Medicine)' },
  { code: 'SP-HEART', label: 'Cardiology (Heart)' },
  { code: 'SP-BRAIN', label: 'Neurology (Brain)' },
  { code: 'SP-KIDNEY', label: 'Nephrology (Kidney)' },
  { code: 'SP-SKIN', label: 'Dermatology (Skin & Hair)' },
  { code: 'SP-ENT', label: 'ENT (Ear, Nose & Throat)' },
  { code: 'SP-SURG', label: 'General Surgery' },
  { code: 'SP-GYNAE', label: 'Gynecology & Obstetrics' },
  { code: 'SP-MED', label: 'Internal Medicine' },
  { code: 'SP-PAIN', label: 'Pain Management' },
  { code: 'SP-ONCO', label: 'Oncology' },
] as const;

export const NURSE_TYPES = [
  { code: 'ADULT', label: 'Adult' },
  { code: 'PEDIATRIC', label: 'Pediatric' },
] as const;

export const SHIFT_PREFERENCES = [
  { code: 'DAY', label: 'Day' },
  { code: 'NIGHT', label: 'Night' },
  { code: 'ROTATING', label: 'Rotating' },
] as const;

// ── Endpoints ──────────────────────────────────────────────────

export const adminApi = {
  listRoles: () => apiFetch<{ roles: StaffRoleOption[] }>('/admin/roles'),

  listStaff: (params?: StaffListParams) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.q) qs.set('q', params.q);
    if (params?.page != null) qs.set('page', String(params.page));
    if (params?.pageSize != null) qs.set('pageSize', String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<StaffListResult>(`/admin/staff${suffix}`);
  },

  getStaff: (id: string) => apiFetch<StaffRecord>(`/admin/staff/${id}`),

  createStaff: (payload: CreateStaffPayload) =>
    apiFetch<CreateStaffResult>('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStaff: (id: string, payload: UpdateStaffPayload) =>
    apiFetch<StaffRecord>(`/admin/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  setStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    apiFetch<{ id: string; status: string; message: string }>(
      `/admin/staff/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    ),

  resetPassword: (id: string) =>
    apiFetch<ResetPasswordResult>(`/admin/staff/${id}/reset-password`, {
      method: "POST",
    }),

  listAuditLogs: (params?: AuditLogListParams) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set("action", params.action);
    if (params?.entityType) qs.set("entityType", params.entityType);
    if (params?.actorUserId) qs.set("actorUserId", params.actorUserId);
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.pageSize != null) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<AuditLogListResult>(`/admin/audit-logs${suffix}`);
  },

  verifyAuditLogs: () =>
    apiFetch<AuditVerifyResult>("/admin/audit-logs/verify"),

  listTickets: (params?: AdminTicketListParams) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.serviceType) qs.set("serviceType", params.serviceType);
    if (params?.q) qs.set("q", params.q);
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.pageSize != null) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<AdminTicketListResult>(`/admin/tickets${suffix}`);
  },

  listAdminProviders: (serviceType: string, q?: string) => {
    const qs = new URLSearchParams();
    qs.set("serviceType", serviceType);
    if (q) qs.set("q", q);
    return apiFetch<AdminProviderListResult>(
      `/admin/providers?${qs.toString()}`,
    );
  },

  reassignTicket: (ticketId: string, assignedProviderId: string) =>
    apiFetch<TicketReassignResult>(`/admin/tickets/${ticketId}/reassign`, {
      method: "POST",
      body: JSON.stringify({ assigned_provider_id: assignedProviderId }),
    }),

  getTicketDetail: (ticketId: string) =>
    apiFetch<TicketDetail>(`/admin/tickets/${ticketId}`),

  listPayments: (params?: PaymentListParams) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.serviceType) qs.set("serviceType", params.serviceType);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.q) qs.set("q", params.q);
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.pageSize != null) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<PaymentListResult>(`/admin/payments${suffix}`);
  },

  getPaymentSummary: () =>
    apiFetch<PaymentSummary>("/admin/payments/summary"),

  updatePaymentStatus: (id: string, status: PaymentStatus) =>
    apiFetch<UpdatePaymentResult>(`/admin/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getPaymentInvoice: (paymentId: string) =>
    apiFetch<InvoiceRecord>(`/admin/payments/${paymentId}/invoice`),

  getPaymentInvoicePdf: (paymentId: string) =>
    apiFetch<InvoicePdfResult>(`/admin/payments/${paymentId}/invoice/pdf`),

  listServicePrices: () =>
    apiFetch<ServicePrice[]>("/admin/service-prices"),

  getDashboardStats: () =>
    apiFetch<DashboardStats>("/admin/dashboard/stats"),
};
