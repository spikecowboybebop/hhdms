"use client";

import { useState, useEffect } from "react";
import { callCenterApi, type AvailableProvider } from "@/lib/call-center-api";
import { mbbsApi, type AvailableMbbsProvider } from "@/lib/mbbs-api";

export interface ServiceFormMeta {
  anatomical_region?: string;
  projection_view?: string;
  targeted_body_part?: string;
  scan_type?: string;
  shift_type?: string;
  certification?: string;
  chief_complaint?: string;
  specialist_type?: string;
  specialist_reason?: string;
  nurse_care_type?: string;
  nurse_duration_days?: string;
  child_age?: string;
  pediatric_care_type?: string;
  goal_type?: string;
  dietary_restrictions?: string;
}

interface Props {
  serviceType: string;
  date: string;
  district: string;
  thana: string;
  onSelect: (providerId: string | null) => void;
  selectedProviderId: string | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProviderSelector({
  serviceType,
  date,
  district,
  thana,
  onSelect,
  selectedProviderId,
}: Props) {
  const [providers, setProviders] = useState<AvailableProvider[]>([]);
  const [mbbsProviders, setMbbsProviders] = useState<AvailableMbbsProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMbbs = serviceType === "MBBS";

  useEffect(() => {
    if (!serviceType || !date || !district) {
      setProviders([]);
      setMbbsProviders([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    if (isMbbs) {
      mbbsApi
        .getAvailableProviders({ serviceType, district, thana: thana || undefined, date })
        .then((data) => {
          if (!cancelled) setMbbsProviders(data.providers);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
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
    }

    return () => {
      cancelled = true;
    };
  }, [serviceType, date, district, thana, isMbbs]);

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

  if (isMbbs) {
    if (mbbsProviders.length === 0) {
      return (
        <p className="text-[10px] text-slate-400 italic">
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
          Available Doctors ({mbbsProviders.length})
        </p>
        {mbbsProviders.map((p) => {
          const selected = selectedProviderId === p.userId;
          return (
            <button
              key={p.userId}
              type="button"
              onClick={() => onSelect(selected ? null : p.userId)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                selected
                  ? "border-[#00D4B2] bg-[#00D4B2]/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs font-semibold text-[#0A2540]">{p.name}</span>
                  {p.specialization && (
                    <span className="text-[10px] text-slate-500">{p.specialization}</span>
                  )}
                </div>
                {p.consultationFee != null && (
                  <span className="shrink-0 text-xs font-bold text-[#0A2540]">
                    ৳{p.consultationFee}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-400">
                {p.qualification && <span>{p.qualification}</span>}
                {p.yearsOfExperience != null && (
                  <span>{p.yearsOfExperience} yr{p.yearsOfExperience !== 1 ? "s" : ""} exp</span>
                )}
                {p.district && (
                  <span>
                    {p.district}{p.thana ? `, ${p.thana}` : ""}
                  </span>
                )}
              </div>

              {p.schedules.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.schedules.map((s, i) => (
                    <span
                      key={i}
                      className="rounded bg-[#0A2540]/5 px-1 py-0.5 text-[8px] font-medium text-[#0A2540]"
                    >
                      {DAY_NAMES[s.dayOfWeek]} {s.startTime}-{s.endTime}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
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
