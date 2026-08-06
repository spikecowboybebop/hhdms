"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import { InvoiceReceiptModal } from "@/components/dashboard/invoice-receipt-modal";
import { loadSession, dashboardPathForRole, type StoredSession } from "@/lib/auth";
import {
  adminApi,
  type AdminProvider,
  type AdminTicket,
  type TicketDetail,
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
  { value: "PENDING", label: "Needs Provider (PENDING)" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ALL", label: "All Statuses" },
];

const SERVICE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Services" },
  { value: "MBBS", label: "MBBS Doctor" },
  { value: "SPECIALIST", label: "Specialist" },
  { value: "CAREGIVER", label: "Caregiver" },
  { value: "NUTRITIONIST", label: "Nutritionist" },
  { value: "NURSE", label: "Nurse" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
  ASSIGNED: "bg-[#00D4B2]/10 text-[#008F78] border-[#00D4B2]/30",
  IN_PROGRESS: "bg-sky-100 text-sky-700 border-sky-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

const SERVICE_LABELS: Record<string, string> = {
  MBBS: "MBBS Doctor",
  SPECIALIST: "Specialist",
  CAREGIVER: "Caregiver",
  NUTRITIONIST: "Nutritionist",
  NURSE: "Nurse",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-red-100 text-red-600 border-red-200",
  refunded: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `৳${amount.toLocaleString("en-IN")}`;
}

export default function AdminSchedulingPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [serviceFilter, setServiceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [reassignTarget, setReassignTarget] = useState<AdminTicket | null>(null);
  const [viewTarget, setViewTarget] = useState<TicketDetail | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<{
    paymentId: string;
    ticketNo?: string | null;
  } | null>(null);
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

  const fetchTickets = useCallback(
    async (params?: { page?: number; pageSize?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminApi.listTickets({
          status: statusFilter,
          serviceType: serviceFilter || undefined,
          q: search.trim() || undefined,
          page: params?.page,
          pageSize: params?.pageSize ?? pageSize,
        });
        setTickets(data.tickets);
        setTotal(data.total);
        setPageCount(data.pageCount);
        if (data.page) setPage(data.page);
        if (data.pageSize) setPageSize(data.pageSize);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, serviceFilter, search, pageSize],
  );

  useEffect(() => {
    if (hydrated && session && !didInitialLoad.current) {
      didInitialLoad.current = true;
      fetchTickets({ page: 1 });
    }
  }, [hydrated, session, fetchTickets]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleReassigned = useCallback(
    (message: string) => {
      setReassignTarget(null);
      setToast(message);
      fetchTickets({ page: 1 });
    },
    [fetchTickets],
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
      pageTitle="Scheduling Oversight"
      pageSubtitle="Review service tickets and manually reassign providers per SRS SD-008"
    >
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchTickets({ page: 1 });
            }}
            placeholder="Search ticket / patient / MRN…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none placeholder:text-[#2D3A4A]/40 sm:min-w-[200px]"
          />
          <button
            onClick={() => fetchTickets({ page: 1 })}
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

      {/* Tickets table */}
      <div className="mt-5">
        <SectionCard
          title="Service Tickets"
          description={`${total} ticket${total === 1 ? "" : "s"} · defaulted to tickets needing a provider`}
        >
          {loading ? (
            <div className="flex items-center gap-3 py-10">
              <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
              <span className="text-sm text-[#2D3A4A]">Loading tickets…</span>
            </div>
          ) : tickets.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#2D3A4A]">
              No tickets found for the selected filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      <th className="py-3 pr-4">Ticket</th>
                      <th className="py-3 pr-4">Service</th>
                      <th className="py-3 pr-4">Patient</th>
                      <th className="py-3 pr-4">Provider</th>
                      <th className="py-3 pr-4">Scheduled</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => {
                      const isAvailableForReassign = t.status !== "CANCELLED";
                      return (
                        <tr
                          key={t.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F9FA]"
                        >
                          <td className="py-3 pr-4 whitespace-nowrap text-xs text-[#2D3A4A]">
                            {t.ticket_no}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="rounded-full bg-[#0A2540]/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A2540]">
                              {SERVICE_LABELS[t.service_type] ?? t.service_type}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                            {t.patient.first_name_en} {t.patient.last_name_en}
                            <span className="block font-mono text-[10px] text-[#2D3A4A]/60">
                              {t.patient.mrn}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                            {t.provider ? (
                              <>
                                {t.provider.name}
                                <span className="block text-[10px] text-[#2D3A4A]/60">
                                  {t.provider.title}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-[#2D3A4A]/50">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap text-xs text-[#2D3A4A]">
                            {t.scheduled_date ? (
                              <>
                                {t.scheduled_date}
                                {t.scheduled_time_slot ? (
                                  <span className="block font-mono text-[10px] text-[#2D3A4A]/60">
                                    {t.scheduled_time_slot}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-[#2D3A4A]/50">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  adminApi
                                    .getTicketDetail(t.id)
                                    .then(setViewTarget)
                                    .catch((e) =>
                                      setError(
                                        e instanceof Error
                                          ? e.message
                                          : "Failed to load ticket details.",
                                      ),
                                    );
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
                              >
                                View
                              </button>
                              {isAvailableForReassign ? (
                                <button
                                  onClick={() => setReassignTarget(t)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
                                >
                                  Reassign
                                </button>
                              ) : (
                                <span className="text-xs text-[#2D3A4A]/40">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-[#2D3A4A]">
                  <span>
                    Showing {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, total)} of {total} tickets
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => fetchTickets({ page: 1, pageSize: Number(e.target.value) })}
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
                    onClick={() => fetchTickets({ page: page - 1 })}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1)
                    .reduce<{ p: number; gap: boolean }[]>((acc, p) => {
                      const last = acc[acc.length - 1];
                      if (last && p - last.p > 1) acc.push({ p: -1, gap: true });
                      acc.push({ p, gap: false });
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
                          onClick={() => fetchTickets({ page: item.p })}
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
                    onClick={() => fetchTickets({ page: page + 1 })}
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

      {reassignTarget && (
        <ReassignModal
          ticket={reassignTarget}
          onClose={() => setReassignTarget(null)}
          onDone={handleReassigned}
        />
      )}

      {viewTarget && (
        <TicketDetailDrawer
          detail={viewTarget}
          onClose={() => setViewTarget(null)}
          onViewReceipt={(paymentId) =>
            setReceiptTarget({
              paymentId,
              ticketNo: viewTarget.ticket.ticket_no,
            })
          }
        />
      )}

      {receiptTarget && (
        <InvoiceReceiptModal
          paymentId={receiptTarget.paymentId}
          ticketNo={receiptTarget.ticketNo}
          onClose={() => setReceiptTarget(null)}
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

function ReassignModal({
  ticket,
  onClose,
  onDone,
}: {
  ticket: AdminTicket;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .listAdminProviders(ticket.service_type)
      .then((data) => {
        if (!cancelled) setProviders(data.providers);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load providers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticket.service_type]);

  const handleSave = async () => {
    if (!selectedId) return;
    const selected = providers.find((p) => p.id === selectedId);
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.reassignTicket(ticket.id, selectedId);
      onDone(
        `Reassigned ${result.ticket_no} to ${
          selected ? `${selected.first_name_en} ${selected.last_name_en}` : "new provider"
        }.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reassign provider.");
      setSaving(false);
    }
  };

  const currentName = ticket.provider?.name ?? "Unassigned";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/60 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0A2540]">Reassign Provider</h2>
              <p className="text-xs text-[#2D3A4A]">
                {ticket.ticket_no} ·{" "}
                {SERVICE_LABELS[ticket.service_type] ?? ticket.service_type} ·{" "}
                {ticket.patient.first_name_en} {ticket.patient.last_name_en}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] hover:text-[#0A2540]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3 text-xs">
            <span className="font-semibold text-[#2D3A4A]">Currently:&nbsp;</span>
            <span className="text-[#0A2540]">{currentName}</span>
          </div>

          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
              <span className="text-sm text-[#2D3A4A]">Loading providers…</span>
            </div>
          ) : providers.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#2D3A4A]">
              No {SERVICE_LABELS[ticket.service_type] ?? ticket.service_type} staff available to assign.
            </p>
          ) : (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                {SERVICE_LABELS[ticket.service_type] ?? ticket.service_type} Staff ({providers.length})
              </p>
              {providers.map((p) => {
                const selected = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? "border-[#00D4B2] bg-[#00D4B2]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-xs font-semibold text-[#0A2540]">
                          {p.first_name_en} {p.last_name_en}
                        </span>
                        <span className="text-[10px] text-slate-500">{p.title}</span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          p.is_available
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {p.is_available ? "Available" : "Busy"}
                      </span>
                    </div>
                  </button>
                );
              })}
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
            disabled={!selectedId || saving}
            className="rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Reassigning…" : "Confirm Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A]">
        {label}
      </span>
      <span className="text-sm text-[#0A2540]">{value ?? "—"}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A]">
      {title}
    </h4>
  );
}

function TicketDetailDrawer({
  detail,
  onClose,
  onViewReceipt,
}: {
  detail: TicketDetail;
  onClose: () => void;
  onViewReceipt: (paymentId: string) => void;
}) {
  const { ticket, patient, provider, session, payment, audit } = detail;
  const statusStyle =
    STATUS_STYLES[ticket.status] ?? "bg-slate-100 text-slate-600 border-slate-200";

  const [open, setOpen] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(onClose, 300);
      return () => clearTimeout(t);
    }
  }, [open, onClose]);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    setOpen(false);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex justify-end transition-opacity duration-300 ${
        open ? "bg-black/40 opacity-100" : "bg-black/0 opacity-0"
      }`}
      onClick={requestClose}
    >
      <div
        className={`flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-200/60 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0A2540]">Ticket Details</h2>
              <p className="text-xs text-[#2D3A4A]">
                {ticket.ticket_no} ·{" "}
                {SERVICE_LABELS[ticket.service_type] ?? ticket.service_type}
              </p>
            </div>
            <button
              onClick={requestClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] hover:text-[#0A2540]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Status */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
            <span className="text-xs text-[#2D3A4A]">Status</span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusStyle}`}>
              {ticket.status}
            </span>
          </div>

          {/* Ticket */}
          <section className="space-y-3">
            <SectionHeader title="Ticket" />
            <div className="flex w-full flex-col gap-4">
              <DetailRow label="Service" value={SERVICE_LABELS[ticket.service_type] ?? ticket.service_type} />
              <DetailRow label="Price" value={formatAmount(ticket.price)} />
              <DetailRow label="Scheduled" value={ticket.scheduled_time_slot} />
              <DetailRow label="Created" value={formatDateTime(ticket.created_at)} />
            </div>
          </section>

          {/* Patient */}
          <section className="space-y-3">
            <SectionHeader title="Patient" />
            <div className="flex w-full flex-col gap-4">
              <DetailRow
                label="Name"
                value={`${patient.first_name_en} ${patient.last_name_en}`.trim()}
              />
              <DetailRow label="MRN" value={patient.mrn} />
              <DetailRow label="Phone" value={patient.phone_number} />
              <DetailRow label="District" value={patient.district} />
            </div>
          </section>

          {/* Provider */}
          <section className="space-y-3">
            <SectionHeader title="Provider" />
            {provider ? (
              <div className="flex w-full flex-col gap-4">
                <DetailRow label="Name" value={provider.name} />
                <DetailRow label="Title" value={provider.title} />
                <DetailRow label="Email" value={provider.email} />
                <DetailRow label="Phone" value={provider.phone_number} />
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3 text-xs text-[#2D3A4A]">
                No provider assigned yet.
              </p>
            )}
          </section>

          {/* Session / Payment */}
          <section className="space-y-3">
            <SectionHeader title="Payment" />
            <div className="flex w-full flex-col gap-4">
              <DetailRow label="Total" value={formatAmount(session.total_amount)} />
              <DetailRow label="Collected" value={payment ? formatAmount(payment.amount) : "—"} />
              <DetailRow label="Status" value={payment ? payment.status : "—"} />
              <DetailRow label="Completed" value={payment ? formatDateTime(payment.completed_at) : "—"} />
            </div>
            {payment && (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  PAYMENT_STATUS_STYLES[payment.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {payment.status}
              </span>
            )}
            {payment && (
              <button
                onClick={() => onViewReceipt(payment.id)}
                className="w-full rounded-xl border border-[#0A2540]/20 px-4 py-2.5 text-xs font-semibold text-[#0A2540] transition-all hover:bg-[#F8F9FA]"
              >
                View Receipt / Invoice
              </button>
            )}
          </section>

          {/* Audit */}
          <section className="space-y-3">
            <SectionHeader title="Audit Trail" />
            {audit.length === 0 ? (
              <p className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3 text-xs text-[#2D3A4A]">
                No audit events for this ticket.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {audit.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#0A2540]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#0A2540]">
                        {a.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-[#2D3A4A]/70">
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-0.5 text-[11px] text-[#2D3A4A]">
                      <span>
                        By {a.actor_name ?? "Unknown"} ({a.actor_role ?? "staff"})
                      </span>
                      {a.changes && (
                        <pre className="mt-1 max-h-28 overflow-y-auto rounded-lg bg-white px-2 py-1.5 font-mono text-[10px] text-[#2D3A4A]/80">
                          {JSON.stringify(a.changes, null, 2)}
                        </pre>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}