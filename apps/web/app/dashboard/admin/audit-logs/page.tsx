"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import { loadSession, dashboardPathForRole, type StoredSession } from "@/lib/auth";
import {
  adminApi,
  type AuditAction,
  type AuditLogRecord,
  type AuditVerifyResult,
  type StaffRecord,
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

const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Actions" },
  { value: "CREATE_STAFF", label: "Create Staff" },
  { value: "UPDATE_STAFF", label: "Update Staff" },
  { value: "SUSPEND_STAFF", label: "Suspend" },
  { value: "ACTIVATE_STAFF", label: "Activate" },
  { value: "RESET_PASSWORD", label: "Reset Password" },
  { value: "REASSIGN_TICKET", label: "Reassign Provider" },
  { value: "UPDATE_PAYMENT", label: "Payment Status" },
  { value: "INVOICE_GENERATED", label: "Invoice Generated" },
];

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE_STAFF: "Create Staff",
  UPDATE_STAFF: "Update Staff",
  SUSPEND_STAFF: "Suspend",
  ACTIVATE_STAFF: "Activate",
  RESET_PASSWORD: "Reset Password",
  REASSIGN_TICKET: "Reassign Provider",
  UPDATE_PAYMENT: "Payment Status",
  INVOICE_GENERATED: "Invoice Generated",
};

const ACTION_STYLES: Record<AuditAction, string> = {
  CREATE_STAFF: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
  UPDATE_STAFF: "bg-sky-100 text-sky-700 border-sky-200",
  SUSPEND_STAFF: "bg-red-100 text-red-600 border-red-200",
  ACTIVATE_STAFF: "bg-emerald-100 text-emerald-700 border-emerald-200",
  RESET_PASSWORD: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
  REASSIGN_TICKET: "bg-violet-100 text-violet-700 border-violet-200",
  UPDATE_PAYMENT: "bg-cyan-100 text-cyan-700 border-cyan-200",
  INVOICE_GENERATED: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const ENTITY_LABELS: Record<string, string> = {
  staff: "Staff Profile",
  ticket: "Service Ticket",
  payment: "Payment",
  invoice: "Invoice",
};

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function hasChangeData(changes: Record<string, unknown> | null): boolean {
  if (!changes) return false;
  const nested =
    changes.updated &&
    typeof changes.updated === "object" &&
    !Array.isArray(changes.updated)
      ? (changes.updated as Record<string, unknown>)
      : null;
  const entries = nested ?? changes;
  return Object.entries(entries).some(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
}

function ChangesDetail({
  changes,
}: {
  changes: Record<string, unknown> | null;
}) {
  if (!changes) {
    return (
      <p className="text-xs text-[#2D3A4A]/60">
        No change details recorded.
      </p>
    );
  }

  const hasFromTo =
    typeof changes.from === "string" && typeof changes.to === "string";

  if (hasFromTo) {
    const from = String(changes.from);
    const to = String(changes.to);
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-[#2D3A4A]">
          {from}
        </span>
        <span className="text-[#2D3A4A]/50">→</span>
        <span
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            to === "SUSPENDED"
              ? "bg-red-100 text-red-600"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {to}
        </span>
      </div>
    );
  }

  // UPDATE_STAFF wraps the changed fields under `updated`.
  const nested =
    changes.updated &&
    typeof changes.updated === "object" &&
    !Array.isArray(changes.updated)
      ? (changes.updated as Record<string, unknown>)
      : null;

  const entries = nested ?? changes;
  const items = Object.entries(entries).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );

  if (items.length === 0) {
    return (
      <p className="text-xs text-[#2D3A4A]/60">
        No change details recorded.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A]/60">
            {prettifyKey(k)}
          </span>
          <span className="rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2 text-sm font-medium text-[#0A2540]">
            {formatValue(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChangesModal({
  log,
  onClose,
}: {
  log: AuditLogRecord;
  onClose: () => void;
}) {
  const [staff, setStaff] = useState<StaffRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (log.entityType === "staff" && log.entityId) {
      adminApi
        .getStaff(log.entityId)
        .then((s) => {
          if (!cancelled) setStaff(s);
        })
        .catch(() => {
          if (!cancelled) setStaff(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [log.entityId, log.entityType]);

  const staffName = staff
    ? `${staff.first_name_en} ${staff.last_name_en}`.trim()
    : null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/60 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0A2540]">
                Change Details
              </h2>
              <p className="text-xs text-[#2D3A4A]">
                {ACTION_LABELS[log.action]} ·{" "}
                {new Date(log.createdAt).toLocaleString()}
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

        {log.entityType === "staff" && (
          <div className="border-b border-slate-100 bg-[#F8F9FA] px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A]/60">
              Affected Staff
            </p>
            {staff ? (
              <div className="mt-1 flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#00D4B2]/15 text-xs font-bold text-[#008F78]">
                  {(staff.first_name_en[0] ?? "?") +
                    (staff.last_name_en[0] ?? "")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0A2540]">
                    {staffName}
                  </p>
                  <p className="truncate text-xs text-[#2D3A4A]/70">
                    {staff.email}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-[#2D3A4A]/60">
                {log.entityId}
              </p>
            )}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <ChangesDetail changes={log.changes} />
        </div>
        <div className="flex justify-end border-t border-slate-200/60 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<AuditVerifyResult | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
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

  const fetchLogs = useCallback(
    async (params?: { action?: string; page?: number; pageSize?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminApi.listAuditLogs({
          action: (params?.action ?? actionFilter) || undefined,
          page: params?.page,
          pageSize: params?.pageSize ?? pageSize,
        });
        setLogs(data.logs);
        setTotal(data.total);
        setPageCount(data.pageCount);
        if (data.page) setPage(data.page);
        if (data.pageSize) setPageSize(data.pageSize);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, pageSize],
  );

  useEffect(() => {
    if (hydrated && session && !didInitialLoad.current) {
      didInitialLoad.current = true;
      fetchLogs({ page: 1 });
    }
  }, [hydrated, session, fetchLogs]);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const result = await adminApi.verifyAuditLogs();
      setVerifyResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to verify audit chain.");
    } finally {
      setVerifying(false);
    }
  };

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
      pageTitle="Audit Logs"
      pageSubtitle="Immutable record of every admin action — chained, tamper-evident"
    >
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#2D3A4A] outline-none"
          >
            {ACTION_FILTERS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchLogs({ page: 1 })}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
          >
            Apply
          </button>
        </div>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90 disabled:opacity-70"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          {verifying ? "Verifying…" : "Verify Chain Integrity"}
        </button>
      </div>

      {/* Verify result banner */}
      {verifyResult && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
            verifyResult.valid
              ? "border-[#00D4B2]/20 bg-[#00D4B2]/5 text-[#00D4B2]"
              : "border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {!verifyResult.valid && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          )}
          {verifyResult.valid ? (
            <>
              <span className="relative mt-1 flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4B2] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00D4B2]" />
              </span>
              <span>
                Chain integrity verified — all {verifyResult.checked} audit entries
                are linked and unmodified.
              </span>
            </>
          ) : (
            <span>
              Tampering detected! Chain broke at entry #{verifyResult.broken_at_index}
              {verifyResult.broken_at_id
                ? ` (${verifyResult.broken_at_id})`
                : ""}{" "}
              — reason: {verifyResult.reason}.
            </span>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 px-4 py-3 text-xs font-semibold text-[#FF9900]">
          {error}
        </div>
      )}

      {/* Log table */}
      <div className="mt-5">
        <SectionCard
          title="Audit Events"
          description={`${total} recorded event${total === 1 ? "" : "s"} · retained for 5 years per SRS 4.2`}
        >
          {loading ? (
            <div className="flex items-center gap-3 py-10">
              <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
              <span className="text-sm text-[#2D3A4A]">Loading audit logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#2D3A4A]">
              No audit events recorded yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      <th className="py-3 pr-4">Time</th>
                      <th className="py-3 pr-4">Action</th>
                      <th className="py-3 pr-4">Entity</th>
                      <th className="py-3 pr-4">Actor</th>
                      <th className="py-3 pr-4">IP</th>
                      <th className="py-3 pr-4">Changes</th>
                      <th className="py-3 text-right">Chain Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F9FA]"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap text-xs text-[#2D3A4A]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${ACTION_STYLES[log.action]}`}>
                            {ACTION_LABELS[log.action]}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                          {ENTITY_LABELS[log.entityType] ?? log.entityType}
                          {log.entityId ? (
                            <span className="block font-mono text-[10px] text-[#2D3A4A]/60">
                              {log.entityId.slice(0, 8)}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                          {log.actorRole ?? "—"}
                          <span className="block font-mono text-[10px] text-[#2D3A4A]/60">
                            {log.actorUserId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-[11px] text-[#2D3A4A]">
                          {log.ipAddress ?? "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {hasChangeData(log.changes) ? (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540]"
                            >
                              View Changes
                            </button>
                          ) : (
                            <span className="text-xs text-[#2D3A4A]/50">—</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-mono text-[10px] text-[#2D3A4A]/60" title={`content_hash ${log.contentHash}`}>
                            {log.contentHash.slice(0, 10)}
                          </span>
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
                    {Math.min(page * pageSize, total)} of {total} events
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => fetchLogs({ page: 1, pageSize: Number(e.target.value) })}
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
                    onClick={() => fetchLogs({ page: page - 1 })}
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
                          onClick={() => fetchLogs({ page: item.p })}
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
                    onClick={() => fetchLogs({ page: page + 1 })}
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

      {selectedLog && (
        <ChangesModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </DashboardShell>
  );
}
