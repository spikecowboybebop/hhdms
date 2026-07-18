"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import { loadSession } from "@/lib/auth";
import {
  specialistApi,
  type IncomingReferral,
} from "@/lib/specialist-api";

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

function SpecialistDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<any | null>(null);
  const specialistId = useMemo(() => {
    return searchParams.get("specialistId") || session?.user?.id || "9a5b3c2d-1122-3344-5566-778899aabbcc";
  }, [searchParams, session]);
  const [hydrated, setHydrated] = useState(false);
  const [referrals, setReferrals] = useState<IncomingReferral[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
      const data = await specialistApi.getReferrals();
      setReferrals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Backend specialist endpoint unavailable; showing empty queue.", err);
      setReferrals([]);
    }
  }, []);

  useEffect(() => {
    if (hydrated && session) {
      fetchReferrals();
    }
  }, [hydrated, session, fetchReferrals]);

  const filteredReferrals = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase();
    return referrals.filter((r) =>
      `${r.patient.first_name_en} ${r.patient.last_name_en}`.toLowerCase().includes(q) ||
      r.patient.mrn.toLowerCase().includes(q),
    );
  }, [referrals, searchQuery]);

  const handleInspectPatient = useCallback(
    (referral: IncomingReferral) => {
      sessionStorage.setItem(`referral_${referral.id}`, JSON.stringify(referral));
      router.push(`/dashboard/specialist/consultation/${referral.id}`);
    },
    [router],
  );

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

  const pendingCount = referrals.filter((r) => r.status === "PENDING").length;

  return (
    <DashboardShell
      role={session.user.role}
      accent="slate"
      navItems={navItems}
      pageTitle="Diagnostic Console"
      pageSubtitle={`Dr. ${session.user.first_name_en || ""} ${session.user.last_name_en || ""} • ${referrals.length} referral${referrals.length !== 1 ? 's' : ''}`}
    >
      <div className="mt-6">
        <SectionCard title="Incoming Referrals" description={`${pendingCount} pending, ${referrals.length} total`}>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]"
            />
          </div>

          {filteredReferrals.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-3">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              <span className="text-sm font-medium text-slate-400">
                {referrals.length === 0 ? "No referrals to display" : "No matching patients"}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-slate-200/60">
                    <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Patient Name</th>
                    <th className="px-4 py-2.5 font-semibold text-[#0A2540]">MRN</th>
                    <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Sex</th>
                    <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Specialty</th>
                    <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Received</th>
                    <th className="px-4 py-2.5 font-semibold text-[#0A2540]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200/60 last:border-0 bg-white hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#0A2540]">
                        {r.patient.first_name_en} {r.patient.last_name_en}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{r.patient.mrn}</td>
                      <td className="px-4 py-3 text-slate-500">{r.patient.sex}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#0A2540]/10 px-2 py-0.5 text-[9px] font-semibold text-[#0A2540]">
                          {r.specialty_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          r.status === "PENDING"
                            ? "bg-[#FF9900]/10 text-[#FF9900]"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleInspectPatient(r)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#0A2540] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#0A2540]/80 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          Inspect Patient
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
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
          <span className="text-sm font-medium text-[#2D3A4A]">Loading workspace…</span>
        </div>
      </main>
    }>
      <SpecialistDashboardContent />
    </Suspense>
  );
}
