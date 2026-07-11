"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import {
  loadSession,
} from "@/lib/auth";
import type { ReferralChainEvent } from "@/lib/mbbs-api";
import { ReferralChainTimeline } from "@/components/mbbs/referral-chain-timeline";
import { TeleconsultModal } from "@/components/specialist/teleconsult-modal";

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

interface DiagnosisReport {
  id: string;
  file_url: string;
  file_name: string;
  report_type: string;
  generated_at: string;
  report_data?: unknown;
}

interface PatientDiagnosis {
  id: string;
  icd10_code: string;
  preliminary_diagnosis: string;
  chief_complaint?: string;
  examination_findings?: string;
  diagnosed_at: string;
  icd10?: { code: string; description: string } | null;
}

interface TestOrder {
  id: string;
  status: string;
  ordered_at: string;
  test?: { test_name: string; category: string } | null;
  results?: Array<{ value: string; is_abnormal: boolean }>;
}

interface Prescription {
  id: string;
  issued_at: string;
  medications?: Array<{
    generic_name: string;
    dosage: string;
    frequency: string;
    duration_days: number;
  }>;
}

interface PatientHistory {
  vitals: Array<{
    systolic_bp?: number;
    diastolic_bp?: number;
    pulse_bpm?: number;
    temperature_c?: number;
    spo2_pct?: number;
    recorded_at: string;
  }>;
  diagnoses: PatientDiagnosis[];
  prescriptions: Prescription[];
  test_orders: TestOrder[];
  referral_chain: ReferralChainEvent[];
  diagnosis_reports: DiagnosisReport[];
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
    href: "/dashboard/specialist/dicom",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/dashboard/specialist/reports",
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

function SpecialistDashboardContent() {
  const searchParams = useSearchParams();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<any | null>(null);
  const specialistId = useMemo(() => {
    return searchParams.get("specialistId") || session?.user?.id || "9a5b3c2d-1122-3344-5566-778899aabbcc";
  }, [searchParams, session]);
  const [hydrated, setHydrated] = useState(false);

  const [referrals, setReferrals] = useState<IncomingReferral[]>([]);
  const [activeReferralId, setActiveReferralId] = useState<string>("");
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clinicalTab, setClinicalTab] = useState("diagnoses");
  const [teleconsultOpen, setTeleconsultOpen] = useState(false);
  const [teleconsultSession, setTeleconsultSession] = useState<{
    id: string;
    room_name: string;
  } | null>(null);

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

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/specialist/referrals?specialistId=${specialistId}`);

      if (!res.ok) throw new Error("Failed to fetch referrals");
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setReferrals(data);
        setActiveReferralId((prev) => prev || data[0]?.id || "");
      } else {
        setReferrals([]);
        setActiveReferralId("");
      }
    } catch (err) {
      console.warn("Backend specialist endpoint unavailable; showing empty queue.", err);
      setReferrals([]);
      setActiveReferralId("");
    }
  }, [specialistId]);

  useEffect(() => {
    if (hydrated && session) {
      fetchReferrals();
    }
  }, [hydrated, session, fetchReferrals]);

  // Fetch patient history when active referral changes
  useEffect(() => {
    if (!activeReferralId) {
      setPatientHistory(null);
      return;
    }

    setHistoryLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/specialist/referral/${activeReferralId}/patient-history`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPatientHistory(data as PatientHistory | null))
      .catch(() => setPatientHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [activeReferralId]);

  const activeReferral = useMemo<IncomingReferral | undefined>(() => {
    return referrals.find((r) => r.id === activeReferralId);
  }, [referrals, activeReferralId]);

  const filteredReferrals = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase();
    return referrals.filter((r) =>
      `${r.patient.first_name_en} ${r.patient.last_name_en}`.toLowerCase().includes(q) ||
      r.patient.mrn.toLowerCase().includes(q)
    );
  }, [referrals, searchQuery]);

  const handleSignAndDispatch = async () => {
    if (!activeReferral) return;
    if (!findings.trim() || !impression.trim()) {
      alert("Please enter both findings and impression before signing.");
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
        let errorMessage = "Failed to submit consultation";
        try {
          const errPayload = await res.json();
          errorMessage = errPayload.message || errorMessage;
        } catch {
          errorMessage = `HTTP Error status ${res.status}`;
        }
        throw new Error(errorMessage);
      }

      alert(`Consultation completed for ${activeReferral.patient.first_name_en}!`);
      setFindings("");
      setImpression("");
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
          <span className="text-sm font-medium text-[#2D3A4A]">Loading workspace…</span>
        </div>
      </main>
    );
  }

  if (!session || !session.user) return null;

  const currentVitals = activeReferral?.patient?.vital_signs?.[0];
  const latestVitals = patientHistory?.vitals?.[0];

  // Use vitals from patientHistory if available (they have the real field names)
  const bpSystolic = latestVitals?.systolic_bp ?? currentVitals?.blood_pressure_systolic;
  const bpDiastolic = latestVitals?.diastolic_bp ?? currentVitals?.blood_pressure_diastolic;
  const pulse = latestVitals?.pulse_bpm ?? currentVitals?.pulse;
  const temp = latestVitals?.temperature_c ?? currentVitals?.temperature;
  const spo2 = latestVitals?.spo2_pct ?? currentVitals?.spo2;

  return (
    <DashboardShell
      role={session.user.role}
      accent="slate"
      navItems={navItems}
      pageTitle="Diagnostic Console"
      pageSubtitle={`Dr. ${session.user.first_name_en || ""} ${session.user.last_name_en || ""} • ${activeReferral?.specialty_code || "Specialist"}`}
    >
      {/* Main Workspace */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">

        {/* Left Panel — Referrals List */}
        <SectionCard
          title="Incoming Referrals"
          description={referrals.length > 0 ? `${referrals.length} case${referrals.length !== 1 ? 's' : ''} assigned` : "No cases assigned"}
        >
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]"
            />

            {filteredReferrals.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {referrals.length === 0 ? "No referrals to display" : "No matching patients"}
              </div>
            ) : (
              <ul className="flex flex-col gap-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                {filteredReferrals.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setActiveReferralId(r.id)}
                      className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        activeReferralId === r.id
                          ? "border-[#0A2540] bg-[#0A2540] text-white shadow-sm"
                          : "border-slate-200/60 bg-white hover:border-[#0A2540]/40 hover:bg-[#F8F9FA]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold tracking-tight">
                          {r.patient.first_name_en} {r.patient.last_name_en}
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
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] ${activeReferralId === r.id ? "text-white/70" : "text-slate-400"}`}>
                          {r.patient.mrn}
                        </span>
                        <span className={`text-[10px] ${activeReferralId === r.id ? "text-white/60" : "text-slate-400"}`}>
                          {r.patient.sex}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        {/* Right Panel — Case Workspace */}
        <div className="flex flex-col gap-6">
          {activeReferral ? (
            <>
              {/* Patient Info Card */}
              <SectionCard
                title={`${activeReferral.patient.first_name_en} ${activeReferral.patient.last_name_en}`}
                description={`MRN: ${activeReferral.patient.mrn} • ${activeReferral.patient.sex}`}
                action={
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      activeReferral.status === "PENDING"
                        ? "bg-[#FF9900]/10 text-[#FF9900]"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {activeReferral.status}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/teleconsult/sessions`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                referralId: activeReferral.id,
                                specialistId,
                              }),
                            },
                          );
                          if (!res.ok) {
                            let msg = `Server error (${res.status})`;
                            try {
                              const body = await res.json();
                              msg = body.message || body.error || msg;
                            } catch {}
                            throw new Error(msg);
                          }
                          const session = await res.json();
                          setTeleconsultSession({
                            id: session.id,
                            room_name: session.room_name,
                          });
                          setTeleconsultOpen(true);
                        } catch (err) {
                          console.error("Teleconsult error:", err);
                          alert(err instanceof Error ? err.message : "Failed to start teleconsultation. Please try again.");
                        }
                      }}
                      className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#00c2a2] transition shadow-sm flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Teleconsultation
                    </button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Allergies:</span>
                    <span className="text-sm text-[#0A2540]">
                      {activeReferral.patient.known_allergies || "None reported"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Vital Signs</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "BP", value: bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic}` : "—", unit: "mmHg" },
                        { label: "Pulse", value: pulse ?? "—", unit: "bpm" },
                        { label: "Temp", value: temp ?? "—", unit: "°C" },
                        { label: "SpO₂", value: spo2 ?? "—", unit: "%" },
                      ].map((v, i) => (
                        <div key={i} className="rounded-xl bg-[#F8F9FA] border border-slate-200/60 px-3 py-2.5">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">{v.label}</span>
                          <span className="mt-0.5 block text-sm font-bold text-[#0A2540]">{v.value} <span className="font-normal text-slate-400">{v.unit}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Diagnostic Reports — from actual DB data */}
              <SectionCard
                title="Diagnostic Reports"
                description={
                  historyLoading ? "Loading..." :
                  patientHistory?.diagnosis_reports?.length
                    ? `${patientHistory.diagnosis_reports.length} report${patientHistory.diagnosis_reports.length !== 1 ? 's' : ''} generated`
                    : "No reports generated"
                }
              >
                {historyLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
                  </div>
                ) : patientHistory?.diagnosis_reports?.length ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {patientHistory.diagnosis_reports.map((report) => (
                      <a
                        key={report.id}
                        href={report.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative rounded-xl border border-slate-200/60 bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0A2540]/5">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A2540" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#0A2540]">{report.file_name || 'Report'}</p>
                            <p className="text-[10px] text-slate-400">
                              {report.generated_at ? new Date(report.generated_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                        <span className="mt-2 inline-block rounded-full bg-[#00D4B2]/10 px-2 py-0.5 text-[9px] font-semibold text-[#00D4B2]">
                          {report.report_type}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-xs text-slate-400">No diagnostic reports have been generated for this patient</span>
                  </div>
                )}
              </SectionCard>

              {/* Clinical Assessment — MBBS doctor's findings */}
              {!historyLoading && patientHistory && (
                <SectionCard
                  title="Clinical Assessment"
                  description="Diagnoses, test orders, and prescriptions from the MBBS doctor"
                >
                  <div>
                    <div className="mb-4 flex gap-1 rounded-xl bg-[#F8F9FA] p-1 border border-slate-200/60 w-fit">
                      {[
                        { key: "diagnoses", label: "Diagnoses", count: patientHistory.diagnoses?.length },
                        { key: "test_orders", label: "Test Orders", count: patientHistory.test_orders?.length },
                        { key: "prescriptions", label: "Prescriptions", count: patientHistory.prescriptions?.length },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setClinicalTab(tab.key)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            clinicalTab === tab.key
                              ? "bg-white text-[#0A2540] shadow-sm"
                              : "text-slate-500 hover:text-[#0A2540]"
                          }`}
                        >
                          {tab.label}
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                            clinicalTab === tab.key ? "bg-[#0A2540] text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {tab.count ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>

                    {clinicalTab === "diagnoses" && (
                      <div>
                        {patientHistory.diagnoses?.length ? (
                          <ul className="flex flex-col gap-2">
                            {patientHistory.diagnoses.slice(0, 10).map((d) => (
                              <li key={d.id} className="rounded-lg border border-slate-200/60 bg-[#F8F9FA] px-3 py-2">
                                <p className="text-xs font-semibold text-[#0A2540]">{d.preliminary_diagnosis}</p>
                                {d.icd10 && (
                                  <p className="text-[10px] text-slate-500 font-mono">{d.icd10.code} — {d.icd10.description}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No diagnoses recorded</p>
                        )}
                      </div>
                    )}

                    {clinicalTab === "test_orders" && (
                      <div>
                        {patientHistory.test_orders?.length ? (
                          <ul className="flex flex-col gap-2">
                            {patientHistory.test_orders.slice(0, 10).map((t) => (
                              <li key={t.id} className="rounded-lg border border-slate-200/60 bg-[#F8F9FA] px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-[#0A2540]">{t.test?.test_name || 'Test'}</p>
                                  <span className={`text-[10px] font-medium ${t.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {t.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">Category: {t.test?.category || '—'}</p>
                                {t.results?.length ? (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {t.results.map((r, i) => (
                                      <span key={i} className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                                        r.is_abnormal ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {r.value}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No test orders</p>
                        )}
                      </div>
                    )}

                    {clinicalTab === "prescriptions" && (
                      <div>
                        {patientHistory.prescriptions?.length ? (
                          <ul className="flex flex-col gap-2">
                            {patientHistory.prescriptions.slice(0, 10).map((p) => (
                              <li key={p.id} className="rounded-lg border border-slate-200/60 bg-[#F8F9FA] px-3 py-2">
                                {p.medications?.map((m, i) => (
                                  <p key={i} className="text-xs font-semibold text-[#0A2540]">{m.generic_name} — {m.dosage}</p>
                                ))}
                                <p className="text-[10px] text-slate-500">
                                  {p.issued_at ? new Date(p.issued_at).toLocaleDateString() : ''}
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No prescriptions</p>
                        )}
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Care Timeline — Referral chain */}
              {!historyLoading && patientHistory && patientHistory.referral_chain?.length > 0 && (
                <SectionCard
                  title="Care Timeline"
                  description="Complete patient care journey"
                >
                  <ReferralChainTimeline events={patientHistory.referral_chain} />
                </SectionCard>
              )}

              {/* Consultation Editor */}
              <SectionCard
                title="Consultation Notes"
                description="Document your findings and diagnostic impression"
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
                    {submitting ? "Submitting..." : activeReferral.status === "COMPLETED" ? "Completed" : "Sign & Dispatch"}
                  </button>
                }
              >
                {activeReferral.status === "COMPLETED" ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm font-medium">
                    This consultation has been completed and signed.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Clinical Findings
                      </label>
                      <textarea
                        rows={5}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="Describe your clinical observations, anatomical findings, and any abnormalities detected..."
                        className="w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Impression & Diagnosis
                      </label>
                      <textarea
                        rows={5}
                        value={impression}
                        onChange={(e) => setImpression(e.target.value)}
                        placeholder="Document your diagnostic impression, differential diagnoses, and recommended next steps..."
                        className="w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                      />
                    </div>
                  </div>
                )}
              </SectionCard>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-12 bg-white text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-4">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              <span className="text-sm font-medium text-slate-400">Select a referral from the list to begin</span>
              <span className="text-xs text-slate-300 mt-1">Patient information, reports, and clinical data will appear here</span>
            </div>
          )}
        </div>
      </div>

      {teleconsultSession && (
        <TeleconsultModal
          open={teleconsultOpen}
          sessionId={teleconsultSession.id}
          roomName={teleconsultSession.room_name}
          referralId={activeReferral?.id || ""}
          specialistId={specialistId}
          patientName={
            activeReferral
              ? `${activeReferral.patient.first_name_en} ${activeReferral.patient.last_name_en}`
              : "Patient"
          }
          onClose={() => {
            setTeleconsultOpen(false);
            setTeleconsultSession(null);
          }}
        />
      )}
    </DashboardShell>
  );
}

export default function SpecialistDashboardPage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">Loading workspace…</span>
        </div>
      </main>
    }>
      <SpecialistDashboardContent />
    </Suspense>
  );
}
