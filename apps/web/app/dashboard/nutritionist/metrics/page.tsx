// apps/web/app/dashboard/nutritionist/metrics/page.tsx
"use client";

import { useState } from "react";

export default function RecordMetricsPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-clinical-navy">Record Patient Metrics</h1>
        <p className="text-sm text-slate-gray mt-1">Log physical diagnostic trends and body compositions (NU-003).</p>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Patient Medical Record Number (MRN)
          </label>
          <input
            type="text"
            required
            placeholder="e.g., P-10928"
            className="w-full rounded-xl border border-slate-200/80 bg-soft-slate px-3 py-2.5 text-sm text-clinical-navy placeholder-slate-gray/40 outline-none transition-all focus:border-tech-teal focus:bg-white focus:ring-1 focus:ring-tech-teal"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            placeholder="72.5"
            className="w-full rounded-xl border border-slate-200/80 bg-soft-slate px-3 py-2.5 text-sm text-clinical-navy placeholder-slate-gray/40 outline-none transition-all focus:border-tech-teal focus:bg-white focus:ring-1 focus:ring-tech-teal"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">Height (cm)</label>
          <input
            type="number"
            placeholder="170"
            className="w-full rounded-xl border border-slate-200/80 bg-soft-slate px-3 py-2.5 text-sm text-clinical-navy placeholder-slate-gray/40 outline-none transition-all focus:border-tech-teal focus:bg-white focus:ring-1 focus:ring-tech-teal"
          />
        </div>

        <div className="md:col-span-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-clinical-navy text-white px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all hover:bg-clinical-navy/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Saving..." : "Commit Metrics Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}