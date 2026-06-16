"use client";

import { useEffect, useMemo, useState } from "react";
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
  clearSession,
  loadSession,
  dashboardPathForRole,
  type StoredSession,
} from "@/lib/auth";

interface CallTicket {
  id: string;
  caller: string;
  phone: string;
  district: string;
  urgency: "EMERGENCY" | "URGENT" | "ROUTINE";
  channel: "PHONE" | "WHATSAPP" | "WEB";
  receivedAt: string;
  status: "QUEUED" | "ROUTED" | "IN_PROGRESS" | "RESOLVED";
}

const mockTickets: CallTicket[] = [
  {
    id: "TKT-2026-00421",
    caller: "Rahima Begum",
    phone: "+880 1711 234 567",
    district: "Dhaka — Mohammadpur",
    urgency: "EMERGENCY",
    channel: "PHONE",
    receivedAt: "09:42",
    status: "ROUTED",
  },
  {
    id: "TKT-2026-00422",
    caller: "Karim Hossain",
    phone: "+880 1912 887 412",
    district: "Chattogram — Halishahar",
    urgency: "URGENT",
    channel: "PHONE",
    receivedAt: "09:51",
    status: "IN_PROGRESS",
  },
  {
    id: "TKT-2026-00423",
    caller: "Sumi Akter",
    phone: "+880 1611 555 019",
    district: "Sylhet — Zindabazar",
    urgency: "ROUTINE",
    channel: "WHATSAPP",
    receivedAt: "10:03",
    status: "QUEUED",
  },
  {
    id: "TKT-2026-00424",
    caller: "Mohammad Faruk",
    phone: "+880 1532 908 220",
    district: "Khulna — Sonadanga",
    urgency: "URGENT",
    channel: "PHONE",
    receivedAt: "10:11",
    status: "ROUTED",
  },
  {
    id: "TKT-2026-00425",
    caller: "Nazia Tabassum",
    phone: "+880 1700 442 113",
    district: "Rajshahi — Boalia",
    urgency: "ROUTINE",
    channel: "WEB",
    receivedAt: "10:18",
    status: "QUEUED",
  },
  {
    id: "TKT-2026-00426",
    caller: "Ibrahim Khalil",
    phone: "+880 1822 700 991",
    district: "Rangpur — Kotbari",
    urgency: "EMERGENCY",
    channel: "PHONE",
    receivedAt: "10:24",
    status: "ROUTED",
  },
];

const navItems: DashboardNavItem[] = [
  {
    label: "Live Queue",
    href: "/dashboard/call-center",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    label: "Dispatch Board",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Caller History",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    label: "Agent Roster",
    href: "#",
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
    label: "Field Units",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13z" />
        <circle cx="12" cy="9" r="3" />
      </svg>
    ),
  },
];

const urgencyStyles: Record<CallTicket["urgency"], string> = {
  EMERGENCY: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
  URGENT: "bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20",
  ROUTINE: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
};

const statusStyles: Record<CallTicket["status"], string> = {
  QUEUED: "bg-slate-100 text-[#2D3A4A] border-slate-200",
  ROUTED: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
  IN_PROGRESS: "bg-[#0A2540] text-white border-[#0A2540]",
  RESOLVED: "bg-[#2D3A4A]/10 text-[#2D3A4A] border-[#2D3A4A]/20",
};

export default function CallCenterDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<"ALL" | CallTicket["urgency"]>("ALL");

  // Guard the route: if no session or wrong role → bounce.
  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);

    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "CALL_CENTER_AGENT") {
      router.replace(dashboardPathForRole(s.user.role));
    }
  }, [router]);

  const filteredTickets = useMemo(() => {
    if (filter === "ALL") return mockTickets;
    return mockTickets.filter((t) => t.urgency === filter);
  }, [filter]);

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
      accent="teal"
      navItems={navItems}
      pageTitle="Call Intake & Routing Hub"
      pageSubtitle="Real-time emergency triage queue and clinician dispatch console"
    >
      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Calls Today"
          value="142"
          delta="+12% vs. yesterday"
          trend="up"
          accent="teal"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          }
        />
        <StatCard
          label="Emergency Cases"
          value="18"
          delta="3 awaiting dispatch"
          trend="down"
          accent="amber"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <StatCard
          label="Avg. Queue Time"
          value="11m 24s"
          delta="−3m vs. yesterday"
          trend="up"
          accent="navy"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          label="Field Units Active"
          value="84"
          delta="Verified via GPS"
          trend="flat"
          accent="slate"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          }
        />
      </div>

      {/* Live call queue */}
      <div className="mt-6">
        <SectionCard
          title="Live Triage Queue"
          description="Incoming requests awaiting clinician routing"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {(["ALL", "EMERGENCY", "URGENT", "ROUTINE"] as const).map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-all ${
                      filter === key
                        ? "border-[#0A2540] bg-[#0A2540] text-white"
                        : "border-slate-200/60 bg-white text-[#2D3A4A] hover:border-[#0A2540] hover:text-[#0A2540]"
                    }`}
                  >
                    {key}
                  </button>
                ),
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                  <th className="py-3 pr-4">Ticket</th>
                  <th className="py-3 pr-4">Caller</th>
                  <th className="py-3 pr-4">District</th>
                  <th className="py-3 pr-4">Urgency</th>
                  <th className="py-3 pr-4">Channel</th>
                  <th className="py-3 pr-4">Received</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F9FA]"
                  >
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-[#0A2540]">
                      {t.id}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-[#0A2540]">
                          {t.caller}
                        </span>
                        <span className="font-mono text-[10px] text-[#2D3A4A]">
                          {t.phone}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                      {t.district}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${urgencyStyles[t.urgency]}`}
                      >
                        {t.urgency}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-[#2D3A4A]">
                      {t.channel}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[#2D3A4A]">
                      {t.receivedAt}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[t.status]}`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-md">
                        Route →
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-xs text-[#2D3A4A]"
                    >
                      No tickets match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* Bottom row: emergency ribbon + agents */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Emergency Ribbon"
          description="Top-priority dispatches in the last 60 minutes"
          className="lg:col-span-2"
        >
          <ul className="flex flex-col gap-3">
            {mockTickets
              .filter((t) => t.urgency === "EMERGENCY")
              .map((t) => (
                <li
                  key={t.id}
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
                        {t.caller}
                      </span>
                      <span className="text-xs text-[#2D3A4A]">
                        {t.district} • {t.phone}
                      </span>
                      <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#FF9900]">
                        {t.id} • received {t.receivedAt}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => clearSession()}
                    className="rounded-lg bg-[#0A2540] px-3 py-2 text-[11px] font-semibold text-white transition-all hover:shadow-md"
                  >
                    Dispatch Unit
                  </button>
                </li>
              ))}
          </ul>
        </SectionCard>

        <SectionCard title="On-Duty Agents" description="Active call center roster">
          <ul className="flex flex-col gap-3">
            {[
              { name: "Tania Sultana", calls: 24, status: "ON CALL" },
              { name: "Arif Mahmud", calls: 19, status: "AVAILABLE" },
              { name: "Sadia Rahman", calls: 31, status: "ON CALL" },
              { name: "Riyad Khan", calls: 12, status: "BREAK" },
            ].map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0A2540] text-xs font-bold text-[#00D4B2]">
                    {a.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-semibold text-[#0A2540]">
                      {a.name}
                    </span>
                    <span className="text-[10px] text-[#2D3A4A]">
                      {a.calls} calls today
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                    a.status === "ON CALL"
                      ? "bg-[#00D4B2]/10 text-[#00D4B2]"
                      : a.status === "AVAILABLE"
                        ? "bg-[#0A2540]/10 text-[#0A2540]"
                        : "bg-[#FF9900]/10 text-[#FF9900]"
                  }`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
