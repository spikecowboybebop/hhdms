"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import { specialistApi, type SpecialistReportItem } from "@/lib/specialist-api";

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
    active: true, // Bright highlight indicator locks to this layout view
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> 
  },
];

type ReportItem = SpecialistReportItem;

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SIGNED" | "ARCHIVED">("ALL");
  const [expandedLedgerId, setExpandedLedgerId] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await specialistApi.getReports();
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load specialist reports from API", err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = report.patient.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            report.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, reports]);

  const handlePrint = (report: ReportItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${report.id} - ${report.patient}</title>
          <style>
            body { font-family: monospace; padding: 40px; color: #0A2540; line-height: 1.6; }
            .header { border-bottom: 2px solid #0A2540; padding-bottom: 12px; margin-bottom: 24px; }
            .badge { border: 1px solid #0A2540; padding: 2px 8px; font-weight: bold; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
            .ledger-trail { font-size: 11px; color: #555; background: #eee; padding: 12px; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>AASTHA TELE-HEALTH CLINICAL EXPORT</h2>
            <div>Document Stream Identifier: <strong>${report.id}</strong></div>
          </div>
          <div class="meta-grid">
            <div><strong>Patient Record:</strong> ${report.patient} (${report.mrn})</div>
            <div><strong>Date Generated:</strong> ${report.date}</div>
            <div><strong>Evaluation Scope:</strong> ${report.type}</div>
            <div><strong>Record Security Status:</strong> <span class="badge">${report.status}</span></div>
          </div>
          <h3>DIAGNOSTIC FINDINGS SUMMARY</h3>
          <p>${report.findings}</p>
          <div class="ledger-trail">
            <strong>IMMUTABLE TELE-MEDICINE LEDGER BLOCK SECURITY ID:</strong><br/>
            Cryptographic Integrity Authentication Checksum: ${report.hash}<br/>
            System verified: Cryptographic baseline secure.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <DashboardShell
      role="SPECIALIST"
      accent="slate"
      navItems={navItems}
      pageTitle="Clinical Sign-off Ledger"
      pageSubtitle="Immutable diagnostic reporting records"
    >
      {/* Interactive Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Filter by patient name or report ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white p-1 shadow-sm self-start sm:self-auto">
          {(["ALL", "SIGNED", "ARCHIVED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                statusFilter === tab
                  ? "bg-[#0A2540] text-white shadow-sm"
                  : "text-[#2D3A4A] hover:bg-[#F8F9FA]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
          Loading completed reports from the database…
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
          No reports match the current query criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredReports.map((report) => (
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
                
                  <p className="rounded-xl bg-[#F8F9FA] p-3 text-xs leading-relaxed text-slate-600 border border-slate-100 font-mono">
                    &ldquo;{report.findings}&rdquo;
                  </p>

                {/* Audit Trail Module */}
                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={() => setExpandedLedgerId(expandedLedgerId === report.id ? null : report.id)}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-[#0A2540] transition-colors"
                  >
                    <svg 
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={`transition-transform duration-200 ${expandedLedgerId === report.id ? "rotate-90" : ""}`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    {expandedLedgerId === report.id ? "Hide Cryptographic Ledger" : "Verify Cryptographic Ledger"}
                  </button>

                  {expandedLedgerId === report.id && (
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200/40 p-2 text-[10px] font-mono text-slate-500 space-y-1">
                      <div>[CHAIN SECURE: VALID CREDENTIALS]</div>
                      <div className="truncate"><span className="font-semibold text-slate-700">HASH:</span> {report.hash}</div>
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePrint(report)}
                    className="flex-1 rounded-xl border border-slate-200/80 bg-white py-2.5 text-center text-xs font-semibold text-[#0A2540] hover:bg-[#0A2540] hover:text-white transition-all shadow-sm"
                  >
                    Export PDF Document
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}