"use client";

// Must patch console before dcmjs is imported (dcmjs captures console.error at module init)
if (typeof window !== "undefined") {
  const origError = console.error.bind(console);
  console.error = (...args) => {
    if (args.some((a) => typeof a === "string" && /Invalid vr type/i.test(a))) return;
    origError(...args);
  };
}

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/dashboard-cards";
import { specialistApi, type DicomStudy } from "@/lib/specialist-api";

const DicomViewer = dynamic(
  () => import("@/components/specialist/dicom-viewer").then((m) => m.DicomViewer),
  { ssr: false },
);

const navItems: (DashboardNavItem & { active?: boolean })[] = [
  {
    label: "Diagnostic Console",
    href: "/dashboard/specialist",
    active: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></svg>,
  },
  {
    label: "Reports",
    href: "/dashboard/specialist/reports",
    active: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
];

export default function DicomLibraryPage() {
  const [modalityFilter, setModalityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [activeStudy, setActiveStudy] = useState<DicomStudy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudies = async () => {
      try {
        const data = await specialistApi.getDicomStudies();
        setStudies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load DICOM studies", err);
        setStudies([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudies();
  }, []);

  const modalities = useMemo(() => {
    const set = new Set(studies.map((s) => s.modality));
    return ["ALL", ...Array.from(set).sort()];
  }, [studies]);

  const filteredStudies = useMemo(() => {
    return studies.filter((study) => {
      const matchesModality = modalityFilter === "ALL" || study.modality === modalityFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        study.patient.first_name_en.toLowerCase().includes(query) ||
        study.patient.last_name_en.toLowerCase().includes(query) ||
        study.patient.mrn.toLowerCase().includes(query) ||
        study.id.toLowerCase().includes(query);
      return matchesModality && matchesSearch;
    });
  }, [modalityFilter, searchQuery, studies]);

  return (
    <DashboardShell
      role="SPECIALIST"
      accent="slate"
      navItems={navItems}
      pageTitle="DICOM Library"
      pageSubtitle="View and analyze medical imaging studies"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white p-1 shadow-sm w-max">
          {modalities.map((tab) => (
            <button
              key={tab}
              onClick={() => setModalityFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                modalityFilter === tab
                  ? "bg-[#0A2540] text-white shadow-sm"
                  : "text-[#2D3A4A] hover:bg-[#F8F9FA]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs w-full">
          <input
            type="text"
            placeholder="Search patient or MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]"
          />
        </div>
      </div>

      <SectionCard title="Imaging Studies" description="DICOM studies available for review">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading studies...</div>
          ) : filteredStudies.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No studies match the current filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A] bg-[#F8F9FA]">
                  <th className="p-3">Patient</th>
                  <th className="p-3">MRN</th>
                  <th className="p-3">Modality</th>
                  <th className="p-3">Body Part</th>
                  <th className="p-3">Study Date</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudies.map((study) => (
                  <tr key={study.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                    <td className="p-3 font-medium text-[#0A2540]">
                      {study.patient.first_name_en} {study.patient.last_name_en}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-500">{study.patient.mrn}</td>
                    <td className="p-3">
                      <span className="rounded-md bg-[#0A2540]/5 px-2 py-0.5 text-xs font-semibold text-[#0A2540]">
                        {study.modality}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{study.body_part || "—"}</td>
                    <td className="p-3 text-slate-500">
                      {study.study_date
                        ? new Date(study.study_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 text-slate-500 max-w-[200px] truncate">
                      {study.description || "—"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setActiveStudy(study)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-[#0A2540] hover:text-white transition-all shadow-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>

      {activeStudy && (
        <DicomViewer study={activeStudy} onClose={() => setActiveStudy(null)} />
      )}
    </DashboardShell>
  );
}
