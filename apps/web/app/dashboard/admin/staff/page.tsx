"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import { loadSession, dashboardPathForRole, type StoredSession } from "@/lib/auth";
import StaffFormModal from "@/components/dashboard/admin/staff-form-modal";
import CredentialsModal from "@/components/dashboard/admin/credentials-modal";
import {
  adminApi,
  type StaffRecord,
  type StaffRole,
} from "@/lib/admin-api";

const navItems: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard/admin",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Staff Profiles",
    href: "/dashboard/admin/staff",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Scheduling",
    href: "/dashboard/admin/scheduling",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Payments",
    href: "/dashboard/admin/payments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="15" x2="10" y2="15" />
      </svg>
    ),
  },
  {
    label: "Audit Logs",
    href: "/dashboard/admin/audit-logs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Roles" },
  { value: "MBBS_DOCTOR", label: "MBBS Doctor" },
  { value: "SPECIALIST", label: "Specialist" },
  { value: "NURSE", label: "Nurse" },
  { value: "CAREGIVER", label: "Caregiver" },
  { value: "NUTRITIONIST", label: "Nutritionist" },
];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
];

const ROLE_BADGES: Record<StaffRole, string> = {
  MBBS_DOCTOR: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
  SPECIALIST: "bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20",
  NURSE: "bg-sky-100 text-sky-700 border-sky-200",
  CAREGIVER: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
  NUTRITIONIST: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const ROLE_LABELS: Record<StaffRole, string> = {
  MBBS_DOCTOR: "MBBS Doctor",
  SPECIALIST: "Specialist",
  NURSE: "Nurse",
  CAREGIVER: "Caregiver",
  NUTRITIONIST: "Nutritionist",
};

function ProfileBadge({ role, profile }: { role: StaffRole; profile: Record<string, unknown> | null }) {
  if (!profile) return null;
  switch (role) {
    case "MBBS_DOCTOR":
      return profile.bmdc_registration ? (
        <span className="text-[10px] text-[#2D3A4A]/70">{String(profile.bmdc_registration)}</span>
      ) : null;
    case "SPECIALIST":
      return profile.specialty_code ? (
        <span className="text-[10px] text-[#2D3A4A]/70">{String(profile.specialty_code)}</span>
      ) : null;
    case "NURSE":
      return profile.bnmc_registration ? (
        <span className="text-[10px] text-[#2D3A4A]/70">{String(profile.bnmc_registration)}</span>
      ) : null;
    default:
      return null;
  }
}

interface CredsState {
  email: string;
  role: StaffRole;
  temporary_password: string;
}

export default function AdminStaffPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRecord | null>(null);
  const [creds, setCreds] = useState<CredsState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const didInitialLoad = useRef(false);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "ADMIN") {
      router.replace(dashboardPathForRole(s.user.role));
    }
  }, [router]);

  const fetchStaff = useCallback(async (params?: {
    role?: string;
    status?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listStaff(params);
      setStaff(data.staff);
      setTotal(data.total);
      setPageCount(data.pageCount);
      if (data.page) setPage(data.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPage = useCallback(
    (
      targetPage: number,
      overrides?: { role?: string; status?: string; q?: string },
    ) => {
      fetchStaff({
        role: overrides?.role ?? (roleFilter || undefined),
        status: overrides?.status ?? (statusFilter || undefined),
        q: overrides?.q ?? (search || undefined),
        page: targetPage,
        pageSize,
      });
    },
    [fetchStaff, roleFilter, statusFilter, search, pageSize],
  );

  useEffect(() => {
    if (hydrated && session && !didInitialLoad.current) {
      didInitialLoad.current = true;
      fetchPage(1);
    }
  }, [hydrated, session, fetchPage]);

  const applyFilters = () => {
    fetchPage(1, { q: search || undefined });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreated = (result: CredsState) => {
    setFormOpen(false);
    setEditing(null);
    setCreds(result);
    fetchPage(1);
  };

  const handleSaved = (record: StaffRecord) => {
    setFormOpen(false);
    setEditing(null);
    showToast(`Updated ${record.first_name_en} ${record.last_name_en}`);
    fetchPage(page);
  };

  const handleToggleStatus = async (record: StaffRecord) => {
    const next = record.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await adminApi.setStatus(record.id, next);
      showToast(res.message);
      fetchPage(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status.");
    }
  };

  const handleResetPassword = async (record: StaffRecord) => {
    try {
      const res = await adminApi.resetPassword(record.id);
      setCreds({
        email: record.email,
        role: record.role,
        temporary_password: res.temporary_password,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password.");
    }
  };

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">
            Authenticating session…
          </span>
        </div>
      </main>
    );
  }

  if (!session) return null;

  return (
    <DashboardShell
      role={session.user.role}
      accent="navy"
      navItems={navItems}
      pageTitle="Staff Profiles"
      pageSubtitle="Provision, edit, suspend and reset credentials for all providers"
    >
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search by name, email or phone…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] outline-none transition-all focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20 sm:w-72"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none"
          >
            {ROLE_FILTERS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={applyFilters}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
          >
            Apply
          </button>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add New Staff
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 px-4 py-3 text-xs font-semibold text-[#FF9900]">
          {error}
        </div>
      )}

      {/* Staff table */}
      <div className="mt-5">
        <SectionCard
          title="All Staff Profiles"
          description={`${total} staff member${total === 1 ? "" : "s"} · provisioned profiles across all roles`}
        >
          {loading ? (
            <div className="flex items-center gap-3 py-10">
              <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
              <span className="text-sm text-[#2D3A4A]">Loading staff…</span>
            </div>
          ) : staff.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#2D3A4A]">
              No staff found. Click &quot;Add New Staff&quot; to provision a profile.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                    <th className="py-3 pr-4">Staff</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Contact</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Availability</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F9FA]"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0A2540] text-xs font-bold text-[#00D4B2]">
                            {`${s.first_name_en} ${s.last_name_en}`
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs font-semibold text-[#0A2540]">
                              {s.first_name_en} {s.last_name_en}
                            </span>
                            <ProfileBadge role={s.role} profile={s.profile} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${ROLE_BADGES[s.role]}`}>
                          {ROLE_LABELS[s.role]}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs text-[#2D3A4A]">{s.email}</span>
                          <span className="text-[10px] text-[#2D3A4A]/70">{s.phone_number}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                            s.status === "ACTIVE"
                              ? "bg-[#00D4B2]/10 text-[#00D4B2]"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              s.status === "ACTIVE" ? "bg-[#00D4B2]" : "bg-red-500"
                            }`}
                          />
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {s.is_available == null ? (
                          <span className="text-xs text-[#2D3A4A]/50">—</span>
                        ) : (
                          <span
                            className={`text-xs font-semibold ${
                              s.is_available ? "text-[#00D4B2]" : "text-[#FF9900]"
                            }`}
                          >
                            {s.is_available ? "Available" : "Unavailable"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditing(s);
                              setFormOpen(true);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(s)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540]"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleToggleStatus(s)}
                            className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all ${
                              s.status === "ACTIVE"
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-[#00D4B2]/30 text-[#00D4B2] hover:bg-[#00D4B2]/10"
                            }`}
                          >
                            {s.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-[#2D3A4A]">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
                  {total} staff
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    fetchPage(1);
                  }}
                  aria-label="Rows per page"
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-[#2D3A4A] outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === pageCount ||
                      Math.abs(p - page) <= 1,
                  )
                  .reduce<{ p: number; gap: boolean }[]>(
                    (acc, p) => {
                      const last = acc[acc.length - 1];
                      if (last && p - last.p > 1) acc.push({ p: -1, gap: true });
                      acc.push({ p, gap: false });
                      return acc;
                    },
                    [],
                  )
                  .map((item) =>
                    item.gap ? (
                      <span key={`gap-${item.p}`} className="px-1 text-xs text-[#2D3A4A]/60">
                        …
                      </span>
                    ) : (
                      <button
                        key={item.p}
                        onClick={() => fetchPage(item.p)}
                        className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-all ${
                          item.p === page
                            ? "bg-[#0A2540] text-[#00D4B2]"
                            : "border border-slate-200 text-[#2D3A4A] hover:bg-[#F8F9FA]"
                        }`}
                      >
                        {item.p}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => fetchPage(page + 1)}
                  disabled={page >= pageCount}
                  aria-label="Next page"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Modals */}
      <StaffFormModal
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreated={handleCreated}
        onSaved={handleSaved}
      />
      <CredentialsModal
        open={creds !== null}
        email={creds?.email ?? ""}
        role={creds?.role ?? "MBBS_DOCTOR"}
        temporaryPassword={creds?.temporary_password ?? ""}
        onClose={() => setCreds(null)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] rounded-xl border border-[#00D4B2]/20 bg-white px-5 py-3 text-xs font-semibold text-[#0A2540] shadow-xl">
          {toast}
        </div>
      )}
    </DashboardShell>
  );
}
