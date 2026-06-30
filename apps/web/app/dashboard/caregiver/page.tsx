"use client";

import { useEffect, useState, useMemo } from "react";
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
import {
  caregiverApi,
  type CaregiverPatient,
  type ActivityLog,
  type ConditionReport,
} from "@/lib/caregiver-api";

const navItems: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard/caregiver",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Activity Log",
    href: "/dashboard/caregiver#activity",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: "Condition Reports",
    href: "/dashboard/caregiver#reports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

const ACTIVITY_TYPES = [
  { value: "HYGIENE", label: "Personal Hygiene" },
  { value: "MOBILITY", label: "Mobility Assistance" },
  { value: "FEEDING", label: "Feeding Assistance" },
  { value: "MEDICATION", label: "Oral Medication Admin" },
  { value: "COMPANIONSHIP", label: "Companionship" },
  { value: "EXERCISE", label: "Exercise" },
];

const REPORT_TYPES = [
  { value: "FALL", label: "Patient Fall" },
  { value: "MEDICATION_REFUSAL", label: "Medication Refusal" },
  { value: "BEHAVIORAL_CHANGE", label: "Behavioral Change" },
  { value: "PHYSICAL_SYMPTOM", label: "Physical Symptom" },
];

const SEVERITY_LEVELS = [
  { value: "MILD", label: "Mild" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  DAY_CARE: "Day Care (7am–3pm)",
  NIGHT_CARE: "Night Care (10pm–6am)",
  "24_HOUR_CARE": "24-Hour Care (rotational)",
  RESPITE_CARE: "Respite Care (min 4 hrs)",
};

const PATIENT_TYPE_LABELS: Record<string, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  ELDERLY: "Elderly",
};

export default function CaregiverDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "reports">("overview");

  // Data
  const [patients, setPatients] = useState<CaregiverPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<CaregiverPatient | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");

  // Activity form
  const [actType, setActType] = useState("HYGIENE");
  const [actNotes, setActNotes] = useState("");
  const [actSubmitting, setActSubmitting] = useState(false);
  const [actSuccess, setActSuccess] = useState("");

  // Report form
  const [repType, setRepType] = useState("FALL");
  const [repDesc, setRepDesc] = useState("");
  const [repSeverity, setRepSeverity] = useState("MODERATE");
  const [repSubmitting, setRepSubmitting] = useState(false);
  const [repSuccess, setRepSuccess] = useState("");

  // Alert states
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "CAREGIVER") {
      router.replace(dashboardPathForRole(s.user.role));
      return;
    }
  }, [router]);

  // Hash-based tab routing
  useEffect(() => {
    if (!hydrated) return;
    const hash = window.location.hash.replace("#", "");
    if (["activity", "reports"].includes(hash)) {
      setActiveTab(hash as any);
    } else {
      setActiveTab("overview");
    }
  }, [hydrated]);

  // Load patients
  useEffect(() => {
    if (!hydrated || !session) return;
    const load = async () => {
      setLoading(true);
      try {
        const [profile, pats] = await Promise.all([
          caregiverApi.getProfile(),
          caregiverApi.getMyPatients(),
        ]);
        setProfileName(profile.user.firstNameEn + " " + profile.user.lastNameEn);
        setPatients(pats);
        if (pats.length > 0 && pats[0]) {
          setSelectedPatient(pats[0]);
        }
      } catch {
        /* handled by fallback */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hydrated, session]);

  // Load logs when tab or selected patient changes
  useEffect(() => {
    if (!hydrated || activeTab !== "activity") return;
    caregiverApi.getActivityLogs(selectedPatient?.id).then(setActivityLogs).catch(() => {});
  }, [hydrated, activeTab, selectedPatient]);

  useEffect(() => {
    if (!hydrated || activeTab !== "reports") return;
    caregiverApi.getConditionReports(selectedPatient?.id).then(setConditionReports).catch(() => {});
  }, [hydrated, activeTab, selectedPatient]);

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setActSubmitting(true);
    setActSuccess("");
    try {
      await caregiverApi.createActivityLog({
        patient_id: selectedPatient.id,
        activity_type: actType,
        notes: actNotes || undefined,
      });
      setActSuccess("Activity logged successfully!");
      setActNotes("");
      const logs = await caregiverApi.getActivityLogs(selectedPatient.id);
      setActivityLogs(logs);
    } catch (err: any) {
      setActSuccess("Error: " + (err.message || "Failed to log activity"));
    } finally {
      setActSubmitting(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setRepSubmitting(true);
    setRepSuccess("");
    try {
      await caregiverApi.createConditionReport({
        patient_id: selectedPatient.id,
        report_type: repType,
        description: repDesc,
        severity: repSeverity,
      });
      setRepSuccess("Condition report submitted successfully!");
      setRepDesc("");
      const reports = await caregiverApi.getConditionReports(selectedPatient.id);
      setConditionReports(reports);
    } catch (err: any) {
      setRepSuccess("Error: " + (err.message || "Failed to submit report"));
    } finally {
      setRepSubmitting(false);
    }
  };

  const handleSendAlert = async (reportId: string, target: "nurse" | "doctor") => {
    setSendingAlert(reportId);
    try {
      await caregiverApi.sendAlert(reportId, target);
      const reports = await caregiverApi.getConditionReports(selectedPatient?.id);
      setConditionReports(reports);
    } catch (err: any) {
      alert("Failed to send alert: " + (err.message || "Unknown error"));
    } finally {
      setSendingAlert(null);
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
      accent="teal"
      navItems={navItems}
      pageTitle="Caregiver Dashboard"
      pageSubtitle={profileName ? `Welcome, ${profileName}` : "Patient care management"}
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Assigned Patients"
          value={loading ? "…" : patients.length}
          delta="Currently under your care"
          trend="flat"
          accent="teal"
        />
        <StatCard
          label="Today's Activities"
          value={activityLogs.length}
          delta="Logged this session"
          trend={activityLogs.length > 0 ? "up" : "flat"}
          accent="teal"
        />
        <StatCard
          label="Condition Reports"
          value={conditionReports.length}
          delta="Submitted this session"
          trend={conditionReports.length > 0 ? "up" : "flat"}
          accent="amber"
        />
        <StatCard
          label="Patient Selection"
          value={selectedPatient ? `${selectedPatient.first_name_en} ${selectedPatient.last_name_en}` : "None"}
          delta={selectedPatient ? `MRN: ${selectedPatient.mrn}` : "Select a patient"}
          trend="flat"
          accent="slate"
        />
      </div>

      {/* Patient selection bar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[#2D3A4A] uppercase tracking-widest">
          Select Patient:
        </span>
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPatient(p)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
              selectedPatient?.id === p.id
                ? "bg-[#00D4B2] text-white border-[#00D4B2]"
                : "border-slate-200/60 text-[#2D3A4A] hover:border-[#00D4B2] hover:text-[#00D4B2]"
            }`}
          >
            {p.first_name_en} {p.last_name_en}
            {p.service_type && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                selectedPatient?.id === p.id
                  ? "bg-white/20 text-white"
                  : "bg-[#00D4B2]/10 text-[#00D4B2]"
              }`}>
                {SERVICE_TYPE_LABELS[p.service_type] || p.service_type}
              </span>
            )}
          </button>
        ))}
        {patients.length === 0 && !loading && (
          <span className="text-xs italic text-[#2D3A4A]">No patients assigned yet.</span>
        )}
      </div>

      {/* Main content */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Patient info sidebar */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <SectionCard
              title={`${selectedPatient.first_name_en} ${selectedPatient.last_name_en}`}
              description={`MRN: ${selectedPatient.mrn}`}
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Sex", value: selectedPatient.sex === "M" ? "Male" : "Female" },
                  { label: "Blood Group", value: selectedPatient.blood_group || "N/A" },
                  { label: "Phone", value: selectedPatient.phone_number || "N/A" },
                  { label: "District", value: selectedPatient.district || "N/A" },
                  { label: "Service Type", value: SERVICE_TYPE_LABELS[selectedPatient.service_type ?? ''] || selectedPatient.service_type || "N/A" },
                  { label: "Patient Type", value: PATIENT_TYPE_LABELS[selectedPatient.patient_type ?? ''] || selectedPatient.patient_type || "N/A" },
                ].map((v) => (
                  <div key={v.label} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      {v.label}
                    </span>
                    <span className="mt-1 text-sm font-bold tracking-tight text-[#0A2540]">
                      {v.value}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="No Patient Selected" description="Select a patient to begin">
              <p className="text-xs text-[#2D3A4A] italic py-2">
                {loading ? "Loading patients…" : "Please select a patient from the bar above."}
              </p>
            </SectionCard>
          )}
        </div>

        {/* Right content area - tabbed */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Tab buttons */}
          <div className="flex gap-2 border-b border-slate-200/60 pb-2">
            {(["overview", "activity", "reports"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-[#00D4B2] text-white"
                    : "bg-[#F8F9FA] text-[#2D3A4A] hover:bg-[#00D4B2]/10"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "activity" ? "Daily Activity Log" : "Condition Reports"}
              </button>
            ))}
          </div>

          {/* ====== OVERVIEW TAB ====== */}
          {activeTab === "overview" && (
            <SectionCard title="Caregiver Workspace" description="Quick overview of your assigned patients">
              {patients.length === 0 ? (
                <p className="text-xs text-[#2D3A4A] italic py-4">
                  No patients are currently assigned to you.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {patients.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => setSelectedPatient(p)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                          selectedPatient?.id === p.id
                            ? "border-[#00D4B2] bg-[#00D4B2]/5"
                            : "border-slate-200/60 bg-white hover:border-[#00D4B2]/40"
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div>
                            <span className="text-sm font-bold text-[#0A2540]">
                              {p.first_name_en} {p.last_name_en}
                            </span>
                            <span className="ml-2 text-[10px] font-mono text-[#2D3A4A]">
                              {p.mrn}
                            </span>
                          </div>
                          {p.service_type && (
                            <span className="text-[10px] text-[#00D4B2] font-semibold">
                              {SERVICE_TYPE_LABELS[p.service_type] || p.service_type}
                              {p.patient_type && ` · ${PATIENT_TYPE_LABELS[p.patient_type] || p.patient_type}`}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#2D3A4A]">
                          {p.sex === "M" ? "Male" : "Female"} · {p.blood_group || "N/A"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {/* ====== ACTIVITY LOG TAB (CG-005) ====== */}
          {activeTab === "activity" && (
            <>
              <SectionCard
                title="Log Daily Activity"
                description={selectedPatient ? `Patient: ${selectedPatient.first_name_en} ${selectedPatient.last_name_en}` : "Select a patient first"}
                action={
                  actSuccess && (
                    <span className={`text-xs font-semibold ${actSuccess.startsWith("Error") ? "text-red-500" : "text-[#00D4B2]"}`}>
                      {actSuccess}
                    </span>
                  )
                }
              >
                {!selectedPatient ? (
                  <p className="text-xs text-[#2D3A4A] italic">Please select a patient from the bar above.</p>
                ) : (
                  <form onSubmit={handleSubmitActivity} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1.5">
                        Activity Type
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ACTIVITY_TYPES.map((at) => (
                          <button
                            key={at.value}
                            type="button"
                            onClick={() => setActType(at.value)}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold text-center transition-all ${
                              actType === at.value
                                ? "bg-[#00D4B2] text-white border-[#00D4B2]"
                                : "border-slate-200/60 bg-[#F8F9FA] text-[#2D3A4A] hover:border-[#00D4B2]/40"
                            }`}
                          >
                            {at.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1.5">
                        Notes (optional)
                      </label>
                      <textarea
                        value={actNotes}
                        onChange={(e) => setActNotes(e.target.value)}
                        placeholder="Add any observations or notes…"
                        rows={2}
                        className="w-full rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-2.5 text-sm text-[#0A2540] placeholder:text-[#2D3A4A]/40 focus:border-[#00D4B2] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={actSubmitting}
                      className="self-start rounded-xl bg-[#00D4B2] px-6 py-2.5 text-xs font-bold text-white transition-all hover:shadow-md disabled:opacity-50"
                    >
                      {actSubmitting ? "Logging…" : "Log Activity"}
                    </button>
                  </form>
                )}
              </SectionCard>

              {activityLogs.length > 0 && (
                <SectionCard title="Recent Activity Logs" description="Last 50 entries">
                  <div className="flex flex-col gap-2">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
                        <div>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="rounded-full bg-[#00D4B2]/10 px-2 py-0.5 text-[10px] font-bold text-[#00D4B2] uppercase">
                              {ACTIVITY_TYPES.find((a) => a.value === log.activity_type)?.label || log.activity_type}
                            </span>
                            {log.patient && (
                              <span className="text-[11px] text-[#2D3A4A]">
                                — {log.patient.first_name_en} {log.patient.last_name_en}
                              </span>
                            )}
                          </span>
                          {log.notes && (
                            <p className="mt-1 text-xs text-[#2D3A4A]/70">{log.notes}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[#2D3A4A]/50">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}

          {/* ====== CONDITION REPORTS TAB (CG-007) ====== */}
          {activeTab === "reports" && (
            <>
              <SectionCard
                title="Report Condition Change"
                description={selectedPatient ? `Patient: ${selectedPatient.first_name_en} ${selectedPatient.last_name_en}` : "Select a patient first"}
                action={
                  repSuccess && (
                    <span className={`text-xs font-semibold ${repSuccess.startsWith("Error") ? "text-red-500" : "text-[#00D4B2]"}`}>
                      {repSuccess}
                    </span>
                  )
                }
              >
                {!selectedPatient ? (
                  <p className="text-xs text-[#2D3A4A] italic">Please select a patient from the bar above.</p>
                ) : (
                  <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1.5">
                        Report Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {REPORT_TYPES.map((rt) => (
                          <button
                            key={rt.value}
                            type="button"
                            onClick={() => setRepType(rt.value)}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold text-center transition-all ${
                              repType === rt.value
                                ? "bg-[#FF9900] text-white border-[#FF9900]"
                                : "border-slate-200/60 bg-[#F8F9FA] text-[#2D3A4A] hover:border-[#FF9900]/40"
                            }`}
                          >
                            {rt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={repDesc}
                        onChange={(e) => setRepDesc(e.target.value)}
                        placeholder="Describe the observed change in detail…"
                        rows={3}
                        required
                        className="w-full rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-2.5 text-sm text-[#0A2540] placeholder:text-[#2D3A4A]/40 focus:border-[#FF9900] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1.5">
                        Severity
                      </label>
                      <div className="flex gap-2">
                        {SEVERITY_LEVELS.map((sl) => (
                          <button
                            key={sl.value}
                            type="button"
                            onClick={() => setRepSeverity(sl.value)}
                            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                              repSeverity === sl.value
                                ? sl.value === "MILD"
                                  ? "bg-green-500 text-white border-green-500"
                                  : sl.value === "MODERATE"
                                    ? "bg-[#FF9900] text-white border-[#FF9900]"
                                    : "bg-red-500 text-white border-red-500"
                                : "border-slate-200/60 bg-[#F8F9FA] text-[#2D3A4A]"
                            }`}
                          >
                            {sl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={repSubmitting || !repDesc.trim()}
                      className="self-start rounded-xl bg-[#FF9900] px-6 py-2.5 text-xs font-bold text-white transition-all hover:shadow-md disabled:opacity-50"
                    >
                      {repSubmitting ? "Submitting…" : "Submit Report"}
                    </button>
                  </form>
                )}
              </SectionCard>

              {conditionReports.length > 0 && (
                <SectionCard title="Submitted Reports" description="Alerts can be sent to escalate">
                  <div className="flex flex-col gap-3">
                    {conditionReports.map((report) => (
                      <div key={report.id} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              report.severity === "SEVERE"
                                ? "bg-red-100 text-red-600"
                                : report.severity === "MODERATE"
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-green-100 text-green-600"
                            }`}>
                              {report.severity}
                            </span>
                            <span className="rounded-full bg-[#FF9900]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF9900] uppercase">
                              {REPORT_TYPES.find((r) => r.value === report.report_type)?.label || report.report_type}
                            </span>
                            {report.patient && (
                              <span className="text-[11px] text-[#2D3A4A]">
                                — {report.patient.first_name_en} {report.patient.last_name_en}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#2D3A4A]/50 whitespace-nowrap">
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#2D3A4A]">{report.description}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleSendAlert(report.id, "nurse")}
                            disabled={sendingAlert === report.id || report.alert_sent_to_nurse}
                            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                              report.alert_sent_to_nurse
                                ? "bg-green-100 text-green-600 border border-green-200 cursor-default"
                                : "bg-[#0A2540] text-white hover:shadow-md disabled:opacity-50"
                            }`}
                          >
                            {report.alert_sent_to_nurse
                              ? "✓ Nurse Alerted"
                              : sendingAlert === report.id
                                ? "Sending…"
                                : "Send Alert to Nurse"}
                          </button>
                          <button
                            onClick={() => handleSendAlert(report.id, "doctor")}
                            disabled={sendingAlert === report.id || report.alert_sent_to_doctor}
                            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                              report.alert_sent_to_doctor
                                ? "bg-green-100 text-green-600 border border-green-200 cursor-default"
                                : "bg-red-600 text-white hover:shadow-md disabled:opacity-50"
                            }`}
                          >
                            {report.alert_sent_to_doctor
                              ? "✓ Doctor Alerted"
                              : sendingAlert === report.id
                                ? "Sending…"
                                : "Send Alert to MBBS Doctor"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
