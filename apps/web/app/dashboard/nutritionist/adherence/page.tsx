// apps/web/app/dashboard/nutritionist/adherence/page.tsx
"use client";

import { useState } from "react";

export default function AdherenceLogPage() {
  const [score, setScore] = useState(85);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-clinical-navy">Log Patient Adherence</h1>
        <p className="text-sm text-slate-gray mt-1">Submit progress scorecard analytics for patient check-ins (NU-006).</p>
      </div>

      <div className="flex flex-col gap-6 max-w-xl">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">Patient Selection</label>
          <input 
            type="text" 
            placeholder="Search patient record..."
            className="w-full rounded-xl border border-slate-200/80 bg-soft-slate px-3 py-2.5 text-sm text-clinical-navy placeholder-slate-gray/40 outline-none transition-all focus:border-tech-teal focus:bg-white" 
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Adherence Performance</label>
            <span className="text-xs font-bold text-clinical-navy bg-tech-teal/20 px-2 py-0.5 rounded-md">{score}% Compliance</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={score}
            onChange={e => setScore(Number(e.target.value))}
            className="w-full h-1.5 rounded-lg bg-soft-slate appearance-none cursor-pointer accent-tech-teal" 
          />
        </div>

        <button className="w-full sm:w-auto self-start rounded-xl bg-clinical-navy text-white px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all hover:bg-clinical-navy/90">
          Publish Adherence Metrics
        </button>
      </div>
    </div>
  );
}