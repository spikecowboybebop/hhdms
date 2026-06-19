"use client";

import { useState } from "react";
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
    active: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg> 
  },
  { 
    label: "Reports", 
    href: "/dashboard/specialist/reports", 
    active: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> 
  },
];

const mockDicomStudies = [
  { id: "STU-8821", patient: "Abdur Rahman", mrn: "MRN-552140", modality: "X-RAY", instances: 4, size: "42.1 MB", date: "2026-06-18" },
  { id: "STU-4902", patient: "Nusrat Jahan", mrn: "MRN-339104", modality: "CT SCAN", instances: 142, size: "318.5 MB", date: "2026-06-19" },
  { id: "STU-1105", patient: "Amir Hossain", mrn: "MRN-902114", modality: "ULTRASOUND", instances: 18, size: "84.9 MB", date: "2026-06-15" },
];

export default function DicomLibraryPage() {
  return (
    <DashboardShell
      role="SPECIALIST"
      accent="slate"
      navItems={navItems}
      pageTitle="DICOM Archive & PACS Node"
      pageSubtitle="Sandbox Object Storage File Registry"
    >
      <SectionCard
        title="Stored Image Studies"
        description="Verify imaging metadata layer instances cached inside the sandbox ecosystem"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A] bg-[#F8F9FA]">
                <th className="p-3">Study UID</th>
                <th className="p-3">Patient Record</th>
                <th className="p-3">Modality</th>
                <th className="p-3">Frame Count</th>
                <th className="p-3">Data Size</th>
                <th className="p-3">Ingest Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {mockDicomStudies.map((study) => (
                <tr key={study.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                  <td className="p-3 font-mono text-xs text-[#0A2540]">{study.id}</td>
                  <td className="p-3 font-medium">
                    <div className="text-[#0A2540]">{study.patient}</div>
                    <div className="text-[11px] text-slate-400">{study.mrn}</div>
                  </td>
                  <td className="p-3">
                    <span className="rounded-md bg-[#0A2540]/5 px-2 py-0.5 text-xs font-semibold text-[#0A2540]">
                      {study.modality}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{study.instances} frames</td>
                  <td className="p-3 text-slate-600 font-mono text-xs">{study.size}</td>
                  <td className="p-3 text-slate-500">{study.date}</td>
                  <td className="p-3 text-right">
                    <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-[#0A2540] hover:text-white transition-all">
                      Mount View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </DashboardShell>
  );
}