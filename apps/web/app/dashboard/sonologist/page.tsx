"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard, StatCard } from "@/components/dashboard/dashboard-cards";
import { loadSession, type StoredSession } from "@/lib/auth";
import { sonologistApi, type SonologistStudy, type CreateUsgReportPayload, type SonologistDashboardStats } from "@/lib/sonologist-api";

export default function SonologistDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "studies" | "report">("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SonologistDashboardStats | null>(null);
  const [studies, setStudies] = useState<SonologistStudy[]>([]);
  const [reportForm, setReportForm] = useState<CreateUsgReportPayload>({
    patient_id: "", body_part: "", findings: "", impression: "", annotated_images: "", storage_url: "", dicom_series_uids: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (!s || s.user.role !== "SONOLOGIST") {
      router.replace("/signin");
      return;
    }

    const checkHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (["overview", "studies", "report"].includes(hash)) {
        setActiveTab(hash as any);
      } else {
        setActiveTab("overview");
      }
    };

    checkHash();
    setLoading(false);

    const interval = setInterval(checkHash, 100);
    window.addEventListener("hashchange", checkHash);

    return () => {
      clearInterval(interval);
      window.removeEventListener("hashchange", checkHash);
    };
  }, [router]);

  useEffect(() => {
    if (!loading && session) {
      sonologistApi.getDashboardStats().then(setStats).catch(() => {});
      sonologistApi.getMyStudies().then(setStudies).catch(() => {});
    }
  }, [loading, session]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);
    setError(null);
    try {
      const result = await sonologistApi.createStudy(reportForm);
      setSubmitMsg(`USG study recorded successfully (ID: ${result.id.slice(0, 8)}…)`);
      setReportForm({ patient_id: "", body_part: "", findings: "", impression: "", annotated_images: "", storage_url: "", dicom_series_uids: "" });
      sonologistApi.getMyStudies().then(setStudies).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit USG report.");
    } finally {
      setSubmitting(false);
    }
  };

  const navItems = [
    { label: "Overview", href: "#overview", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
    { label: "USG Studies", href: "#studies", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
    { label: "New Report", href: "#report", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
  ];

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-6 py-4 shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4B2] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00D4B2]" />
          </span>
          <span className="text-sm font-medium text-[#2D3A4A]">Loading sonologist workspace…</span>
        </div>
      </main>
    );
  }

  const abnormalCount = studies.filter((s) => s.is_abnormal).length;

  return (
    <DashboardShell
      role={session?.user.role || "SONOLOGIST"}
      accent="navy"
      navItems={navItems}
      pageTitle={
        activeTab === "overview" ? "Sonologist Diagnostic Console" :
        activeTab === "studies" ? "USG Imaging Studies" : "New USG Report"
      }
      pageSubtitle={
        activeTab === "overview" ? "Portable ultrasound diagnostic workspace." :
        activeTab === "studies" ? "All completed ultrasound examinations." :
        "Record a new ultrasound study and report."
      }
    >
      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total USG Studies" value={stats?.total_studies ?? studies.length} accent="navy" />
            <StatCard label="Total Reports" value={stats?.total_reports ?? 0} accent="teal" />
            <StatCard label="Abnormal Findings" value={abnormalCount} accent={abnormalCount > 0 ? "amber" : "teal"} trend={abnormalCount > 0 ? "down" : "flat"} />
            <StatCard label="Unique Patients" value={new Set(studies.map((s) => s.patient_id)).size} accent="slate" />
          </div>

          <SectionCard title="Recent USG Studies" description="Latest 5 ultrasound examinations.">
            {stats?.recent_studies && stats.recent_studies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                      <th className="py-2 pr-4">Patient</th>
                      <th className="py-2 pr-4">MRN</th>
                      <th className="py-2 pr-4">Body Part</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_studies.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 text-[#0A2540]">
                        <td className="py-2.5 pr-4 font-medium">{s.patient.first_name_en} {s.patient.last_name_en}</td>
                        <td className="py-2.5 pr-4 text-xs text-[#2D3A4A]">{s.patient.mrn}</td>
                        <td className="py-2.5 pr-4">{s.body_part || "—"}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            s.is_abnormal ? "bg-[#FF9900]/10 text-[#FF9900]" : "bg-[#00D4B2]/10 text-[#00D4B2]"
                          }`}>
                            {s.is_abnormal ? "Abnormal" : "Normal"}
                          </span>
                        </td>
                        <td className="py-2.5 text-xs text-[#2D3A4A]">{s.study_date ? new Date(s.study_date).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No USG studies recorded yet. Start by creating a new report.
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── STUDIES ── */}
      {activeTab === "studies" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {studies.length === 0 ? (
            <SectionCard title="USG Studies Library" description="All ultrasound examinations.">
              <div className="py-8 text-center text-xs text-slate-400">
                No studies found.
              </div>
            </SectionCard>
          ) : (
            studies.map((study) => (
              <SectionCard
                key={study.id}
                title={`${study.patient.first_name_en} ${study.patient.last_name_en} — ${study.body_part || "USG"}`}
                description={`MRN: ${study.patient.mrn} | ${new Date(study.study_date).toLocaleDateString()}`}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A] mb-1">Findings</h4>
                    <p className="text-sm text-[#0A2540]">{study.findings || "No findings recorded."}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A] mb-1">Impression</h4>
                    <p className="text-sm text-[#0A2540]">{study.impression || "No impression recorded."}</p>
                  </div>
                </div>
                {study.reports.length > 0 && (
                  <div className="mt-4 border-t border-slate-200/60 pt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A] mb-2">Reports ({study.reports.length})</h4>
                    {study.reports.map((r) => (
                      <div key={r.id} className="rounded-xl bg-[#F8F9FA] p-3 mb-2 text-sm">
                        <p className="text-[#0A2540]">{r.findings}</p>
                        {r.impression && <p className="text-xs text-[#2D3A4A] mt-1">Impression: {r.impression}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            ))
          )}
        </div>
      )}

      {/* ── NEW REPORT ── */}
      {activeTab === "report" && (
        <div className="max-w-2xl animate-in fade-in duration-200">
          <SectionCard title="New USG Study Report" description="Record an ultrasound examination and its findings.">
            <form className="space-y-4" onSubmit={handleSubmitReport}>
              <div>
                <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Patient ID</label>
                <input type="text" required value={reportForm.patient_id} onChange={(e) => setReportForm({ ...reportForm, patient_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-[#0A2540]"
                  placeholder="Patient UUID" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Body Part</label>
                <input type="text" required value={reportForm.body_part} onChange={(e) => setReportForm({ ...reportForm, body_part: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-[#0A2540]"
                  placeholder="e.g. Whole Abdomen, Pelvis, Obstetric" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Findings</label>
                <textarea rows={4} required value={reportForm.findings} onChange={(e) => setReportForm({ ...reportForm, findings: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-[#0A2540]"
                  placeholder="Describe the ultrasound findings…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Impression (optional)</label>
                <textarea rows={3} value={reportForm.impression || ""} onChange={(e) => setReportForm({ ...reportForm, impression: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-[#0A2540]"
                  placeholder="Clinical impression…" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Storage URL</label>
                  <input type="text" value={reportForm.storage_url || ""} onChange={(e) => setReportForm({ ...reportForm, storage_url: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-[#0A2540]"
                    placeholder="UploadCare / DICOM URL" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">DICOM Series UIDs</label>
                  <input type="text" value={reportForm.dicom_series_uids || ""} onChange={(e) => setReportForm({ ...reportForm, dicom_series_uids: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-[#0A2540]"
                    placeholder="Comma-separated UIDs" />
                </div>
              </div>

              {submitMsg && (
                <div className="rounded-xl bg-[#00D4B2]/10 p-3 text-xs font-medium text-[#00D4B2] border border-[#00D4B2]/20">
                  {submitMsg}
                </div>
              )}
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full rounded-xl bg-[#0A2540] text-white px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all hover:bg-opacity-90 disabled:opacity-70 cursor-pointer">
                {submitting ? "Submitting…" : "Submit USG Report"}
              </button>
            </form>
          </SectionCard>
        </div>
      )}
    </DashboardShell>
  );
}
