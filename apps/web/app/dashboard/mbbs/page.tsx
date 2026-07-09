"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import {
  DashboardShell,
  type DashboardNavItem,
  type DashboardUserMenuItem,
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
import { mbbsApi, type Patient } from "@/lib/mbbs-api";
import SignatureUploadModal from "@/components/dashboard/signature-modal";

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null | undefined>(undefined);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const userMenuItems: DashboardUserMenuItem[] = useMemo(() => [
    {
      label: "Add Digital Signature",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
      onClick: () => setSignatureModalOpen(true),
    },
  ], []);
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

  // Load patients from API when hydrated
  useEffect(() => {
    if (!hydrated || !session) return;
    const load = async () => {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const [data, sig] = await Promise.all([
          mbbsApi.getMyPatients(),
          mbbsApi.getSignature().catch(() => ({ signature_url: null })),
        ]);
        setPatients(data);
        setSignatureUrl(sig.signature_url);
        if (data.length > 0 && !selected) setSelected(data[0] ?? null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load patients';
        setPatientsError(msg);
      } finally {
        setPatientsLoading(false);
      }
    };
    load();
  }, [hydrated, session]);

  // Socket.IO connection for real-time visit state updates
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (!hydrated || !session) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const socketUrl = apiUrl.replace(/\/+$/, '');
    const socket = io(`${socketUrl}/visit`, {
      auth: { token: session.token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('visit_state_changed', (data: { patientId: string; state: string; patient_consent?: string | null }) => {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === data.patientId
            ? { ...p, appointment_activity: data.state, patient_consent: data.patient_consent ?? p.patient_consent }
            : p,
        ),
      );
      setSelected((prev) =>
        prev && prev.id === data.patientId
          ? { ...prev, appointment_activity: data.state, patient_consent: data.patient_consent ?? prev.patient_consent }
          : prev,
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, session]);

  const waitingCount = useMemo(() => patients.filter((p) => !p.has_emergency_flag).length, [patients]);
  const emergencyCount = useMemo(() => patients.filter((p) => p.has_emergency_flag).length, [patients]);

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
      userMenuItems={userMenuItems}
      pageTitle="Clinical Triage Gateway"
      pageSubtitle="Rapid patient intake, vitals capture, and ICD-10 diagnostic mapping"
    >
      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="My Patients"
          value={patientsLoading ? '…' : patients.length}
          delta={`${emergencyCount} emergency`}
          trend={emergencyCount > 0 ? 'up' : 'flat'}
          accent="navy"
        />
        <StatCard
          label="Stable"
          value={patientsLoading ? '…' : waitingCount}
          delta="Awaiting triage"
          trend="flat"
          accent="teal"
        />
        <StatCard
          label="Emergency"
          value={patientsLoading ? '…' : emergencyCount}
          delta="Requires immediate attention"
          trend={emergencyCount > 0 ? 'up' : 'flat'}
          accent="amber"
        />
        <StatCard
          label="Digital Signature"
          value={signatureUrl === undefined ? '…' : signatureUrl ? 'Ready' : 'Not Ready'}
          delta={signatureUrl ? 'Signature on file' : 'Upload required'}
          trend={signatureUrl ? 'up' : 'down'}
          accent={signatureUrl ? 'teal' : 'amber'}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Patient list */}
        <SectionCard
          title="Assigned Patients"
          description={patientsLoading ? 'Loading...' : 'Sorted by last update'}
          className="lg:col-span-2"
          action={
            <span className="rounded-full bg-[#0A2540] px-2.5 py-1 text-[10px] font-semibold text-[#00D4B2]">
              {patients.length} patients
            </span>
          }
        >
          {patientsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#00D4B2]" />
              <span className="text-xs text-[#2D3A4A]">Loading patients...</span>
            </div>
          ) : patientsError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-xs font-medium text-red-600">{patientsError}</p>
            </div>
          ) : patients.length === 0 ? (
            <p className="text-xs text-[#2D3A4A] italic py-4">
              No patients are currently assigned to you.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {patients.map((p) => (
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                          {p.mrn}
                        </span>
                        <span className={`
                          inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider
                          ${p.appointment_activity === 'arrived'
                            ? 'bg-green-100 text-green-700'
                            : p.appointment_activity === 'arriving'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }
                        `}>
                          {p.appointment_activity === 'arrived'
                            ? 'Arrived'
                            : p.appointment_activity === 'arriving'
                              ? 'Arriving'
                              : 'Not Visited'}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          p.has_emergency_flag
                            ? selected?.id === p.id
                              ? "bg-white/20 text-white"
                              : "bg-[#FF9900]/10 text-[#FF9900]"
                            : selected?.id === p.id
                              ? "bg-[#00D4B2] text-[#0A2540]"
                              : "bg-[#00D4B2]/10 text-[#00D4B2]"
                        }`}
                      >
                        {p.has_emergency_flag ? 'EMERGENCY' : 'STABLE'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold tracking-tight">
                        {p.first_name_en} {p.last_name_en}
                      </span>
                      <span className="text-[11px] opacity-70">
                        {p.sex}, {p.blood_group || 'N/A'}
                      </span>
                    </div>
                    <span
                      className={`text-xs leading-snug ${selected?.id === p.id ? "text-white/80" : "text-[#2D3A4A]"}`}
                    >
                      {p.known_allergies ? `Allergies: ${p.known_allergies}` : 'No known allergies'}
                    </span>
                    {p.appointment_activity === 'arrived' && p.patient_consent === null && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          mbbsApi.requestConsent(p.id).then(() => {
                            setPatients((prev) => prev.map((x) => x.id === p.id ? { ...x, patient_consent: 'pending' } : x));
                          }).catch(() => {});
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); mbbsApi.requestConsent(p.id).then(() => { setPatients((prev) => prev.map((x) => x.id === p.id ? { ...x, patient_consent: 'pending' } : x)); }).catch(() => {}); } }}
                        className="mt-1 inline-block cursor-pointer self-start rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-teal-600 transition-all hover:bg-teal-50"
                      >
                        Ask for Consent
                      </span>
                    )}
                    {p.appointment_activity === 'arrived' && p.patient_consent === 'pending' && (
                      <span className="mt-1 self-start rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold text-amber-700">
                        Waiting for consent...
                      </span>
                    )}
                    {p.appointment_activity === 'arrived' && p.patient_consent === 'denied' && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          mbbsApi.requestConsent(p.id).then(() => {
                            setPatients((prev) => prev.map((x) => x.id === p.id ? { ...x, patient_consent: 'pending' } : x));
                          }).catch(() => {});
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); mbbsApi.requestConsent(p.id).then(() => { setPatients((prev) => prev.map((x) => x.id === p.id ? { ...x, patient_consent: 'pending' } : x)); }).catch(() => {}); } }}
                        className="mt-1 inline-block cursor-pointer self-start rounded-full bg-[#FF9900] px-3 py-1 text-[10px] font-semibold text-white transition-all hover:bg-[#FF9900]/90"
                      >
                        Consent Denied — Ask Again
                      </span>
                    )}
                    {p.appointment_activity === 'arrived' && p.patient_consent === 'granted' && (
                      <span className="mt-1 self-start rounded-full bg-green-100 px-3 py-1 text-[10px] font-semibold text-green-700">
                        ✓ Consented
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Detail + Actions */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {selected && (
            <SectionCard
              title={`Patient — ${selected.first_name_en} ${selected.last_name_en}`}
              description={`MRN: ${selected.mrn} • ${selected.sex === 'M' ? 'Male' : 'Female'} • ${selected.blood_group || 'N/A'} • ${selected.appointment_activity === 'arrived' ? 'Arrived' : selected.appointment_activity === 'arriving' ? 'Arriving' : 'Not Visited'}`}
              action={
                <div className="flex gap-2">
                  {selected.appointment_activity === 'arrived' && selected.patient_consent === 'granted' ? (
                    <Link
                      href={`/dashboard/mbbs/patients/${selected.id}`}
                      className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-[11px] font-semibold text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540]"
                    >
                      Full Record
                    </Link>
                  ) : (
                    <span className="inline-block cursor-not-allowed rounded-lg border border-slate-200/60 px-3 py-1.5 text-[11px] font-semibold text-slate-400" title={selected.appointment_activity !== 'arrived' ? 'Patient has not arrived yet' : 'Awaiting patient consent'}>
                      Full Record
                    </span>
                  )}
                  {selected.appointment_activity === 'arrived' && selected.patient_consent === 'granted' ? (
                    <Link
                      href={`/dashboard/mbbs/patients/${selected.id}`}
                      className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-md"
                    >
                      Start Consult
                    </Link>
                  ) : (
                    <span className="inline-block cursor-not-allowed rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-400" title={selected.appointment_activity !== 'arrived' ? 'Patient has not arrived yet' : 'Awaiting patient consent'}>
                      {selected.appointment_activity === 'arrived' ? 'Awaiting Consent' : 'Waiting for Arrival'}
                    </span>
                  )}
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Phone", value: selected.phone_number || 'N/A' },
                  { label: "Emergency Contact", value: selected.emergency_contact || 'N/A' },
                  { label: "District", value: selected.district || 'N/A' },
                  { label: "Blood Group", value: selected.blood_group || 'N/A' },
                ].map((v) => (
                  <div
                    key={v.label}
                    className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3"
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      {v.label}
                    </span>
                    <span className="mt-1 text-sm font-bold tracking-tight text-[#0A2540]">
                      {v.value}
                    </span>
                  </div>
                ))}
              </div>

              {selected.known_allergies && (
                <div className="mt-4 rounded-xl border border-[#FF9900]/30 bg-[#FF9900]/5 px-4 py-3">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#FF9900] mb-1">
                    Known Allergies
                  </span>
                  <p className="text-xs text-[#2D3A4A]">{selected.known_allergies}</p>
                </div>
              )}

              {selected.current_medications && (
                <div className="mt-4 rounded-xl border border-[#00D4B2]/30 bg-[#00D4B2]/5 px-4 py-3">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#00D4B2] mb-1">
                    Current Medications
                  </span>
                  <p className="text-xs text-[#2D3A4A]">{selected.current_medications}</p>
                </div>
              )}
            </SectionCard>
          )}

          {!selected && (
            <SectionCard title="Clinical Triage Gateway" description="Select a patient from the list to begin">
              <div className="flex flex-col items-center gap-4 py-6">
                <span className="text-4xl">🏥</span>
                <p className="text-sm text-[#2D3A4A] text-center max-w-xs">
                  Select a patient from the list on the left to view their details and start a clinical consultation.
                </p>
                <Link
                  href="/dashboard/mbbs"
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A2540]/90 transition-all"
                >
                  Refresh Patient List
                </Link>
              </div>
            </SectionCard>
          )}

          {/* Quick Actions */}
          {selected && (
            <SectionCard title="Quick Actions" description={
              selected.appointment_activity === 'arrived' && selected.patient_consent === 'granted'
                ? 'Common workflows for this patient'
                : 'Unavailable until patient arrives and gives consent'
            }>
              {selected.appointment_activity === 'arrived' && selected.patient_consent === 'granted' ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Link
                    href={`/dashboard/mbbs/patients/${selected.id}#vitals`}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-3 py-3 text-center hover:border-[#0A2540]/40 transition-all"
                  >
                    <span className="text-lg">🩺</span>
                    <span className="text-[10px] font-semibold text-[#0A2540]">Vital Signs</span>
                  </Link>
                  <Link
                    href={`/dashboard/mbbs/patients/${selected.id}#diagnosis`}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-3 py-3 text-center hover:border-[#0A2540]/40 transition-all"
                  >
                    <span className="text-lg">📋</span>
                    <span className="text-[10px] font-semibold text-[#0A2540]">Diagnosis</span>
                  </Link>
                  <Link
                    href={`/dashboard/mbbs/patients/${selected.id}#prescriptions`}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-3 py-3 text-center hover:border-[#0A2540]/40 transition-all"
                  >
                    <span className="text-lg">💊</span>
                    <span className="text-[10px] font-semibold text-[#0A2540]">Prescription</span>
                  </Link>
                  <Link
                    href={`/dashboard/mbbs/patients/${selected.id}#referral`}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-3 py-3 text-center hover:border-[#0A2540]/40 transition-all"
                  >
                    <span className="text-lg">🏥</span>
                    <span className="text-[10px] font-semibold text-[#0A2540]">Referral</span>
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-xs text-slate-400">
                    {selected.appointment_activity !== 'arrived'
                      ? 'Quick actions are available once the patient has arrived.'
                      : 'Quick actions are available once the patient grants consent.'}
                  </p>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      <SignatureUploadModal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
      />
    </DashboardShell>
  );
}
