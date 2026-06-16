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
  dashboardPathForRole,
  loadSession,
  type StoredSession,
} from "@/lib/auth";

interface TriagePatient {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F";
  complaint: string;
  bp: string;
  hr: number;
  spo2: number;
  temp: string;
  icdCode?: string;
  status: "WAITING" | "IN_TRIAGE" | "REFERRED";
  assignedAt: string;
}

const mockPatients: TriagePatient[] = [
  {
    id: "PT-00981",
    name: "Rezaul Karim",
    age: 54,
    sex: "M",
    complaint: "Chest tightness, radiating to left arm",
    bp: "158/96",
    hr: 102,
    spo2: 94,
    temp: "37.8°C",
    status: "IN_TRIAGE",
    assignedAt: "10:08",
  },
  {
    id: "PT-00982",
    name: "Mahmuda Khatun",
    age: 32,
    sex: "F",
    complaint: "Persistent high fever with productive cough",
    bp: "118/74",
    hr: 96,
    spo2: 97,
    temp: "39.4°C",
    icdCode: "J18.9",
    status: "IN_TRIAGE",
    assignedAt: "10:14",
  },
  {
    id: "PT-00983",
    name: "Sabbir Ahmed",
    age: 19,
    sex: "M",
    complaint: "Severe abdominal pain, nausea",
    bp: "108/70",
    hr: 88,
    spo2: 99,
    temp: "37.0°C",
    status: "WAITING",
    assignedAt: "10:19",
  },
  {
    id: "PT-00984",
    name: "Ferdousi Begum",
    age: 67,
    sex: "F",
    complaint: "Dizziness and intermittent palpitations",
    bp: "142/88",
    hr: 76,
    spo2: 96,
    temp: "36.8°C",
    icdCode: "I49.9",
    status: "WAITING",
    assignedAt: "10:24",
  },
];

const navItems: DashboardNavItem[] = [
  {
    label: "Triage Queue",
    href: "/dashboard/mbbs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: "Active Consults",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Prescriptions",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    label: "ICD-10 Catalog",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "My Schedule",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

export default function MbbsDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<TriagePatient | null>(
    mockPatients[0] ?? null,
  );
  const [icdQuery, setIcdQuery] = useState("");

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "MBBS_DOCTOR") {
      router.replace(dashboardPathForRole(s.user.role));
    }
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

  return (
    <DashboardShell
      role={session.user.role}
      accent="navy"
      navItems={navItems}
      pageTitle="Clinical Triage Gateway"
      pageSubtitle="Rapid patient intake, vitals capture, and ICD-10 diagnostic mapping"
    >
      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="In My Queue"
          value={mockPatients.filter((p) => p.status === "WAITING").length}
          delta="2 escalated in last 10m"
          trend="down"
          accent="navy"
        />
        <StatCard
          label="In Triage"
          value={mockPatients.filter((p) => p.status === "IN_TRIAGE").length}
          delta="Avg 6m 12s"
          trend="flat"
          accent="teal"
        />
        <StatCard
          label="Referred Today"
          value="14"
          delta="3 to Cardiology"
          trend="up"
          accent="amber"
        />
        <StatCard
          label="BMDC Verified"
          value="A-12984"
          delta="Signature active"
          trend="flat"
          accent="slate"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Patient list */}
        <SectionCard
          title="Awaiting Triage"
          description="Sorted by intake time"
          className="lg:col-span-2"
          action={
            <span className="rounded-full bg-[#0A2540] px-2.5 py-1 text-[10px] font-semibold text-[#00D4B2]">
              {mockPatients.length} cases
            </span>
          }
        >
          <ul className="flex flex-col gap-2">
            {mockPatients.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelected(p)}
                  className={`flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-all ${
                    selected?.id === p.id
                      ? "border-[#0A2540] bg-[#0A2540] text-white shadow-sm"
                      : "border-slate-200/60 bg-white hover:border-[#0A2540]/40 hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                      {p.id} • {p.assignedAt}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                        p.status === "WAITING"
                          ? selected?.id === p.id
                            ? "bg-white/20 text-white"
                            : "bg-[#FF9900]/10 text-[#FF9900]"
                          : selected?.id === p.id
                            ? "bg-[#00D4B2] text-[#0A2540]"
                            : "bg-[#00D4B2]/10 text-[#00D4B2]"
                      }`}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold tracking-tight">
                      {p.name}
                    </span>
                    <span className="text-[11px] opacity-70">
                      {p.age}{p.sex === "M" ? "M" : "F"}
                    </span>
                  </div>
                  <span
                    className={`text-xs leading-snug ${selected?.id === p.id ? "text-white/80" : "text-[#2D3A4A]"}`}
                  >
                    {p.complaint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Detail + vitals */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {selected && (
            <SectionCard
              title={`Triage Dossier — ${selected.name}`}
              description={`${selected.age}-year-old ${selected.sex === "M" ? "male" : "female"} • ${selected.id}`}
              action={
                <div className="flex gap-2">
                  <button className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-[11px] font-semibold text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540]">
                    Save Draft
                  </button>
                  <button className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-md">
                    Sign & Refer →
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Blood Pressure", value: selected.bp, unit: "mmHg" },
                  { label: "Heart Rate", value: String(selected.hr), unit: "bpm" },
                  { label: "SpO₂", value: String(selected.spo2), unit: "%" },
                  { label: "Temperature", value: selected.temp, unit: "" },
                ].map((v) => (
                  <div
                    key={v.label}
                    className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3"
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      {v.label}
                    </span>
                    <span className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold tracking-tight text-[#0A2540]">
                        {v.value}
                      </span>
                      <span className="text-[10px] text-[#2D3A4A]">{v.unit}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <label
                  htmlFor="icd"
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]"
                >
                  ICD-10 Diagnostic Catalog
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-3 py-2 focus-within:border-[#0A2540] focus-within:ring-2 focus-within:ring-[#00D4B2]/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2D3A4A]">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    id="icd"
                    placeholder="Search ICD-10 (e.g., I10, J18.9, R07.9)…"
                    value={icdQuery}
                    onChange={(e) => setIcdQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#0A2540] placeholder:text-slate-400 outline-none"
                  />
                  {selected.icdCode && (
                    <span className="rounded-full bg-[#00D4B2]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#00D4B2]">
                      {selected.icdCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <label
                  htmlFor="notes"
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]"
                >
                  Clinical Notes
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  placeholder="Document subjective findings, assessment, and plan…"
                  className="w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                />
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Recent Referrals"
            description="Patients handed off to specialists"
          >
            <ul className="flex flex-col gap-3">
              {[
                {
                  name: "Md. Jubayer Hossain",
                  to: "Cardiology",
                  icd: "I20.9",
                  when: "08:42",
                },
                {
                  name: "Ayesha Siddika",
                  to: "Pulmonology",
                  icd: "J45.901",
                  when: "09:11",
                },
                {
                  name: "Tareq Aziz",
                  to: "Gastroenterology",
                  icd: "K29.70",
                  when: "09:55",
                },
              ].map((r) => (
                <li
                  key={r.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-[#0A2540]">
                      {r.name}
                    </span>
                    <span className="text-[11px] text-[#2D3A4A]">
                      Referred to {r.to} • ICD-10 {r.icd}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#2D3A4A]">
                    {r.when}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  );
}
