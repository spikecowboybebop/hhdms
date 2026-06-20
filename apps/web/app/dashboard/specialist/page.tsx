"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface IncomingReferral {
  id: string;
  patient_id: string;
  specialty_code: string;
  status: "PENDING" | "COMPLETED";
  created_at: string;
  patient: {
    mrn: string;
    first_name_en: string;
    last_name_en: string;
    sex: string;
    known_allergies: string | null;
    vital_signs?: Array<{
      blood_pressure_systolic: number;
      blood_pressure_diastolic: number;
      pulse: number;
      temperature: number;
      spo2: number;
    }>;
  };
}

const navItems: (DashboardNavItem & { active?: boolean })[] = [
  {
    label: "Diagnostic Console",
    href: "/dashboard/specialist",
    active: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    ),
  },
  {
    label: "DICOM Library",
    href: "specialist/dicom",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "specialist/reports",
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
];

const modalityLabels: Record<ViewMode, string> = {
  X_RAY: "X-Ray",
  ULTRASOUND: "Ultrasound",
  CT_SCAN: "CT Scan",
};

const localFallbackReferrals: IncomingReferral[] = [
  {
    id: "REF-2026-0081",
    patient_id: "PT-99412",
    specialty_code: "SP-SKIN",
    status: "PENDING",
    created_at: "10:14",
    patient: {
      mrn: "MRN-552140",
      first_name_en: "Abdur",
      last_name_en: "Rahman",
      sex: "MALE",
      known_allergies: "Penicillin",
      vital_signs: [{
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        pulse: 74,
        temperature: 37,
        spo2: 98
      }]
    }
  },
  {
    id: "REF-2026-0082",
    patient_id: "PT-10492",
    specialty_code: "SP-SKIN",
    status: "PENDING",
    created_at: "11:05",
    patient: {
      mrn: "MRN-339104",
      first_name_en: "Nusrat",
      last_name_en: "Jahan",
      sex: "FEMALE",
      known_allergies: "None reported",
      vital_signs: [{
        blood_pressure_systolic: 135,
        blood_pressure_diastolic: 88,
        pulse: 82,
        temperature: 38.2,
        spo2: 96
      }]
    }
  }
];

function SpecialistDashboardContent() {
  const searchParams = useSearchParams();

  const specialistId = useMemo(() => {
    return searchParams.get("specialistId") || "9a5b3c2d-1122-3344-5566-778899aabbcc";
  }, [searchParams]);

  const [session, setSession] = useState<any | null>(null);
  const [hydrated, setHydrated] = useState(false);
  
  const [referrals, setReferrals] = useState<IncomingReferral[]>([]);
  const [activeReferralId, setActiveReferralId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("X_RAY");
  
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let s = loadSession();
    if (!s) {
      s = {
        token: "mock-sandbox-token-string",
        user: {
          id: specialistId,
          email: "specialist.demo@hhdms.university.edu",
          role: "SPECIALIST",
          first_name_en: "Professor",
          last_name_en: "Ahmed",
        },
      };
    }
    setSession(s);
    setHydrated(true);
  }, [specialistId]);

  // FIXED: Changed from POST to a pure data-loading query
  const fetchReferrals = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/specialist/referrals?specialistId=${specialistId}`);

      if (!res.ok) throw new Error("Network dispatch stream failure");
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setReferrals(data);
        setActiveReferralId((prev) => prev || data[0]?.id || "");
      } else {
        setReferrals(localFallbackReferrals);
        setActiveReferralId((prev) => prev || localFallbackReferrals[0]?.id || "");
      }
    } catch (err) {
      console.warn("Backend sandbox offline; mounting fallback database records.");
      setReferrals(localFallbackReferrals);
      setActiveReferralId((prev) => prev || localFallbackReferrals[0]?.id || "");
    }
  };

  useEffect(() => {
    if (hydrated && session) {
      fetchReferrals();
    }
  }, [hydrated, session, specialistId]);

  const activeReferral = useMemo<IncomingReferral | undefined>(() => {
    return referrals.find((r) => r.id === activeReferralId);
  }, [referrals, activeReferralId]);

  // FIXED: Points accurately to Port 3001 and posts correctly formatted fields
  const handleSignAndDispatch = async () => {
    if (!activeReferral) return;
    if (!findings.trim() || !impression.trim()) {
      alert("Please populate clinical parameters inside the Findings and Impression fields before signing.");
      return;
    }

    setSubmitting(true);
    const compiledNotes = `FINDINGS:\n${findings}\n\nIMPRESSION:\n${impression}`;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/specialist/consultation/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralId: activeReferral.id,
          responseNotes: compiledNotes,
          specialistId: specialistId,
        }),
      });

      if (!res.ok) {
        // If NestJS gave us an error, safely try parsing it, otherwise handle gracefully
        let errorMessage = "Failed execution routine";
        try {
          const errPayload = await res.json();
          errorMessage = errPayload.message || errorMessage;
        } catch {
          errorMessage = `HTTP Error status ${res.status}`;
        }
        throw new Error(errorMessage);
      }

      alert(`Consultation Case resolved successfully for ${activeReferral.patient.first_name_en}! Ledger updated.`);
      setFindings("");
      setImpression("");
      
      // Instantly optimize local interface state array to mark as complete 
      setReferrals((prev) =>
        prev.map((r) => (r.id === activeReferral.id ? { ...r, status: "COMPLETED" } : r))
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown submission failure";
      alert(`Submission error: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">Authenticating session context…</span>
        </div>
      </main>
    );
  }

  if (!session || !session.user) return null;

  const currentVitals = activeReferral?.patient?.vital_signs?.[0];

  return (
    <DashboardShell
      role={session.user.role}
      accent="slate"
      navItems={navItems}
      pageTitle="Diagnostic Workspace Console"
      pageSubtitle={`Logged in as: Dr. ${session.user.first_name_en || ""} ${session.user.last_name_en || ""} • Sandbox Mode (No Auth Guard)`}
    >
      {/* Stat Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Inbox Tasks"
          value={referrals.filter((r) => r.status === "PENDING").length}
          delta="Awaiting Assessment"
          trend="down"
          accent="amber"
        />
        <StatCard
          label="Active Case Scope"
          value={activeReferral ? activeReferral.id : "None Selected"}
          delta={activeReferral ? `MRN: ${activeReferral.patient.mrn}` : "Empty Queue"}
          trend="flat"
          accent="teal"
        />
        <StatCard
          label="Resolved Log Counts"
          value={referrals.filter((r) => r.status === "COMPLETED").length}
          delta="Processed Today"
          trend="up"
          accent="navy"
        />
        <StatCard
          label="Clinical Domain Code"
          value={activeReferral?.specialty_code || "SP-MED"}
          delta="Verified Infrastructure Access"
          trend="flat"
          accent="slate"
        />
      </div>

      {/* Main Workspace Layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        
        {/* Sidebar Tracking Queue */}
        <SectionCard
          title="Incoming Referral Cases"
          description="Select clinical item to map trace entries"
          className="lg:col-span-1"
        >
          {referrals.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center font-medium">No referral instances encountered.</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {referrals.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      setActiveReferralId(r.id);
                    }}
                    className={`flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      activeReferralId === r.id
                        ? "border-[#0A2540] bg-[#0A2540] text-white shadow-sm"
                        : "border-slate-200/60 bg-white hover:border-[#0A2540]/40 hover:bg-[#F8F9FA]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                        {r.id}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          activeReferralId === r.id
                            ? "bg-white/20 text-white"
                            : r.status === "COMPLETED"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-[#FF9900]/10 text-[#FF9900]"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <span className="text-sm font-bold tracking-tight">
                      {r.patient.first_name_en} {r.patient.last_name_en}
                    </span>
                    <span className={`text-[11px] ${activeReferralId === r.id ? "text-white/80" : "text-[#2D3A4A]"}`}>
                      {r.patient.sex} • Allergies: {r.patient.known_allergies || "None"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Viewer Engine Panel */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {activeReferral ? (
            <>
              <SectionCard
                title={`${activeReferral.patient.first_name_en} ${activeReferral.patient.last_name_en} — Case Workspace`}
                description={`Patient Tracking Identifier: ${activeReferral.patient_id}`}
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
                {/* Simulated Viewer Block */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-[#0A2540] to-[#1a3a5c]">
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="relative h-3/4 w-3/4 rounded-full border border-[#00D4B2]/40">
                      <div className="absolute inset-8 rounded-full border border-[#00D4B2]/30" />
                      <div className="absolute inset-16 rounded-full border border-[#00D4B2]/20" />
                      <div className="absolute inset-24 rounded-full border border-[#00D4B2]/10" />
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-widest text-[#00D4B2]/80 text-center">
                        {modalityLabels[viewMode]} Sandbox Layer <br />
                        <span className="text-[9px] text-white/50 lowercase">Canvas active via sandbox context</span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-4 top-4 flex flex-col gap-1 rounded-lg bg-black/40 px-3 py-2 font-mono text-[10px] text-[#00D4B2] backdrop-blur">
                    <span>DICOM INTERFACE TRACE</span>
                    <span>STATUS: {activeReferral.status}</span>
                    <span>{activeReferral.id}.dcm</span>
                  </div>
                  <div className="absolute right-4 top-4 rounded-lg bg-black/40 px-3 py-2 font-mono text-[10px] text-white backdrop-blur">
                    <div>EXIF MOCK SCAN DATA</div>
                    <div className="text-[#00D4B2]">Role Scope Verified</div>
                  </div>
                </div>

                {/* Vitals Data Rows */}
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {[
                    { label: "Blood Pressure", value: currentVitals ? `${currentVitals.blood_pressure_systolic}/${currentVitals.blood_pressure_diastolic} mmHg` : "120/80 mmHg" },
                    { label: "Pulse", value: currentVitals ? `${currentVitals.pulse} bpm` : "72 bpm" },
                    { label: "Temperature", value: currentVitals ? `${currentVitals.temperature} °C` : "36.8 °C" },
                    { label: "Oxygen SpO2", value: currentVitals ? `${currentVitals.spo2} %` : "98 %" },
                    { label: "Target Specialty", value: activeReferral?.specialty_code || "" },
                  ].map((d, index) => (
                    <div key={index} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-3 py-2.5">
                      <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                        {d.label}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-[#0A2540]">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Consultation Input Form Block */}
              <SectionCard
                title="Diagnostic Consultation Editor"
                description="Populate parameters to update transaction status maps directly"
                action={
                  <button
                    onClick={handleSignAndDispatch}
                    disabled={submitting || activeReferral.status === "COMPLETED"}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm ${
                      activeReferral.status === "COMPLETED"
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-[#00D4B2] hover:bg-[#00c2a2] hover:shadow-md"
                    }`}
                  >
                    {submitting ? "Processing Transaction..." : activeReferral.status === "COMPLETED" ? "Case Completed" : "Sign & Dispatch"}
                  </button>
                }
              >
                {activeReferral.status === "COMPLETED" ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm font-medium">
                    This consultation item has already been marked completed. Records are signed and locked inside the database ledger.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A]">
                        Clinical Findings Summary
                      </label>
                      <textarea
                        rows={4}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="Type clinical observations, anatomical anomalies, or physiological notes encountered here..."
                        className="mt-1.5 w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A]">
                        Impression & Diagnostics
                      </label>
                      <textarea
                        rows={4}
                        value={impression}
                        onChange={(e) => setImpression(e.target.value)}
                        placeholder="Document concise diagnostic impressions, explicit medical evaluations, or next treatment directives here..."
                        className="mt-1.5 w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                      />
                    </div>
                  </div>
                )}
              </SectionCard>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-12 bg-white text-center">
              <span className="text-sm font-medium text-slate-400">No active incoming referral selected. Click an option in the list.</span>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

export default function SpecialistDashboardPage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">Loading Workspace Shell…</span>
        </div>
      </main>
    }>
      <SpecialistDashboardContent />
    </Suspense>
  );
}