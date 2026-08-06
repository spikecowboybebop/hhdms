"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import {
  SectionCard,
  StatCard,
} from "@/components/dashboard/dashboard-cards";
import {
  adminApi,
  type DashboardStats,
} from "@/lib/admin-api";
import {
  loadSession,
  dashboardPathForRole,
  type StoredSession,
} from "@/lib/auth";

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

const serviceStatusStyles: Record<string, string> = {
  ASSIGNED: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
  PENDING: "bg-slate-100 text-[#2D3A4A] border-slate-200",
  COMPLETED: "bg-[#2D3A4A]/10 text-[#2D3A4A] border-[#2D3A4A]/20",
  EMERGENCY: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
};

function formatBDT(value: number): string {
  return `৳${value.toLocaleString("en-IN")}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      return;
    }

    adminApi
      .getDashboardStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

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

  const pending = stats?.recentTickets.filter(
    (t) => t.status === "PENDING",
  ) ?? [];

  const maxRevenue = Math.max(
    1,
    ...(stats?.revenueSeries.map((d) => d.value) ?? []),
  );

  return (
    <DashboardShell
      role={session.user.role}
      accent="navy"
      navItems={navItems}
      pageTitle="Operations & Analytics Hub"
      pageSubtitle="Central oversight of bookings, revenue, staff and dispatch"
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-10 text-center shadow-sm">
          <span className="text-sm font-medium text-[#2D3A4A]">
            Loading dashboard…
          </span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold text-red-600">
            Failed to load dashboard data.
          </p>
          <p className="mt-1 text-xs text-red-500">{error}</p>
        </div>
      ) : stats ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Bookings Today"
              value={stats.kpis.bookingsToday}
              delta={`${stats.kpis.totalTickets} tickets total`}
              trend="flat"
              accent="navy"
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
              label="Pending Dispatch"
              value={stats.kpis.pendingTickets}
              delta={`${stats.kpis.assignedTickets} assigned`}
              trend={stats.kpis.pendingTickets > 0 ? "down" : "up"}
              accent="amber"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5" />
                  <path d="M8 3H3v5" />
                  <path d="M3 16v5h5" />
                  <path d="M16 21h5v-5" />
                  <path d="M12 12l6-6" />
                  <path d="M12 12L6 6" />
                </svg>
              }
            />
            <StatCard
              label="Revenue Collected"
              value={formatBDT(stats.kpis.revenueTotal)}
              delta={`${formatBDT(stats.kpis.revenueMonth)} this month`}
              trend="flat"
              accent="teal"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <StatCard
              label="Active Providers"
              value={stats.kpis.activeProviders}
              delta="across all staff roles"
              trend="flat"
              accent="slate"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
          </div>

          {/* Revenue chart + Service mix */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard
              title="Weekly Revenue"
              description="Collected payments, last 7 days (BDT)"
              className="lg:col-span-2"
            >
              <div className="flex h-48 items-end justify-between gap-3">
                {stats.revenueSeries.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#2D3A4A]">
                      {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
                    </span>
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-[#0A2540] to-[#00D4B2] transition-all hover:opacity-80"
                      style={{ height: `${(d.value / maxRevenue) * 140}px` }}
                    />
                    <span className="text-[10px] font-semibold uppercase text-[#2D3A4A]/70">
                      {d.day}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Service Mix"
              description="Tickets by service type"
            >
              <ul className="flex flex-col gap-3">
                {stats.serviceMix.map((s) => (
                  <li key={s.service_type} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0A2540]">
                        {s.service_type}
                      </span>
                      <span className="text-[#2D3A4A]">
                        {s.count} · {formatBDT(s.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#00D4B2]"
                        style={{
                          width: `${stats.serviceMix.length ? (s.count / stats.serviceMix.map((m) => m.count).reduce((a, b) => a + b, 0)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          {/* Recent tickets */}
          <div className="mt-6">
            <SectionCard
              title="Recent Tickets"
              description="Latest service tickets across all call center agents"
              action={
                <span className="rounded-full border border-slate-200/60 bg-[#F8F9FA] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                  Live
                </span>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      <th className="py-3 pr-4">Ticket</th>
                      <th className="py-3 pr-4">Patient</th>
                      <th className="py-3 pr-4">Service</th>
                      <th className="py-3 pr-4">Base Fee</th>
                      <th className="py-3 pr-4">Schedule</th>
                      <th className="py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentTickets.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F9FA]"
                      >
                        <td className="py-3 pr-4 font-mono text-xs font-semibold text-[#0A2540]">
                          {b.ticket_no}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-[#0A2540]">
                          {b.patient?.full_name ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                          {b.service_type}
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold text-[#0A2540]">
                          {b.price != null ? formatBDT(b.price) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                          {b.scheduled_date
                            ? new Date(b.scheduled_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${serviceStatusStyles[b.status] ?? "bg-slate-100 text-[#2D3A4A] border-slate-200"}`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* Dispatch attention + staff */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard
              title="Needs Routing"
              description="Tickets awaiting provider assignment"
              className="lg:col-span-2"
            >
              {pending.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#2D3A4A]">
                  All tickets are assigned. Nothing awaiting routing.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {pending.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-col gap-3 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FF9900] text-white">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </span>
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-bold text-[#0A2540]">
                            {e.ticket_no}
                          </span>
                          <span className="text-xs text-[#2D3A4A]">
                            {e.patient?.full_name ?? "Unknown patient"} · {e.service_type}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#FF9900]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#FF9900]">
                        Needs provider
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="On-Duty Staff"
              description="Active provider availability snapshot"
            >
              {stats.onDuty.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#2D3A4A]">
                  No active providers.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1">
                  <ul className="flex flex-col gap-3">
                    {stats.onDuty.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0A2540] text-xs font-bold text-[#00D4B2]">
                            {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs font-semibold text-[#0A2540]">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-[#2D3A4A]">
                              {s.role.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                            s.is_available
                              ? "bg-[#00D4B2]/10 text-[#00D4B2]"
                              : "bg-[#FF9900]/10 text-[#FF9900]"
                          }`}
                        >
                          {s.is_available ? "AVAILABLE" : "BUSY"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}