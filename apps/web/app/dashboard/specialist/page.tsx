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
  dashboardPathForRole,
  loadSession,
  type StoredSession,
} from "@/lib/auth";

type ViewMode = "X_RAY" | "ULTRASOUND" | "CT_SCAN";

interface ImagingStudy {
  id: string;
  patient: string;
  modality: "X_RAY" | "ULTRASOUND" | "CT_SCAN";
  bodyPart: string;
  referredBy: string;
  priority: "STAT" | "URGENT" | "ROUTINE";
  receivedAt: string;
  status: "PENDING" | "IN_REVIEW" | "REPORTED";
}

const mockStudies: ImagingStudy[] = [
  {
    id: "IMG-2026-0142",
    patient: "Rezaul Karim",
    modality: "X_RAY",
    bodyPart: "Chest PA View",
    referredBy: "Dr. M. Iqbal (MBBS)",
    priority: "STAT",
    receivedAt: "10:01",
    status: "IN_REVIEW",
  },
  {
    id: "IMG-2026-0143",
    patient: "Mahmuda Khatun",
    modality: "CT_SCAN",
    bodyPart: "Chest — High Resolution",
    referredBy: "Dr. M. Iqbal (MBBS)",
    priority: "URGENT",
    receivedAt: "10:09",
    status: "PENDING",
  },
  {
    id: "IMG-2026-0144",
    patient: "Tareq Aziz",
    modality: "ULTRASOUND",
    bodyPart: "Whole Abdomen",
    referredBy: "Dr. F. Rahman (MBBS)",
    priority: "ROUTINE",
    receivedAt: "10:14",
    status: "PENDING",
  },
  {
    id: "IMG-2026-0145",
    patient: "Ferdousi Begum",
    modality: "X_RAY",
    bodyPart: "Cervical Spine AP/Lat",
    referredBy: "Dr. S. Khan (MBBS)",
    priority: "ROUTINE",
    receivedAt: "10:22",
    status: "REPORTED",
  },
];

const navItems: DashboardNavItem[] = [
  {
    label: "Diagnostic Console",
    href: "/dashboard/specialist",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    ),
  },
  {
    label: "DICOM Library",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    label: "Tele-Consult",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    label: "Specialty Codes",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
];

const modalityLabels: Record<ViewMode, string> = {
  X_RAY: "X-Ray",
  ULTRASOUND: "Ultrasound",
  CT_SCAN: "CT Scan",
};

const priorityStyles: Record<ImagingStudy["priority"], string> = {
  STAT: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
  URGENT: "bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20",
  ROUTINE: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
};

const statusStyles: Record<ImagingStudy["status"], string> = {
  PENDING: "bg-slate-100 text-[#2D3A4A] border-slate-200",
  IN_REVIEW: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
  REPORTED: "bg-[#0A2540] text-white border-[#0A2540]",
};

export default function SpecialistDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeStudyId, setActiveStudyId] = useState<string>(
    mockStudies[0]!.id,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(mockStudies[0]!.modality);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "SPECIALIST") {
      router.replace(dashboardPathForRole(s.user.role));
    }
  }, [router]);

  const activeStudy = useMemo<ImagingStudy>(
    () => mockStudies.find((s) => s.id === activeStudyId) ?? mockStudies[0]!,
    [activeStudyId],
  );

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
      accent="slate"
      navItems={navItems}
      pageTitle="Diagnostic Workspace Console"
      pageSubtitle="DICOM-aware imaging review, layered diagnostics, and digital signature"
    >
      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Studies in Queue"
          value={mockStudies.filter((s) => s.status === "PENDING").length}
          delta="1 STAT pending"
          trend="down"
          accent="amber"
        />
        <StatCard
          label="Reporting Now"
          value={mockStudies.filter((s) => s.status === "IN_REVIEW").length}
          delta="Avg report 8m"
          trend="flat"
          accent="teal"
        />
        <StatCard
          label="Reported Today"
          value="22"
          delta="+5 vs. yesterday"
          trend="up"
          accent="navy"
        />
        <StatCard
          label="Specialty"
          value="RAD — Radiologist"
          delta="BMDC Verified"
          trend="flat"
          accent="slate"
        />
      </div>

      {/* Main viewer */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Study list */}
        <SectionCard
          title="Imaging Queue"
          description="Awaiting specialist interpretation"
          className="lg:col-span-1"
        >
          <ul className="flex flex-col gap-2">
            {mockStudies.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setActiveStudyId(s.id);
                    setViewMode(s.modality);
                  }}
                  className={`flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    activeStudyId === s.id
                      ? "border-[#0A2540] bg-[#0A2540] text-white"
                      : "border-slate-200/60 bg-white hover:border-[#0A2540]/40 hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                      {s.id}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                        activeStudyId === s.id
                          ? "bg-white/20 text-white"
                          : priorityStyles[s.priority]
                      }`}
                    >
                      {s.priority}
                    </span>
                  </div>
                  <span className="text-sm font-bold tracking-tight">
                    {s.patient}
                  </span>
                  <span
                    className={`text-[11px] ${activeStudyId === s.id ? "text-white/80" : "text-[#2D3A4A]"}`}
                  >
                    {modalityLabels[s.modality]} • {s.bodyPart}
                  </span>
                  <span
                    className={`text-[10px] ${activeStudyId === s.id ? "text-white/60" : "text-[#2D3A4A]/70"}`}
                  >
                    {s.referredBy} • {s.receivedAt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Viewer + metadata */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <SectionCard
            title={`${activeStudy.patient} — ${modalityLabels[activeStudy.modality]} (${activeStudy.bodyPart})`}
            description={`Study ${activeStudy.id} • Referred by ${activeStudy.referredBy}`}
            action={
              <div className="flex gap-1 rounded-full border border-slate-200/60 bg-[#F8F9FA] p-1 text-[10px] font-bold uppercase tracking-widest">
                {(["X_RAY", "ULTRASOUND", "CT_SCAN"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={`rounded-full px-3 py-1 transition-all ${
                      viewMode === v
                        ? "bg-[#0A2540] text-white shadow-sm"
                        : "text-[#2D3A4A] hover:text-[#0A2540]"
                    }`}
                  >
                    {modalityLabels[v]}
                  </button>
                ))}
              </div>
            }
          >
            {/* Simulated dark viewer */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-[#0A2540] to-[#1a3a5c]">
              <div className="absolute inset-0 grid place-items-center">
                <div className="relative h-3/4 w-3/4 rounded-full border border-[#00D4B2]/40">
                  <div className="absolute inset-8 rounded-full border border-[#00D4B2]/30" />
                  <div className="absolute inset-16 rounded-full border border-[#00D4B2]/20" />
                  <div className="absolute inset-24 rounded-full border border-[#00D4B2]/10" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-widest text-[#00D4B2]/80">
                    {modalityLabels[viewMode]} Layer Active
                  </div>
                </div>
              </div>

              {/* Floating HUD overlays */}
              <div className="absolute left-4 top-4 flex flex-col gap-1 rounded-lg bg-black/40 px-3 py-2 font-mono text-[10px] text-[#00D4B2] backdrop-blur">
                <span>DICOM • MONOCHROME2</span>
                <span>W: 4096 / L: 1024</span>
                <span>{activeStudy.id}.dcm</span>
              </div>
              <div className="absolute right-4 top-4 rounded-lg bg-black/40 px-3 py-2 font-mono text-[10px] text-white backdrop-blur">
                <div>EXIF: Resolution 2048×2048</div>
                <div className="text-[#00D4B2]">Window: Lung</div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 text-[10px] text-white backdrop-blur">
                <span className="font-mono uppercase tracking-widest">
                  Series 1/3 • Image 24/96
                </span>
                <span className="rounded-full bg-[#00D4B2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#0A2540]">
                  {activeStudy.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Modality", value: modalityLabels[activeStudy.modality] },
                { label: "Body Part", value: activeStudy.bodyPart },
                { label: "Slice Thickness", value: "0.625 mm" },
                { label: "Exposure", value: "120 kVp / 250 mAs" },
              ].map((d) => (
                <div
                  key={d.label}
                  className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-3 py-2.5"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                    {d.label}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#0A2540]">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Reporting panel */}
          <SectionCard
            title="Diagnostic Report"
            description="Findings and impression — auto-signed with BMDC credentials"
            action={
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusStyles[activeStudy.status]}`}
                >
                  {activeStudy.status.replace("_", " ")}
                </span>
                <button className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-md">
                  Sign & Dispatch
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                  Findings
                </label>
                <textarea
                  rows={5}
                  placeholder="Document detailed observations…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                  Impression & Recommendations
                </label>
                <textarea
                  rows={5}
                  placeholder="Concise clinical impression…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  );
}
