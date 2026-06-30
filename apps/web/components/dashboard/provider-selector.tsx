"use client";

import { useState, useEffect } from "react";
import { callCenterApi, type AvailableProvider } from "@/lib/call-center-api";

export interface ServiceFormMeta {
  anatomical_region?: string;
  projection_view?: string;
  targeted_body_part?: string;
  scan_type?: string;
  shift_type?: string;
  certification?: string;
}

interface Props {
  serviceType: string;
  date: string;
  district: string;
  onSelect: (providerId: string | null) => void;
  selectedProviderId: string | null;
}

export default function ProviderSelector({
  serviceType,
  date,
  district,
  onSelect,
  selectedProviderId,
}: Props) {
  const [providers, setProviders] = useState<AvailableProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceType || !date || !district) {
      setProviders([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    callCenterApi
      .getAvailableProviders({ service_type: serviceType, date, district })
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [serviceType, date, district]);

  if (!serviceType || !date || !district) {
    return (
      <p className="text-[10px] text-slate-400 italic">
        Select a service type, date, and time slot to see available providers.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#0A2540]" />
        <span className="text-[10px] text-slate-500">Finding providers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[10px] text-red-500">
        Failed to load providers: {error}
      </p>
    );
  }

  if (providers.length === 0) {
    return (
      <p className="text-[10px] text-slate-400 italic">
        No available providers found for this criteria.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
        Available Providers ({providers.length})
      </p>
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(selectedProviderId === p.id ? null : p.id)}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${
            selectedProviderId === p.id
              ? "border-[#00D4B2] bg-[#00D4B2]/5"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold text-[#0A2540]">{p.name}</span>
            {p.distance && (
              <span className="text-[10px] text-slate-500">{p.distance} away</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {p.rating && (
              <span className="text-[10px] font-medium text-amber-600">
                ★ {p.rating.toFixed(1)}
              </span>
            )}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                p.is_available
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {p.is_available ? "Available" : "Busy"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
