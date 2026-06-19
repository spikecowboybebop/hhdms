"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard, StatCard } from "@/components/dashboard/dashboard-cards";
import { PatientHeader } from "@/components/mbbs/patient-header";
import { VitalsForm } from "@/components/mbbs/vitals-form";
import { VitalsDisplay } from "@/components/mbbs/vitals-display";
import { Icd10Search } from "@/components/mbbs/icd10-search";
import { ReferralChainTimeline } from "@/components/mbbs/referral-chain-timeline";
import {
  loadSession,
  dashboardPathForRole,
  type StoredSession,
} from "@/lib/auth";
import {
  mbbsApi,
  type PatientProfile,
  type Icd10Code,
  type CreateVitalsPayload,
  type TestCatalogItem,
  type Diagnosis,
  type Prescription,
  type Referral,
} from "@/lib/mbbs-api";

const SPECIALTIES = [
  { code: 'CARDIOLOGY', label: 'Cardiology' },
  { code: 'PULMONOLOGY', label: 'Pulmonology' },
  { code: 'NEUROLOGY', label: 'Neurology' },
  { code: 'NEPHROLOGY', label: 'Nephrology' },
  { code: 'GASTROENTEROLOGY', label: 'Gastroenterology' },
  { code: 'ENDOCRINOLOGY', label: 'Endocrinology' },
  { code: 'RHEUMATOLOGY', label: 'Rheumatology' },
  { code: 'DERMATOLOGY', label: 'Dermatology' },
  { code: 'PSYCHIATRY', label: 'Psychiatry' },
  { code: 'ONCOLOGY', label: 'Oncology' },
  { code: 'ORTHOPEDICS', label: 'Orthopedics' },
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
    href: "/dashboard/mbbs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "ICD-10 Catalog",
    href: "/dashboard/mbbs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "My Schedule",
    href: "/dashboard/mbbs",
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

type Tab = 'vitals' | 'diagnosis' | 'tests' | 'prescriptions' | 'referral' | 'timeline';

export default function MbbsPatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('vitals');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Diagnosis form state
  const [selectedIcd10, setSelectedIcd10] = useState<Icd10Code | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpi, setHpi] = useState('');
  const [ros, setRos] = useState('');
  const [examFindings, setExamFindings] = useState('');
  const [preliminaryDiagnosis, setPreliminaryDiagnosis] = useState('');

  // Test ordering state
  const [testCatalog, setTestCatalog] = useState<TestCatalogItem[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [testNotes, setTestNotes] = useState('');

  // Referral state
  const [refSpecialty, setRefSpecialty] = useState('');
  const [refReason, setRefReason] = useState('');
  const [refSummary, setRefSummary] = useState('');
  const [refEmergency, setRefEmergency] = useState(false);

  // Prescription state
  const [prescriptionMeds, setPrescriptionMeds] = useState<{
    generic_name: string;
    brand_name: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    route: string;
    special_instructions: string;
  }[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);
    if (!s) { router.replace("/signin"); return; }
    if (s.user.role !== "MBBS_DOCTOR") { router.replace(dashboardPathForRole(s.user.role)); return; }
    loadProfile();
  }, [patientId]);

  // Read URL hash (fragment) to select the appropriate tab and scroll
  useEffect(() => {
    const applyHash = () => {
      if (typeof window === 'undefined') return;
      const raw = window.location.hash || '';
      const key = raw.replace('#', '');
      if (!key) return;
      const map: Record<string, Tab> = {
        vitals: 'vitals',
        diagnosis: 'diagnosis',
        tests: 'tests',
        prescriptions: 'prescriptions',
        prescription: 'prescriptions',
        referral: 'referral',
        timeline: 'timeline',
      };
      const tab = map[key];
      if (tab) {
        setActiveTab(tab);
        setTimeout(() => {
          const el = document.getElementById(key);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [patientId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mbbsApi.getPatientProfile(patientId);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load patient profile.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ---- Vital Signs ----
  const handleVitalsSubmit = useCallback(async (data: CreateVitalsPayload) => {
    setActionLoading(true);
    try {
      await mbbsApi.recordVitals(patientId, data);
      showSuccess('Vital signs recorded successfully.');
      await loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [patientId]);

  // ---- Diagnosis ----
  const handleDiagnosisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIcd10 || !preliminaryDiagnosis) return;
    setActionLoading(true);
    try {
      await mbbsApi.createDiagnosis(patientId, {
        icd10_code: selectedIcd10.code,
        chief_complaint: chiefComplaint,
        history_of_present_illness: hpi,
        review_of_systems: ros,
        examination_findings: examFindings,
        preliminary_diagnosis: preliminaryDiagnosis,
      });
      showSuccess('Diagnosis recorded successfully.');
      setChiefComplaint(''); setHpi(''); setRos(''); setExamFindings('');
      setPreliminaryDiagnosis(''); setSelectedIcd10(null);
      await loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Test Ordering ----
  const loadTestCatalog = async () => {
    try {
      const data = await mbbsApi.getTestCatalog();
      setTestCatalog(data);
    } catch {}
  };

  const toggleTest = (id: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleTestOrder = async () => {
    if (selectedTests.size === 0) return;
    setActionLoading(true);
    try {
      await mbbsApi.orderTests(patientId, Array.from(selectedTests), testNotes);
      showSuccess('Tests ordered successfully.');
      setSelectedTests(new Set());
      setTestNotes('');
      await loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Referral ----
  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refSpecialty || !refReason) return;
    setActionLoading(true);
    try {
      await mbbsApi.createReferral(patientId, {
        specialty_code: refSpecialty,
        referral_reason: refReason,
        clinical_summary: refSummary,
        is_emergency: refEmergency,
      });
      showSuccess('Referral created successfully.');
      setRefSpecialty(''); setRefReason(''); setRefSummary(''); setRefEmergency(false);
      await loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Emergency Flag ----
  const handleEmergencyFlag = async () => {
    setActionLoading(true);
    try {
      await mbbsApi.setEmergencyFlag(patientId, 'Emergency flag raised by attending MBBS doctor');
      showSuccess('🚨 Emergency flag activated!');
      await loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Prescription ----
  const addMedication = () => {
    setPrescriptionMeds((prev) => [
      ...prev,
      { generic_name: '', brand_name: '', dosage: '', frequency: '', duration_days: 7, route: 'Oral', special_instructions: '' },
    ]);
  };

  const updateMedication = (idx: number, field: string, value: string | number) => {
    setPrescriptionMeds((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  };

  const removeMedication = (idx: number) => {
    setPrescriptionMeds((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prescriptionMeds.length === 0) return;
    setActionLoading(true);
    try {
      await mbbsApi.createPrescription(patientId, {
        notes: prescriptionNotes,
        medications: prescriptionMeds.map((m) => ({
          ...m,
          duration_days: Number(m.duration_days),
        })),
      });
      showSuccess('Prescription generated successfully.');
      setPrescriptionMeds([]);
      setPrescriptionNotes('');
      await loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">Loading patient data…</span>
        </div>
      </main>
    );
  }

  if (!session || !profile) return null;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'vitals', label: 'Vital Signs', icon: '🩺' },
    { key: 'diagnosis', label: 'Diagnosis', icon: '📋' },
    { key: 'tests', label: 'Tests & Results', icon: '🧪' },
    { key: 'prescriptions', label: 'Prescriptions', icon: '💊' },
    { key: 'referral', label: 'Referral', icon: '🏥' },
    { key: 'timeline', label: 'Care Timeline', icon: '📅' },
  ];

  return (
    <DashboardShell
      role={session.user.role}
      accent="navy"
      navItems={navItems}
      pageTitle={`Patient: ${profile.patient.first_name_en} ${profile.patient.last_name_en}`}
      pageSubtitle={`MRN: ${profile.patient.mrn} | ${profile.patient.sex === 'M' ? 'Male' : 'Female'}, ${profile.patient.blood_group || 'N/A'}`}
    >
      {/* Success toast */}
      {successMsg && (
        <div className="mb-4 rounded-xl border border-[#00D4B2]/30 bg-[#00D4B2]/10 px-4 py-3 text-sm font-medium text-[#00D4B2]">
          {successMsg}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="mb-4 rounded-xl border border-[#FF9900]/30 bg-[#FF9900]/10 px-4 py-3 text-sm font-medium text-[#FF9900] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#FF9900] hover:underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Patient Header */}
      <PatientHeader patient={profile.patient} />

      {/* Emergency Flag Button */}
      {!profile.patient.has_emergency_flag && (
        <div className="mt-4">
          <button
            onClick={handleEmergencyFlag}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#FF9900]/40 bg-[#FF9900]/5 px-4 py-2.5 text-sm font-bold text-[#FF9900] transition-all hover:bg-[#FF9900]/10 hover:border-[#FF9900] disabled:opacity-50"
          >
            <span className="text-lg">🚨</span>
            Raise Emergency Flag
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200/60 bg-white p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-[#0A2540] text-white shadow-sm'
                : 'text-[#2D3A4A] hover:bg-[#F8F9FA] hover:text-[#0A2540]'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* ---- VITALS TAB ---- */}
        {activeTab === 'vitals' && (
          <div id="vitals" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Record Vital Signs" description="Enter current measurements (MB-003)">
              <VitalsForm
                onSubmit={handleVitalsSubmit}
                loading={actionLoading}
                existingVitals={profile.vitals?.[0] || null}
              />
            </SectionCard>
            <SectionCard title="Vital Signs History" description={`${profile.vitals?.length || 0} records`}>
              <VitalsDisplay vitals={profile.vitals || []} />
              {profile.vitals && profile.vitals.length > 1 && (
                <div className="mt-4 max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#2D3A4A] border-b border-slate-100">
                        <th className="py-2 text-left font-semibold">Date/Time</th>
                        <th className="py-2 text-left font-semibold">BP</th>
                        <th className="py-2 text-left font-semibold">HR</th>
                        <th className="py-2 text-left font-semibold">SpO₂</th>
                        <th className="py-2 text-left font-semibold">Temp</th>
                        <th className="py-2 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.vitals.slice(1).map((v) => (
                        <tr key={v.id} className="border-b border-slate-50">
                          <td className="py-2 font-mono text-[10px]">{new Date(v.recorded_at).toLocaleString()}</td>
                          <td className="py-2">{v.systolic_bp}/{v.diastolic_bp}</td>
                          <td className="py-2">{v.pulse_bpm}</td>
                          <td className="py-2">{v.spo2_pct}%</td>
                          <td className="py-2">{v.temperature_c}°C</td>
                          <td className="py-2">{v.is_abnormal ? '⚠️' : '✅'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ---- DIAGNOSIS TAB ---- */}
        {activeTab === 'diagnosis' && (
          <div id="diagnosis" className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <SectionCard title="New Diagnosis" description="ICD-10 coded clinical assessment (MB-004)" className="lg:col-span-3">
              <form onSubmit={handleDiagnosisSubmit} className="flex flex-col gap-4">
                <Icd10Search
                  onSelect={(code) => setSelectedIcd10(code)}
                  selectedCode={selectedIcd10?.code}
                />
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    Chief Complaint
                  </label>
                  <input
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Primary reason for visit..."
                    className="w-full rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    History of Present Illness
                  </label>
                  <textarea
                    rows={2}
                    value={hpi}
                    onChange={(e) => setHpi(e.target.value)}
                    placeholder="Onset, duration, severity, context..."
                    className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    Review of Systems
                  </label>
                  <textarea
                    rows={2}
                    value={ros}
                    onChange={(e) => setRos(e.target.value)}
                    placeholder="Systematic review findings..."
                    className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    Examination Findings
                  </label>
                  <textarea
                    rows={2}
                    value={examFindings}
                    onChange={(e) => setExamFindings(e.target.value)}
                    placeholder="Physical examination results..."
                    className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    Preliminary Diagnosis *
                  </label>
                  <input
                    required
                    value={preliminaryDiagnosis}
                    onChange={(e) => setPreliminaryDiagnosis(e.target.value)}
                    placeholder="Working diagnosis..."
                    className="w-full rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedIcd10 || !preliminaryDiagnosis}
                  className="self-start rounded-xl bg-[#00D4B2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                >
                  {actionLoading ? 'Saving...' : 'Record Diagnosis'}
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Diagnosis History" description={`${profile.diagnoses?.length || 0} records`} className="lg:col-span-2">
              {profile.diagnoses && profile.diagnoses.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {profile.diagnoses.map((d) => (
                    <li key={d.id} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-[#00D4B2]">{d.icd10_code}</span>
                        <span className="text-[9px] text-[#2D3A4A]">{new Date(d.diagnosed_at).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#0A2540]">{d.preliminary_diagnosis}</p>
                      {d.chief_complaint && <p className="mt-1 text-[11px] text-[#2D3A4A]">{d.chief_complaint}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#2D3A4A] italic">No diagnoses recorded yet.</p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ---- TESTS TAB ---- */}
        {activeTab === 'tests' && (
          <div id="tests" className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <SectionCard
              title="Order Diagnostic Tests"
              description="Select from catalog (MB-005)"
              className="lg:col-span-3"
              action={
                <button
                  onClick={() => { loadTestCatalog(); }}
                  className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-[10px] font-semibold text-[#2D3A4A] hover:border-[#0A2540]"
                >
                  Load Catalog
                </button>
              }
            >
              {testCatalog.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="max-h-64 overflow-y-auto grid grid-cols-1 gap-2">
                    {testCatalog.map((test) => (
                      <label
                        key={test.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                          selectedTests.has(test.id)
                            ? 'border-[#00D4B2] bg-[#00D4B2]/5'
                            : 'border-slate-200/60 hover:border-[#0A2540]/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTests.has(test.id)}
                          onChange={() => toggleTest(test.id)}
                          className="accent-[#00D4B2]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#0A2540]">{test.test_name}</span>
                          <span className="text-[10px] text-[#2D3A4A]">
                            {test.test_code} • {test.category} • TAT: {test.turnaround_hours}h
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    placeholder="Clinical notes for lab..."
                    className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                  <button
                    onClick={handleTestOrder}
                    disabled={actionLoading || selectedTests.size === 0}
                    className="self-start rounded-xl bg-[#00D4B2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                  >
                    {actionLoading ? 'Ordering...' : `Order ${selectedTests.size} Test(s)`}
                  </button>
                </div>
              )}
              {testCatalog.length === 0 && (
                <p className="text-xs text-[#2D3A4A] italic">Click "Load Catalog" to browse available tests.</p>
              )}
            </SectionCard>

            <SectionCard title="Test Orders & Results" description="Status overview (MB-008)" className="lg:col-span-2">
              {profile.test_orders && profile.test_orders.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {/* We show test orders from the profile; in production this would come from getTestOrders */}
                  {/* For now, show a placeholder */}
                  <li className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
                    <p className="text-xs text-[#2D3A4A] italic">
                      Test orders will appear here. Use the "Load Catalog" button to order tests.
                    </p>
                  </li>
                </ul>
              ) : (
                <p className="text-xs text-[#2D3A4A] italic">No test orders yet.</p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ---- PRESCRIPTIONS TAB ---- */}
        {activeTab === 'prescriptions' && (
          <div id="prescriptions" className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <SectionCard title="Generate Prescription" description="Digital Rx with signature (MB-011, MB-012)" className="lg:col-span-3">
              <form onSubmit={handlePrescriptionSubmit} className="flex flex-col gap-4">
                {prescriptionMeds.map((med, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A2540]">
                        Medication #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMedication(idx)}
                        className="text-[10px] text-[#FF9900] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-0.5">Generic Name *</label>
                        <input
                          required
                          value={med.generic_name}
                          onChange={(e) => updateMedication(idx, 'generic_name', e.target.value)}
                          placeholder="e.g., Paracetamol"
                          className="w-full rounded-lg border border-slate-200/60 px-2.5 py-1.5 text-xs text-[#0A2540] outline-none focus:border-[#0A2540]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-0.5">Brand Name</label>
                        <input
                          value={med.brand_name}
                          onChange={(e) => updateMedication(idx, 'brand_name', e.target.value)}
                          placeholder="e.g., Napa"
                          className="w-full rounded-lg border border-slate-200/60 px-2.5 py-1.5 text-xs text-[#0A2540] outline-none focus:border-[#0A2540]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-0.5">Dosage *</label>
                        <input
                          required
                          value={med.dosage}
                          onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                          className="w-full rounded-lg border border-slate-200/60 px-2.5 py-1.5 text-xs text-[#0A2540] outline-none focus:border-[#0A2540]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-0.5">Frequency *</label>
                        <input
                          required
                          value={med.frequency}
                          onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                          placeholder="e.g., 1+0+1"
                          className="w-full rounded-lg border border-slate-200/60 px-2.5 py-1.5 text-xs text-[#0A2540] outline-none focus:border-[#0A2540]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-0.5">Duration (days) *</label>
                        <input
                          required
                          type="number"
                          min={1}
                          value={med.duration_days}
                          onChange={(e) => updateMedication(idx, 'duration_days', Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200/60 px-2.5 py-1.5 text-xs text-[#0A2540] outline-none focus:border-[#0A2540]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-0.5">Route *</label>
                        <select
                          value={med.route}
                          onChange={(e) => updateMedication(idx, 'route', e.target.value)}
                          className="w-full rounded-lg border border-slate-200/60 px-2.5 py-1.5 text-xs text-[#0A2540] outline-none focus:border-[#0A2540]"
                        >
                          <option>Oral</option>
                          <option>Sublingual</option>
                          <option>IV</option>
                          <option>IM</option>
                          <option>SC</option>
                          <option>Topical</option>
                          <option>Inhalation</option>
                          <option>Rectal</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-0.5">Special Instructions</label>
                      <input
                        value={med.special_instructions}
                        onChange={(e) => updateMedication(idx, 'special_instructions', e.target.value)}
                        placeholder="e.g., Take with food"
                        className="w-full rounded-lg border border-slate-200/60 px-2.5 py-1.5 text-xs text-[#0A2540] outline-none focus:border-[#0A2540]"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMedication}
                  className="self-start rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-[#2D3A4A] hover:border-[#00D4B2] hover:text-[#00D4B2] transition-all"
                >
                  + Add Medication
                </button>
                <textarea
                  rows={2}
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder="Prescription notes..."
                  className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                />
                <button
                  type="submit"
                  disabled={actionLoading || prescriptionMeds.length === 0}
                  className="self-start rounded-xl bg-[#00D4B2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                >
                  {actionLoading ? 'Generating...' : 'Generate Prescription'}
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Prescription History" description={`${profile.prescriptions?.length || 0} records`} className="lg:col-span-2">
              {profile.prescriptions && profile.prescriptions.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {profile.prescriptions.map((p) => (
                    <li key={p.id} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0A2540]">
                          {new Date(p.issued_at).toLocaleDateString()}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          p.status === 'ACTIVE' ? 'bg-[#00D4B2]/10 text-[#00D4B2]' : 'bg-slate-100 text-[#2D3A4A]'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <ul className="mt-2 flex flex-col gap-1">
                        {p.medications?.map((m) => (
                          <li key={m.id} className="text-[11px] text-[#2D3A4A]">
                            {m.generic_name} {m.dosage} — {m.frequency} × {m.duration_days}d ({m.route})
                          </li>
                        ))}
                      </ul>
                      {p.digital_signature_url && (
                        <p className="mt-2 text-[9px] text-[#00D4B2]">✓ Digitally Signed</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#2D3A4A] italic">No prescriptions yet.</p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ---- REFERRAL TAB ---- */}
        {activeTab === 'referral' && (
          <div id="referral" className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <SectionCard title="Create Specialist Referral" description="Refer to specialist care (MB-009)" className="lg:col-span-3">
              <form onSubmit={handleReferralSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    Specialty *
                  </label>
                  <select
                    required
                    value={refSpecialty}
                    onChange={(e) => setRefSpecialty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  >
                    <option value="">Select specialty...</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    Referral Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={refReason}
                    onChange={(e) => setRefReason(e.target.value)}
                    placeholder="Why is this referral needed?"
                    className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                    Clinical Summary
                  </label>
                  <textarea
                    rows={3}
                    value={refSummary}
                    onChange={(e) => setRefSummary(e.target.value)}
                    placeholder="Key findings, vitals, test results summary..."
                    className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refEmergency}
                    onChange={(e) => setRefEmergency(e.target.checked)}
                    className="accent-[#FF9900]"
                  />
                  <span className="text-sm font-medium text-[#FF9900]">🚨 This is an emergency referral</span>
                </label>
                <button
                  type="submit"
                  disabled={actionLoading || !refSpecialty || !refReason}
                  className="self-start rounded-xl bg-[#00D4B2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                >
                  {actionLoading ? 'Creating...' : 'Create Referral'}
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Referral History" description={`${profile.referrals?.length || 0} records`} className="lg:col-span-2">
              {profile.referrals && profile.referrals.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {profile.referrals.map((r) => (
                    <li key={r.id} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0A2540]">{r.specialty_code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          r.status === 'PENDING' ? 'bg-[#FF9900]/10 text-[#FF9900]' :
                          r.status === 'ACCEPTED' ? 'bg-[#00D4B2]/10 text-[#00D4B2]' :
                          'bg-slate-100 text-[#2D3A4A]'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#2D3A4A]">{r.referral_reason}</p>
                      <span className="mt-1 block text-[9px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#2D3A4A] italic">No referrals yet.</p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ---- TIMELINE TAB ---- */}
        {activeTab === 'timeline' && (
          <div id="timeline">
            <SectionCard title="Care Journey Timeline" description="Complete referral chain (MB-010)">
              <ReferralChainTimeline events={profile.referral_chain || []} />
            </SectionCard>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}