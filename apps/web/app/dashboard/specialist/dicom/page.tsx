"use client";

import { useEffect, useState, useMemo } from "react";
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

type DicomStudy = {
  id: string;
  patient: string;
  mrn: string;
  modality: "X-RAY" | "CT SCAN" | "ULTRASOUND";
  instances: number;
  size: string;
  date: string;
  imageUrl: string;
};

export default function DicomLibraryPage() {
  const [modalityFilter, setModalityFilter] = useState<"ALL" | "X-RAY" | "CT SCAN" | "ULTRASOUND">("ALL");
  const [zoom, setZoom] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(125);
  const [searchQuery, setSearchQuery] = useState("");
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [activeStudy, setActiveStudy] = useState<DicomStudy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const specialistId = "9a5b3c2d-1122-3344-5566-778899aabbcc";
    const loadStudies = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/specialist/dicom-studies?specialistId=${specialistId}`);
        if (!res.ok) throw new Error("Failed to load studies");
        const data = await res.json();
        setStudies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load DICOM studies from API", err);
        setStudies([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudies();
  }, []);

  const filteredStudies = useMemo(() => {
    return studies.filter((study) => {
      const matchesModality = modalityFilter === "ALL" || study.modality === modalityFilter;
      const matchesSearch = study.patient.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            study.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            study.mrn.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesModality && matchesSearch;
    });
    }, [modalityFilter, searchQuery, studies]);

  return (
    <DashboardShell
      role="SPECIALIST"
      accent="slate"
      navItems={navItems}
      pageTitle="DICOM Archive & PACS Node"
      pageSubtitle="Sandbox Object Storage File Registry"
    >
      {/* Control strip layout element using justified split spaces */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Modality Filters (Left Side Pin) */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white p-1 shadow-sm w-max">
          {(["ALL", "X-RAY", "CT SCAN", "ULTRASOUND"] as const).map((tab) => (
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

        {/* Patient Lookup Input (Right Side Pin) */}
        <div className="relative flex-1 max-w-xs w-full">
          <input
            type="text"
            placeholder="Search patient or study UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]"
          />
        </div>
      </div>

      {/* Main Studies Table */}
      <SectionCard
        title="Stored Image Studies"
        description="Verify imaging metadata layer instances cached inside the sandbox ecosystem"
      >
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading studies from the database…</div>
          ) : filteredStudies.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No medical images match the specified search queries.
            </div>
          ) : (
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
                {filteredStudies.map((study) => (
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
                      <button 
                        onClick={() => setActiveStudy(study)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-[#0A2540] hover:text-white transition-all shadow-sm"
                      >
                        Mount View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>

      {/* LIGHTBOX / MOCK PACS VIEWER MODAL */}
      {activeStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-2xl overflow-hidden bg-[#0C0F12] text-slate-200 border border-slate-800 shadow-2xl">
            
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#14181B] px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#00D4B2] bg-[#00D4B2]/10 px-2 py-0.5 rounded">
                    PACS NODE ONLINE
                  </span>
                  <h3 className="text-sm font-mono text-slate-400">{activeStudy.id}{` // `}{activeStudy.patient}</h3>
                </div>
              </div>
              <button 
                onClick={() => setActiveStudy(null)}
                className="rounded-lg bg-slate-800/80 p-2 text-xs font-bold text-slate-400 hover:bg-red-900 hover:text-white transition-all"
              >
                UNMOUNT CONSOLE ✕
              </button>
            </div>

            {/* Viewer Workspace Content Split */}
            <div className="flex flex-1 overflow-hidden">
            {/* Left Canvas Panel (Simulated Viewport) */}
            <div className="relative flex flex-1 items-center justify-center bg-black p-4 group overflow-hidden">
            
            {/* Wrapper div to contain the zoom scale bounds safely */}
            <div className="overflow-hidden w-full h-full flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                src={activeStudy.imageUrl} 
                alt="DICOM Instance Stream Node Placeholder"
                style={{
                    transform: `scale(${zoom / 100})`,
                    // Separated mix-blend-mode to avoid choking out the native CSS filters
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    transition: "transform 0.1s ease-out, filter 0.1s ease-out"
                }}
                className="h-full max-h-[60vh] object-contain select-none mix-blend-luminosity border border-slate-950 shadow-inner"
                />
            </div>

            {/* Simulated Grid Target Overlays */}
            <div className="absolute top-4 left-4 font-mono text-[10px] text-slate-500 space-y-0.5 bg-black/60 p-2 rounded pointer-events-none">
                <div>PATIENT: {activeStudy.patient}</div>
                <div>MRN: {activeStudy.mrn}</div>
                <div>MODALITY: {activeStudy.modality}</div>
            </div>

            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-slate-500 bg-black/60 p-2 rounded pointer-events-none">
                <div>FPS: 24 (RAW STREAM)</div>
                <div>RENDER: WEB_GL_CANVAS</div>
            </div>

            <div className="absolute bottom-4 right-4 font-mono text-[10px] text-[#00D4B2] bg-black/60 p-2 rounded text-right pointer-events-none">
                    <div>FRAME: 1 / {activeStudy.instances}</div>
                    <div>ZOOM: {zoom}%</div>
                    </div>
            </div>
              {/* Right Diagnostic Tools Control Column */}
              <div className="w-64 border-l border-slate-800 bg-[#111416] p-4 text-xs font-mono space-y-4 text-slate-400">
                <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase border-b border-slate-800 pb-1">
                  PACS Engine Attributes
                </div>
                <div className="space-y-1">
                  <div><span className="text-slate-500">File Payload:</span> {activeStudy.size}</div>
                  <div><span className="text-slate-500">Compression:</span> Lossless JPEG</div>
                  <div><span className="text-slate-500">Transfer Syntax:</span> 1.2.840.10008</div>
                </div>

                <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase border-b border-slate-800 pt-2 pb-1">
                Active Viewport Tuning
                </div>
                <div className="space-y-3">
                {/* Live Zoom Slider */}
                <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Manual Zoom Level ({zoom}%)</label>
                    <input 
                    type="range" 
                    min="50" 
                    max="200" 
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded accent-[#00D4B2] cursor-pointer" 
                    />
                </div>

                {/* Live Brightness Slider */}
                <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Window Level / Brightness ({brightness}%)</label>
                    <input 
                    type="range" 
                    min="50" 
                    max="200" 
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded accent-[#00D4B2] cursor-pointer" 
                    />
                </div>

                {/* Live Contrast Slider */}
                <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Contrast Threshold ({contrast}%)</label>
                    <input 
                    type="range" 
                    min="50" 
                    max="250" 
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded accent-[#00D4B2] cursor-pointer" 
                    />
                </div>

                {/* Reset Button */}
                <button
                    onClick={() => { setZoom(100); setBrightness(100); setContrast(125); }}
                    className="w-full rounded bg-slate-800 py-1.5 text-[10px] text-center font-bold text-slate-300 hover:bg-slate-700 transition-all"
                >
                    RESET VIEWPORT VALUES
                </button>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-[11px] text-slate-400 leading-normal">
                  <span className="text-[#00D4B2] font-bold">Presentation Mode:</span> Real-time mouse coordinate trackers and canvas window controls are handled via local client sandboxing parameters.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}