"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard, StatCard } from "@/components/dashboard/dashboard-cards";
import { InvoiceReceiptModal } from "@/components/dashboard/invoice-receipt-modal";
import { loadSession, dashboardPathForRole, type StoredSession } from "@/lib/auth";
import {
  adminApi,
  type PaymentRecord,
  type PaymentSummary,
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

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const SERVICE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Services" },
  { value: "MBBS", label: "MBBS Doctor" },
  { value: "SPECIALIST", label: "Specialist" },
  { value: "CAREGIVER", label: "Caregiver" },
  { value: "NUTRITIONIST", label: "Nutritionist" },
  { value: "NURSE", label: "Nurse" },
];

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-red-100 text-red-600 border-red-200",
  refunded: "bg-slate-100 text-slate-600 border-slate-200",
};

const SERVICE_LABELS: Record<string, string> = {
  MBBS: "MBBS Doctor",
  SPECIALIST: "Specialist",
  CAREGIVER: "Caregiver",
  NUTRITIONIST: "Nutritionist",
  NURSE: "Nurse",
};

function formatBDT(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `৳${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<PaymentRecord | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<PaymentRecord | null>(null);
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

  const fetchPayments = useCallback(
    async (params?: { page?: number; pageSize?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminApi.listPayments({
          status: statusFilter || undefined,
          serviceType: serviceFilter || undefined,
          from: from || undefined,
          to: to || undefined,
          q: search.trim() || undefined,
          page: params?.page,
          pageSize: params?.pageSize ?? pageSize,
        });
        setPayments(data.payments);
        setTotal(data.total);
        setPageCount(data.pageCount);
        if (data.page) setPage(data.page);
        if (data.pageSize) setPageSize(data.pageSize);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payments.");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, serviceFilter, from, to, search, pageSize],
  );

  const fetchSummary = useCallback(() => {
    adminApi
      .getPaymentSummary()
      .then(setSummary)
      .catch(() => {
        /* non-blocking */
      });
  }, []);

  useEffect(() => {
    if (hydrated && session && !didInitialLoad.current) {
      didInitialLoad.current = true;
      fetchPayments({ page: 1 });
      fetchSummary();
    }
  }, [hydrated, session, fetchPayments, fetchSummary]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleConfirmed = useCallback(
    (message: string) => {
      setConfirmTarget(null);
      setToast(message);
      fetchPayments({ page: 1 });
      fetchSummary();
    },
    [fetchPayments, fetchSummary],
  );

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">Authenticating session…</span>
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
      pageTitle="Payments & Finance"
      pageSubtitle="Track collected revenue, pending charges and payment statuses"
    >
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Collected"
          value={formatBDT(summary?.total_collected)}
          delta={`${summary?.total_count ?? 0} completed payments`}
          trend="flat"
          accent="navy"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Collected This Month"
          value={formatBDT(summary?.month_collected)}
          delta={`${summary?.month_count ?? 0} this month`}
          trend="flat"
          accent="teal"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatCard
          label="Pending Charges"
          value={formatBDT(summary?.pending_total)}
          delta={`${summary?.pending_count ?? 0} awaiting payment`}
          trend="down"
          accent="amber"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
        <StatCard
          label="Failed Payments"
          value={summary?.failed_count ?? 0}
          delta="need retry / review"
          trend="down"
          accent="slate"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>

      {/* Service mix */}
      {summary && summary.by_service.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summary.by_service.map((s) => (
            <div
              key={s.service_type}
              className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm"
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                {SERVICE_LABELS[s.service_type] ?? s.service_type}
              </span>
              <div className="mt-1 text-lg font-bold text-[#0A2540]">
                {formatBDT(s.collected)}
              </div>
              <div className="text-[10px] text-[#2D3A4A]">{s.count} collected</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
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
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none"
          >
            {SERVICE_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none"
          />
          <span className="text-xs text-[#2D3A4A]/60">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchPayments({ page: 1 });
            }}
            placeholder="Search patient / MRN / ticket…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none placeholder:text-[#2D3A4A]/40 lg:min-w-[200px]"
          />
          <button
            onClick={() => fetchPayments({ page: 1 })}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 px-4 py-3 text-xs font-semibold text-[#FF9900]">
          {error}
        </div>
      )}

      {/* Payments table */}
      <div className="mt-5">
        <SectionCard title="Payments" description={`${total} transaction${total === 1 ? "" : "s"}`}>
          {loading ? (
            <div className="flex items-center gap-3 py-10">
              <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
              <span className="text-sm text-[#2D3A4A]">Loading payments…</span>
            </div>
          ) : payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#2D3A4A]">
              No payments found for the selected filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      <th className="py-3 pr-4">Ticket</th>
                      <th className="py-3 pr-4">Patient</th>
                      <th className="py-3 pr-4">Service</th>
                      <th className="py-3 pr-4">Amount</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F9FA]">
                        <td className="py-3 pr-4 whitespace-nowrap font-mono text-xs font-semibold text-[#0A2540]">
                          {p.ticket_no ?? p.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                          {p.patient
                            ? `${p.patient.first_name_en} ${p.patient.last_name_en}`
                            : "—"}
                          <span className="block font-mono text-[10px] text-[#2D3A4A]/60">
                            {p.patient?.mrn ?? ""}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                          {SERVICE_LABELS[p.service_type] ?? p.service_type}
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold text-[#0A2540]">
                          {formatBDT(p.amount)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${PAYMENT_STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap text-xs text-[#2D3A4A]">
                          {p.completed_at ?? p.created_at ? formatDate(p.completed_at ?? p.created_at) : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setInvoiceTarget(p)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
                            >
                              Invoice
                            </button>
                            {p.status !== "completed" ? (
                              <button
                                onClick={() => setConfirmTarget(p)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
                              >
                                Mark Complete
                              </button>
                            ) : (
                              <span className="text-xs text-[#2D3A4A]/40">—</span>
                            )}
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
                    Showing {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, total)} of {total} payments
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => fetchPayments({ page: 1, pageSize: Number(e.target.value) })}
                    aria-label="Rows per page"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-[#2D3A4A] outline-none"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchPayments({ page: page - 1 })}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === pageCount || Math.abs(n - page) <= 1)
                    .reduce<{ p: number; gap: boolean }[]>((acc, n) => {
                      const last = acc[acc.length - 1];
                      if (last && n - last.p > 1) acc.push({ p: -1, gap: true });
                      acc.push({ p: n, gap: false });
                      return acc;
                    }, [])
                    .map((item) =>
                      item.gap ? (
                        <span key={`gap-${item.p}`} className="px-1 text-xs text-[#2D3A4A]/60">
                          …
                        </span>
                      ) : (
                        <button
                          key={item.p}
                          onClick={() => fetchPayments({ page: item.p })}
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
                    onClick={() => fetchPayments({ page: page + 1 })}
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

      {confirmTarget && (
        <MarkCompleteModal
          payment={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onDone={handleConfirmed}
        />
      )}

      {invoiceTarget && (
        <InvoiceReceiptModal
          paymentId={invoiceTarget.id}
          ticketNo={invoiceTarget.ticket_no}
          onClose={() => setInvoiceTarget(null)}
          onToast={setToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] rounded-xl bg-[#0A2540] px-5 py-3 text-xs font-bold text-[#00D4B2] shadow-2xl">
          {toast}
        </div>
      )}
    </DashboardShell>
  );
}

function MarkCompleteModal({
  payment,
  onClose,
  onDone,
}: {
  payment: PaymentRecord;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.updatePaymentStatus(payment.id, "completed");
      onDone(
        `Marked ${payment.ticket_no ?? "payment"} complete · ${formatBDT(result.amount)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update payment.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/60 px-6 py-4">
          <h2 className="text-base font-bold text-[#0A2540]">Mark Payment Complete</h2>
          <p className="text-xs text-[#2D3A4A]">
            {payment.ticket_no ?? payment.id.slice(0, 8)} ·{" "}
            {SERVICE_LABELS[payment.service_type] ?? payment.service_type} ·{" "}
            {formatBDT(payment.amount)}
          </p>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[#2D3A4A]">
            This records the payment as collected and logs an audited change. Current status:{" "}
            <span className="font-semibold text-[#0A2540]">{payment.status}</span>.
          </p>
          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200/60 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Updating…" : "Mark Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}