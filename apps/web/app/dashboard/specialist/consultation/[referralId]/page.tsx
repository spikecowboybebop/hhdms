"use client";

if (typeof window !== "undefined") {
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  const suppress = (args: unknown[]) =>
    args.some((a) => typeof a === "string" && /Invalid vr type/i.test(a));
  console.error = (...args) => {
    if (suppress(args)) return;
    origError(...args);
  };
  console.warn = (...args) => {
    if (suppress(args)) return;
    origWarn(...args);
  };
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import { loadSession } from "@/lib/auth";
import type { ReferralChainEvent } from "@/lib/mbbs-api";
import { ReferralChainTimeline } from "@/components/mbbs/referral-chain-timeline";
import {
  specialistApi,
  type IncomingReferral,
  type SpecialtyTemplate,
  type SpecialistPrescription,
  type CreatePrescriptionResponse,
  type TestCatalogItem,
  type MedicationRoute,
} from "@/lib/specialist-api";
import { DynamicTemplateForm } from "@/components/specialist/dynamic-template-form";
import dynamic from "next/dynamic";

const VideoCallButton = dynamic(
  () => import("@/components/specialist/video-call-button").then((m) => m.VideoCallButton),
  { ssr: false },
);

const DicomViewer = dynamic(
  () => import("@/components/specialist/dicom-viewer").then((m) => m.DicomViewer),
  { ssr: false },
);

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

interface DicomStudy {
  id: string;
  patient_id: string;
  file_path: string;
  modality: string;
  body_part?: string;
  study_date?: string;
  description?: string;
  created_at: string;
  patient: {
    id: string;
    mrn: string;
    first_name_en: string;
    last_name_en: string;
  };
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
    active: false,
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

export default function ConsultationPage() {
  const params = useParams();
  const referralId = params?.referralId as string;
  const router = useRouter();

  const [session, setSession] = useState<any | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [referral, setReferral] = useState<IncomingReferral | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clinicalTab, setClinicalTab] = useState("diagnoses");
  const [reportsTab, setReportsTab] = useState<"reports" | "xray" | "ultrasound" | "other">("reports");
  const [dicomStudies, setDicomStudies] = useState<DicomStudy[]>([]);
  const [dicomLoading, setDicomLoading] = useState(false);
  const [activeDicomStudy, setActiveDicomStudy] = useState<DicomStudy | null>(null);
  const [templates, setTemplates] = useState<SpecialtyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SpecialtyTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const [prescriptionMeds, setPrescriptionMeds] = useState<{
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    special_instructions: string;
    conditional_flag: boolean;
    taper_details: { days_range: string; dosage: string }[];
  }[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [specialistPrescriptions, setSpecialistPrescriptions] = useState<SpecialistPrescription[]>([]);
  const [prescriptionWarnings, setPrescriptionWarnings] = useState<CreatePrescriptionResponse['warnings']>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  const [medicationRoutes, setMedicationRoutes] = useState<MedicationRoute[]>([]);

  const [showTestOrderPanel, setShowTestOrderPanel] = useState(false);
  const [testCatalog, setTestCatalog] = useState<TestCatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [testOrderNotes, setTestOrderNotes] = useState("");
  const [testOrderingLoading, setTestOrderingLoading] = useState(false);
  const [testCatalogLoading, setTestCatalogLoading] = useState(false);

  const testCategories = useMemo(() => {
    const cats = new Set(testCatalog.map((t) => t.category));
    return Array.from(cats).sort();
  }, [testCatalog]);

  const filteredTests = useMemo(() => {
    if (!selectedCategory) return [];
    return testCatalog.filter((t) => t.category === selectedCategory);
  }, [testCatalog, selectedCategory]);

  const specialistId = useMemo(() => {
    return session?.user?.id || "9a5b3c2d-1122-3344-5566-778899aabbcc";
  }, [session]);

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

  // Try to load referral from sessionStorage, then fetch if missing
  useEffect(() => {
    if (!hydrated || !referralId) return;

    const stored = sessionStorage.getItem(`referral_${referralId}`);
    if (stored) {
      try {
        setReferral(JSON.parse(stored));
        return;
      } catch {}
    }

    specialistApi.getReferrals()
      .then((data) => {
        const found = (Array.isArray(data) ? data : []).find(
          (r) => r.id === referralId,
        );
        if (found) {
          setReferral(found);
          sessionStorage.setItem(`referral_${referralId}`, JSON.stringify(found));
        }
      })
      .catch(() => {});
  }, [hydrated, referralId, session]);

  // Fetch patient history
  useEffect(() => {
    if (!referralId) return;
    setHistoryLoading(true);
    specialistApi.getPatientHistory(referralId)
      .then((data) => setPatientHistory(data as unknown as PatientHistory | null))
      .catch(() => setPatientHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [referralId]);

  // Fetch DICOM studies
  useEffect(() => {
    const patientId = referral?.patient_id;
    if (!patientId) {
      setDicomStudies([]);
      return;
    }
    setDicomLoading(true);
    specialistApi.getDicomStudies(patientId)
      .then((data) => setDicomStudies(Array.isArray(data) ? data : []))
      .catch(() => setDicomStudies([]))
      .finally(() => setDicomLoading(false));
  }, [referral?.patient_id]);

  // Fetch templates
  useEffect(() => {
    const code = referral?.specialty_code;
    if (!code) {
      setTemplates([]);
      return;
    }
    specialistApi.getTemplates(code)
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [referral?.specialty_code]);

  // Fetch prescriptions
  useEffect(() => {
    if (!referralId) {
      setSpecialistPrescriptions([]);
      return;
    }
    setPrescriptionsLoading(true);
    specialistApi.getPrescriptions(referralId)
      .then(setSpecialistPrescriptions)
      .catch(() => setSpecialistPrescriptions([]))
      .finally(() => setPrescriptionsLoading(false));
  }, [referralId]);

  // Fetch medication routes
  useEffect(() => {
    specialistApi.getRoutes()
      .then(setMedicationRoutes)
      .catch(() => setMedicationRoutes([]));
  }, []);

  // Fetch test catalog when panel opens
  useEffect(() => {
    if (!showTestOrderPanel || testCatalog.length > 0) return;
    setTestCatalogLoading(true);
    specialistApi.getTestCatalog()
      .then(setTestCatalog)
      .catch(() => setTestCatalog([]))
      .finally(() => setTestCatalogLoading(false));
  }, [showTestOrderPanel, testCatalog.length]);

  // ---- Prescription handlers ----
  const addMedication = useCallback(() => {
    setPrescriptionMeds((prev) => [
      ...prev,
      {
        drug_name: "",
        dosage: "",
        frequency: "",
        duration: "7 days",
        route: "Oral",
        special_instructions: "",
        conditional_flag: false,
        taper_details: [],
      },
    ]);
  }, []);

  const updateMedication = useCallback(
    (idx: number, field: string, value: string | number | boolean | { days_range: string; dosage: string }[]) => {
      setPrescriptionMeds((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
      );
    },
    [],
  );

  const removeMedication = useCallback((idx: number) => {
    setPrescriptionMeds((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addTaperStep = useCallback(
    (medIdx: number) => {
      setPrescriptionMeds((prev) =>
        prev.map((m, i) =>
          i === medIdx
            ? { ...m, taper_details: [...(m.taper_details || []), { days_range: "", dosage: "" }] }
            : m,
        ),
      );
    },
    [],
  );

  const updateTaperStep = useCallback(
    (medIdx: number, stepIdx: number, field: string, value: string) => {
      setPrescriptionMeds((prev) =>
        prev.map((m, i) =>
          i === medIdx
            ? {
                ...m,
                taper_details: (m.taper_details || []).map((s, si) =>
                  si === stepIdx ? { ...s, [field]: value } : s,
                ),
              }
            : m,
        ),
      );
    },
    [],
  );

  const removeTaperStep = useCallback((medIdx: number, stepIdx: number) => {
    setPrescriptionMeds((prev) =>
      prev.map((m, i) =>
        i === medIdx
          ? { ...m, taper_details: (m.taper_details || []).filter((_, si) => si !== stepIdx) }
          : m,
      ),
    );
  }, []);

  const handlePrescriptionSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!referral || prescriptionMeds.length === 0) return;

      setSubmitting(true);
      setShowWarnings(false);
      try {
        const res = await specialistApi.createPrescription({
          referralId: referral.id,
          medications: prescriptionMeds.map((m) => ({
            ...m,
            taper_details: m.taper_details?.length ? m.taper_details : undefined,
          })),
        });

        if (res.interaction_warnings_found) {
          setPrescriptionWarnings(res.warnings);
          setShowWarnings(true);
        }

        setPrescriptionMeds([]);
        setSpecialistPrescriptions((prev) => [res.prescription, ...prev]);
      } catch (err: any) {
        console.error("Prescription error:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [referral, prescriptionMeds],
  );

  const handleOrderTests = useCallback(async () => {
    if (!referral || !selectedTestId) return;
    setTestOrderingLoading(true);
    try {
      await specialistApi.orderTests({
        referralId: referral.id,
        test_ids: [selectedTestId],
        clinical_notes: testOrderNotes || undefined,
      });
      setSelectedCategory("");
      setSelectedTestId("");
      setTestOrderNotes("");
      setShowTestOrderPanel(false);
      specialistApi.getPatientHistory(referralId)
        .then((data) => setPatientHistory(data as unknown as PatientHistory | null))
        .catch(() => {});
    } catch (err: any) {
      console.error("Test order error:", err);
    } finally {
      setTestOrderingLoading(false);
    }
  }, [referral, referralId, selectedTestId, testOrderNotes]);

  const handleUseTemplate = useCallback((data: Record<string, unknown>) => {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      const label = selectedTemplate?.schema.find((f) => f.id === key)?.label ?? key;
      lines.push(`${label}: ${value}`);
    }
    setFindings(lines.join("\n"));
    setShowTemplateForm(false);
    setSelectedTemplate(null);

    if (referral) {
      specialistApi.createReport({
        referralId: referral.id,
        templateId: selectedTemplate!.id,
        formData: data,
      }).catch(() => {});
    }
  }, [selectedTemplate, referral]);

  const handleSelectTemplate = useCallback((templateId: string) => {
    const t = templates.find((t) => t.id === templateId) ?? null;
    setSelectedTemplate(t);
    setShowTemplateForm(t !== null);
  }, [templates]);

  const IMAGING_MODALITIES = useMemo(() => new Set(["XR", "DX", "CR", "CT", "XA", "ANGIO", "X-RAY", "MRI", "MG", "NM", "PT", "RF"]), []);
  const ULTRASOUND_MODALITIES = useMemo(() => new Set(["US", "USG"]), []);

  const xrayStudies = useMemo(() =>
    dicomStudies.filter((s) => IMAGING_MODALITIES.has(s.modality.toUpperCase())),
    [dicomStudies, IMAGING_MODALITIES],
  );
  const ultrasoundStudies = useMemo(() =>
    dicomStudies.filter((s) => ULTRASOUND_MODALITIES.has(s.modality.toUpperCase())),
    [dicomStudies, ULTRASOUND_MODALITIES],
  );
  const otherStudies = useMemo(() =>
    dicomStudies.filter((s) => !IMAGING_MODALITIES.has(s.modality.toUpperCase()) && !ULTRASOUND_MODALITIES.has(s.modality.toUpperCase())),
    [dicomStudies, IMAGING_MODALITIES, ULTRASOUND_MODALITIES],
  );

  const handleSignAndDispatch = async () => {
    if (!referral) return;
    if (!findings.trim() || !impression.trim()) {
      alert("Please enter both findings and impression before signing.");
      return;
    }

    setSubmitting(true);
    const compiledNotes = `FINDINGS:\n${findings}\n\nIMPRESSION:\n${impression}`;

    try {
      await specialistApi.completeConsultation({
        referralId: referral.id,
        responseNotes: compiledNotes,
      });

      alert(`Consultation completed for ${referral.patient.first_name_en}!`);
      setFindings("");
      setImpression("");
      setReferral((prev) => (prev ? { ...prev, status: "COMPLETED" as const } : prev));
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

  if (!referral) {
    return (
      <DashboardShell
        role={session.user.role}
        accent="slate"
        navItems={navItems}
        pageTitle="Patient Consultation"
        pageSubtitle="Loading patient data..."
      >
        <div className="mt-6 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-12 bg-white text-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
          <span className="mt-3 text-sm font-medium text-slate-400">Loading consultation data…</span>
        </div>
      </DashboardShell>
    );
  }

  const currentVitals = referral?.patient?.vital_signs?.[0];
  const latestVitals = patientHistory?.vitals?.[0];
  const bpSystolic = latestVitals?.systolic_bp ?? currentVitals?.blood_pressure_systolic;
  const bpDiastolic = latestVitals?.diastolic_bp ?? currentVitals?.blood_pressure_diastolic;
  const pulse = latestVitals?.pulse_bpm ?? currentVitals?.pulse;
  const temp = latestVitals?.temperature_c ?? currentVitals?.temperature;
  const spo2 = latestVitals?.spo2_pct ?? currentVitals?.spo2;

  return (
    <DashboardShell
      role={session.user.role}
      accent="slate"
      navItems={navItems.map((item) =>
        item.label === "Diagnostic Console"
          ? { ...item, active: false, href: "/dashboard/specialist" }
          : item,
      )}
      pageTitle="Patient Consultation"
      pageSubtitle={`Dr. ${session.user.first_name_en || ""} ${session.user.last_name_en || ""} • ${referral.patient.first_name_en} ${referral.patient.last_name_en}`}
    >
      <div className="mt-6">
        <button
          onClick={() => router.push("/dashboard/specialist")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A2540] hover:text-[#0A2540]/70 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Diagnostic Console
        </button>

        <div className="flex flex-col gap-6">
          {/* Patient Info Card */}
          <SectionCard
            title={`${referral.patient.first_name_en} ${referral.patient.last_name_en}`}
            description={`MRN: ${referral.patient.mrn} • ${referral.patient.sex}`}
            action={
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  referral.status === "PENDING"
                    ? "bg-[#FF9900]/10 text-[#FF9900]"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {referral.status}
                </span>
                <VideoCallButton
                  referralId={referralId}
                  patientId={referral.patient_id}
                  patientName={`${referral.patient.first_name_en} ${referral.patient.last_name_en}`}
                  specialistName={`Dr. ${session.user.first_name_en || ""} ${session.user.last_name_en || ""}`}
                />
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Allergies:</span>
                <span className="text-sm text-[#0A2540]">
                  {referral.patient.known_allergies || "None reported"}
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

          {/* Diagnostic Reports */}
          <SectionCard
            title="Diagnostic Reports"
            description={historyLoading ? "Loading..." : `${patientHistory?.diagnosis_reports?.length ?? 0} reports, ${dicomStudies.length} imaging studies`}
          >
            <div className="mb-4 flex gap-1 rounded-xl bg-[#F8F9FA] p-1 border border-slate-200/60 w-fit">
              {[
                { key: "reports" as const, label: "Clinical Reports", count: patientHistory?.diagnosis_reports?.length ?? 0 },
                { key: "xray" as const, label: "Imaging", count: xrayStudies.length },
                { key: "ultrasound" as const, label: "Ultrasound", count: ultrasoundStudies.length },
                ...(otherStudies.length > 0 ? [{ key: "other" as const, label: "Other Modalities", count: otherStudies.length }] : []),
              ].filter((tab) => tab.key === "reports" || tab.count > 0).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setReportsTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    reportsTab === tab.key
                      ? "bg-white text-[#0A2540] shadow-sm"
                      : "text-slate-500 hover:text-[#0A2540]"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                    reportsTab === tab.key ? "bg-[#0A2540] text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {reportsTab === "reports" && (
              <>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
                  </div>
                ) : patientHistory?.diagnosis_reports?.length ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F8F9FA] border-b border-slate-200/60">
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">File Name</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Type</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Date</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientHistory.diagnosis_reports.map((report) => (
                          <tr key={report.id} className="border-b border-slate-200/60 last:border-0 bg-white hover:bg-[#F8F9FA] transition-colors">
                            <td className="px-4 py-2.5 font-medium text-[#0A2540]">{report.file_name || 'Report'}</td>
                            <td className="px-4 py-2.5">
                              <span className="rounded-full bg-[#00D4B2]/10 px-2 py-0.5 text-[9px] font-semibold text-[#00D4B2]">
                                {report.report_type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {report.generated_at ? new Date(report.generated_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <a
                                href={report.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-[#0A2540] px-2.5 py-1 text-[10px] font-semibold hover:bg-[#0A2540]/80 transition-colors"
                                style={{ color: "#fff" }}
                              >
                                View
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-xs text-slate-400">No clinical reports have been generated for this patient</span>
                  </div>
                )}
              </>
            )}

            {reportsTab === "xray" && (
              <>
                {dicomLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
                  </div>
                ) : xrayStudies.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F8F9FA] border-b border-slate-200/60">
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Modality</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Body Part</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Study Date</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Description</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {xrayStudies.map((study) => (
                          <tr key={study.id} className="border-b border-slate-200/60 last:border-0 bg-white hover:bg-[#F8F9FA] transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">{study.modality}</span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-[#0A2540]">{study.body_part || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {study.study_date ? new Date(study.study_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">{study.description || '—'}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => setActiveDicomStudy(study)}
                                className="inline-flex items-center gap-1 rounded-md bg-[#0A2540] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#0A2540]/80 transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="text-xs text-slate-400">No imaging studies found for this patient</span>
                  </div>
                )}
              </>
            )}

            {reportsTab === "ultrasound" && (
              <>
                {dicomLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
                  </div>
                ) : ultrasoundStudies.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F8F9FA] border-b border-slate-200/60">
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Modality</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Body Part</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Study Date</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Description</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ultrasoundStudies.map((study) => (
                          <tr key={study.id} className="border-b border-slate-200/60 last:border-0 bg-white hover:bg-[#F8F9FA] transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">{study.modality}</span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-[#0A2540]">{study.body_part || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {study.study_date ? new Date(study.study_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">{study.description || '—'}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => setActiveDicomStudy(study)}
                                className="inline-flex items-center gap-1 rounded-md bg-[#0A2540] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#0A2540]/80 transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-2">
                      <path d="M2 12c0 0 2-4 4-4s4 8 4 8 2-12 4-12 4 8 4 8 2-4 4-4" />
                    </svg>
                    <span className="text-xs text-slate-400">No ultrasound studies found for this patient</span>
                  </div>
                )}
              </>
            )}

            {reportsTab === "other" && (
              <>
                {dicomLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
                  </div>
                ) : otherStudies.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F8F9FA] border-b border-slate-200/60">
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Modality</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Body Part</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Study Date</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Description</th>
                          <th className="px-4 py-2.5 font-semibold text-[#0A2540]">View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherStudies.map((study) => (
                          <tr key={study.id} className="border-b border-slate-200/60 last:border-0 bg-white hover:bg-[#F8F9FA] transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700">{study.modality}</span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-[#0A2540]">{study.body_part || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {study.study_date ? new Date(study.study_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">{study.description || '—'}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => setActiveDicomStudy(study)}
                                className="inline-flex items-center gap-1 rounded-md bg-[#0A2540] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#0A2540]/80 transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <span className="text-xs text-slate-400">No other imaging studies found for this patient</span>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          {/* Clinical Assessment */}
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
                      <p className="text-xs text-slate-400 italic">No test orders yet</p>
                    )}

                    {/* Order Additional Tests — Inline Panel */}
                    {!showTestOrderPanel ? (
                      <button
                        onClick={() => setShowTestOrderPanel(true)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-500 hover:border-[#00D4B2] hover:text-[#00D4B2] transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Order Additional Tests
                      </button>
                    ) : (
                      <div className="mt-4 rounded-xl border border-slate-200/60 bg-[#F8F9FA] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Order Additional Test</span>
                          <button
                            onClick={() => { setShowTestOrderPanel(false); setSelectedCategory(""); setSelectedTestId(""); setTestOrderNotes(""); }}
                            className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>

                        {testCatalogLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
                          </div>
                        ) : testCatalog.length > 0 ? (
                          <>
                            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</label>
                                <select
                                  value={selectedCategory}
                                  onChange={(e) => { setSelectedCategory(e.target.value); setSelectedTestId(""); }}
                                  className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20"
                                >
                                  <option value="">-- Select category --</option>
                                  {testCategories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Test</label>
                                <select
                                  value={selectedTestId}
                                  onChange={(e) => setSelectedTestId(e.target.value)}
                                  disabled={!selectedCategory}
                                  className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">-- Select test --</option>
                                  {filteredTests.map((t) => (
                                    <option key={t.id} value={t.id}>{t.test_name} ({t.test_code})</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mb-3">
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Clinical Notes (optional)</label>
                              <textarea
                                value={testOrderNotes}
                                onChange={(e) => setTestOrderNotes(e.target.value)}
                                placeholder="Any specific instructions or reasons for this test..."
                                rows={2}
                                className="w-full resize-none rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20"
                              />
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={handleOrderTests}
                                disabled={!selectedTestId || testOrderingLoading}
                                className="rounded-lg bg-[#00D4B2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00c2a2] transition-all disabled:opacity-50"
                              >
                                {testOrderingLoading ? "Ordering..." : "Order Test"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No tests available in the catalog</p>
                        )}
                      </div>
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

          {/* Care Timeline */}
          {!historyLoading && patientHistory && patientHistory.referral_chain?.length > 0 && (
            <SectionCard title="Care Timeline" description="Complete patient care journey">
              <ReferralChainTimeline events={patientHistory.referral_chain} />
            </SectionCard>
          )}

          {/* Issue Prescription */}
          {referral.status !== "COMPLETED" && (
            <SectionCard
              title="Issue Prescription"
              description="Generate a digital prescription with medication details"
            >
              <form onSubmit={handlePrescriptionSubmit}>
                {showWarnings && prescriptionWarnings.length > 0 && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Drug Interaction Warnings</span>
                    </div>
                    <ul className="space-y-1">
                      {prescriptionWarnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-amber-900">
                          <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            w.severity === 'major' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                          }`}>
                            {w.severity}
                          </span>
                          <span><strong>{w.drug_a}</strong> + <strong>{w.drug_b}</strong>: {w.description}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[10px] text-amber-600">Warnings are advisory only. You may proceed if clinically appropriate.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {prescriptionMeds.map((med, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Medication #{idx + 1}</span>
                        <button type="button" onClick={() => removeMedication(idx)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Drug Name</label>
                          <input type="text" value={med.drug_name}
                            onChange={(e) => updateMedication(idx, "drug_name", e.target.value)}
                            placeholder="e.g. Amlodipine (Norvasc)"
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20" required />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dosage</label>
                          <input type="text" value={med.dosage}
                            onChange={(e) => updateMedication(idx, "dosage", e.target.value)}
                            placeholder="e.g. 500mg"
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20" required />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Frequency</label>
                          <input type="text" value={med.frequency}
                            onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                            placeholder="e.g. 1-0-1 or Every 8 hours"
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20" required />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Duration</label>
                          <input type="text" value={med.duration}
                            onChange={(e) => updateMedication(idx, "duration", e.target.value)}
                            placeholder="e.g. 7 days"
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20" required />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Route</label>
                          <select value={med.route} onChange={(e) => updateMedication(idx, "route", e.target.value)}
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20">
                            <option value="">-- Select route --</option>
                            {medicationRoutes.map((r) => (
                              <option key={r.code} value={r.code}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Special Instructions</label>
                          <input type="text" value={med.special_instructions}
                            onChange={(e) => updateMedication(idx, "special_instructions", e.target.value)}
                            placeholder="e.g. Before food"
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-2.5 py-1.5 text-xs text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/20" />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={med.conditional_flag}
                              onChange={(e) => updateMedication(idx, "conditional_flag", e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-[#0A2540] focus:ring-[#0A2540]/20" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">PRN / Conditional</span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-200/60 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Taper Schedule (step-down dosage)</span>
                          <button type="button" onClick={() => addTaperStep(idx)}
                            className="text-[10px] font-semibold text-[#00D4B2] hover:text-[#00c2a2] transition-colors">+ Add Step</button>
                        </div>
                        {(med.taper_details?.length ?? 0) > 0 && (
                          <div className="space-y-2">
                            {med.taper_details?.map((step, si) => (
                              <div key={si} className="flex items-center gap-2">
                                <input type="text" value={step.days_range}
                                  onChange={(e) => updateTaperStep(idx, si, "days_range", e.target.value)}
                                  placeholder="e.g. Day 1-3"
                                  className="w-28 rounded-lg border border-slate-200/60 bg-white px-2 py-1 text-[10px] text-[#0A2540] outline-none transition-all focus:border-[#0A2540]" />
                                <input type="text" value={step.dosage}
                                  onChange={(e) => updateTaperStep(idx, si, "dosage", e.target.value)}
                                  placeholder="e.g. 10mg"
                                  className="w-24 rounded-lg border border-slate-200/60 bg-white px-2 py-1 text-[10px] text-[#0A2540] outline-none transition-all focus:border-[#0A2540]" />
                                <button type="button" onClick={() => removeTaperStep(idx, si)}
                                  className="text-slate-400 hover:text-red-500 transition-colors">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addMedication}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-500 hover:border-[#00D4B2] hover:text-[#00D4B2] transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Medication
                </button>

                {prescriptionMeds.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button type="submit" disabled={submitting}
                      className="rounded-lg bg-[#0A2540] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0A2540]/90 transition-all disabled:opacity-50">
                      {submitting ? "Issuing..." : "Issue Prescription"}
                    </button>
                  </div>
                )}
              </form>

              <div className="mt-6 border-t border-slate-200/60 pt-4">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Previously Issued Prescriptions
                  {specialistPrescriptions.length > 0 && (
                    <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px]">{specialistPrescriptions.length}</span>
                  )}
                </h4>
                {prescriptionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A2540] border-t-transparent" />
                  </div>
                ) : specialistPrescriptions.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {specialistPrescriptions.map((p) => (
                      <li key={p.id} className="rounded-lg border border-slate-200/60 bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-slate-400">
                            {p.issued_at ? new Date(p.issued_at).toLocaleDateString() : ''}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>{p.status}</span>
                        </div>
                        <ul className="space-y-0.5">
                          {p.medications?.map((m, mi) => (
                            <li key={mi} className="flex items-center gap-2 text-xs text-[#0A2540]">
                              <span className="font-semibold">{m.generic_name}</span>
                              <span className="text-slate-400">—</span>
                              <span>{m.dosage}</span>
                              <span className="text-slate-400">{m.frequency}</span>
                              {m.conditional_flag && (
                                <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700">PRN</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 text-[10px] text-[#0A2540]">
                          Issued by Dr. {p.provider_type === 'SPECIALIST'
                            ? `${p.specialist?.user?.firstNameEn ?? ''} ${p.specialist?.user?.lastNameEn ?? ''}`.trim()
                            : `${p.doctor?.user?.firstNameEn ?? ''} ${p.doctor?.user?.lastNameEn ?? ''}`.trim() || 'Unknown'}
                        </p>
                        {p.digital_signature_url && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-600">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Digitally Signed
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No prescriptions issued yet</p>
                )}
              </div>
            </SectionCard>
          )}

          {/* Consultation Editor */}
          <SectionCard
            title="Consultation Notes"
            description="Document your findings and diagnostic impression"
            action={
              <button
                onClick={handleSignAndDispatch}
                disabled={submitting || referral.status === "COMPLETED"}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm ${
                  referral.status === "COMPLETED"
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-[#00D4B2] hover:bg-[#00c2a2] hover:shadow-md"
                }`}
              >
                {submitting ? "Submitting..." : referral.status === "COMPLETED" ? "Completed" : "Sign & Dispatch"}
              </button>
            }
          >
            {referral.status === "COMPLETED" ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm font-medium">
                This consultation has been completed and signed.
              </div>
            ) : showTemplateForm && selectedTemplate ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#00D4B2]">Template: {selectedTemplate.template_name}</span>
                  </div>
                  <button onClick={() => { setShowTemplateForm(false); setSelectedTemplate(null); }}
                    className="text-xs text-[#0A2540] hover:text-[#0A2540]/70 transition-colors">Cancel template</button>
                </div>
                <DynamicTemplateForm schema={selectedTemplate.schema} onSubmit={handleUseTemplate}
                  onBack={() => { setShowTemplateForm(false); setSelectedTemplate(null); }} />
              </div>
            ) : (
              <div>
                {templates.length > 0 && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Use a Template (optional)</label>
                    <select value={selectedTemplate?.id ?? ""} onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full max-w-xs rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20">
                      <option value="">-- Select a template --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.template_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Clinical Findings</label>
                    <textarea rows={5} value={findings} onChange={(e) => setFindings(e.target.value)}
                      placeholder="Describe your clinical observations, anatomical findings, and any abnormalities detected..."
                      className="w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Impression & Diagnosis</label>
                    <textarea rows={5} value={impression} onChange={(e) => setImpression(e.target.value)}
                      placeholder="Document your diagnostic impression, differential diagnoses, and recommended next steps..."
                      className="w-full resize-none rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20" />
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {activeDicomStudy && (
        <DicomViewer study={activeDicomStudy} onClose={() => setActiveDicomStudy(null)} />
      )}
    </DashboardShell>
  );
}
