"use client";

import type { VitalSigns } from "@/lib/mbbs-api";

interface Props {
  vitals: VitalSigns[];
}

export function VitalsDisplay({ vitals }: Props) {
  if (!vitals || vitals.length === 0) {
    return (
      <p className="text-xs text-[#2D3A4A] italic">No vital signs recorded yet.</p>
    );
  }

  const latest = vitals[0]!;

  const vitalCards = [
    { label: 'Blood Pressure', value: latest.systolic_bp && latest.diastolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : 'N/A', unit: 'mmHg', abnormal: latest.is_abnormal && (latest.systolic_bp ? latest.systolic_bp > 140 || latest.systolic_bp < 90 : false) },
    { label: 'Heart Rate', value: latest.pulse_bpm?.toString() || 'N/A', unit: 'bpm', abnormal: latest.is_abnormal && (latest.pulse_bpm ? latest.pulse_bpm > 100 || latest.pulse_bpm < 60 : false) },
    { label: 'SpO₂', value: latest.spo2_pct?.toString() || 'N/A', unit: '%', abnormal: latest.is_abnormal && (latest.spo2_pct ? latest.spo2_pct < 95 : false) },
    { label: 'Temperature', value: latest.temperature_c?.toString() || 'N/A', unit: '°C', abnormal: latest.is_abnormal && (latest.temperature_c ? Number(latest.temperature_c) > 38 || Number(latest.temperature_c) < 36 : false) },
    { label: 'Resp. Rate', value: latest.respiratory_rate?.toString() || 'N/A', unit: '/min', abnormal: latest.is_abnormal && (latest.respiratory_rate ? latest.respiratory_rate > 20 || latest.respiratory_rate < 12 : false) },
    { label: 'BMI', value: latest.bmi?.toString() || 'N/A', unit: '', abnormal: latest.is_abnormal },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
          Latest Reading — {new Date(latest.recorded_at).toLocaleString()}
        </span>
        {latest.is_abnormal && (
          <span className="rounded-full bg-[#FF9900]/10 px-2 py-0.5 text-[9px] font-bold text-[#FF9900]">
            ⚠ ABNORMAL VALUES
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {vitalCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border px-3 py-2.5 ${
              card.abnormal
                ? 'border-[#FF9900]/30 bg-[#FF9900]/5'
                : 'border-slate-200/60 bg-[#F8F9FA]'
            }`}
          >
            <span className="block text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
              {card.label}
            </span>
            <span className="mt-0.5 flex items-baseline gap-0.5">
              <span className={`text-lg font-bold tracking-tight ${card.abnormal ? 'text-[#FF9900]' : 'text-[#0A2540]'}`}>
                {card.value}
              </span>
              <span className="text-[9px] text-[#2D3A4A]">{card.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
