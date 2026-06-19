"use client";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";

const navItems: (DashboardNavItem & { active?: boolean })[] = [
  { 
    label: "Diagnostic Console", 
    href: "/dashboard/specialist", 
    active: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></svg> 
  },
  { 
    label: "DICOM Library", 
    href: "/dashboard/specialist/dicom", 
    active: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg> 
  },
  { 
    label: "Reports", 
    href: "/dashboard/specialist/reports", 
    active: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> 
  },
];

const mockReports = [
  { id: "REP-2026-01", patient: "Abdur Rahman", type: "Dermatological Mapping", status: "SIGNED", date: "June 19, 2026" },
  { id: "REP-2026-02", patient: "Fatima Al-Sayed", type: "Abdominal Ultrasound Assessment", status: "ARCHIVED", date: "June 14, 2026" },
];

export default function ReportsPage() {
  return (
    <DashboardShell
      role="SPECIALIST"
      accent="slate"
      navItems={navItems}
      pageTitle="Clinical Sign-off Ledger"
      pageSubtitle="Immutable diagnostic reporting records"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {mockReports.map((report) => (
          <SectionCard
            key={report.id}
            title={report.patient}
            description={`Document Stream UID: ${report.id}`}
            action={
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase ${
                report.status === "SIGNED" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
              }`}>
                {report.status}
              </span>
            }
          >
            <div className="mt-2 space-y-3">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-[#2D3A4A]">Evaluation Type:</span> {report.type}
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-[#2D3A4A]">Released Datetime:</span> {report.date}
              </div>
              <hr className="border-slate-100" />
              <div className="flex gap-2">
                <button 
                  onClick={() => alert("Simulating cryptographically verified PDF print sequence...")}
                  className="flex-1 rounded-xl border border-slate-200/80 bg-white py-2 text-center text-xs font-semibold text-[#0A2540] hover:bg-[#F8F9FA] transition-all"
                >
                  Export PDF Document
                </button>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </DashboardShell>
  );
}