"use client";

import { useState } from "react";
import type { CreateVitalsPayload, VitalSigns } from "@/lib/mbbs-api";

interface Props {
  onSubmit: (data: CreateVitalsPayload) => Promise<void>;
  loading?: boolean;
  existingVitals?: VitalSigns | null;
}

const VITALS_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  systolic_bp: { min: 60, max: 250, unit: 'mmHg' },
  diastolic_bp: { min: 30, max: 160, unit: 'mmHg' },
  pulse_bpm: { min: 20, max: 300, unit: 'bpm' },
  temperature_c: { min: 30, max: 45, unit: '°C' },
  spo2_pct: { min: 50, max: 100, unit: '%' },
  respiratory_rate: { min: 4, max: 60, unit: '/min' },
};

const NORMAL_RANGES: Record<string, [number, number]> = {
  systolic_bp: [90, 140],
  diastolic_bp: [60, 90],
  pulse_bpm: [60, 100],
  temperature_c: [36.0, 38.0],
  spo2_pct: [95, 100],
  respiratory_rate: [12, 20],
};

const FIELD_LABELS: Record<string, string> = {
  systolic_bp: 'Systolic BP',
  diastolic_bp: 'Diastolic BP',
  pulse_bpm: 'Pulse',
  temperature_c: 'Temperature',
  spo2_pct: 'SpO₂',
  respiratory_rate: 'Respiratory Rate',
  weight_kg: 'Weight (kg)',
  height_cm: 'Height (cm)',
};

export function VitalsForm({ onSubmit, loading, existingVitals }: Props) {
  const [form, setForm] = useState<CreateVitalsPayload>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof CreateVitalsPayload, value: string) => {
    const num = field === 'notes' ? undefined : value === '' ? undefined : Number(value);
    setForm((prev) => ({
      ...prev,
      [field]: field === 'notes' ? value : num,
    }));
  };

  const isOutOfRange = (field: string, value: number | undefined): boolean => {
    if (value === undefined) return false;
    const range = NORMAL_RANGES[field];
    if (!range) return false;
    return value < range[0] || value > range[1];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    await onSubmit(form);
    setForm({});
    setSubmitted(false);
  };

  const vitalFields = ['systolic_bp', 'diastolic_bp', 'pulse_bpm', 'temperature_c', 'spo2_pct', 'respiratory_rate'];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {vitalFields.map((field) => {
          const value = (form as any)[field] as number | undefined;
          const abnormal = isOutOfRange(field, value);
          const range = VITALS_RANGES[field];
          return (
            <div key={field}>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                {FIELD_LABELS[field]}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={range!.min}
                  max={range!.max}
                  placeholder={range!.unit}
                  value={value ?? ''}
                  onChange={(e) => handleChange(field as keyof CreateVitalsPayload, e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:ring-2 ${
                    abnormal
                      ? 'border-[#FF9900] focus:border-[#FF9900] focus:ring-[#FF9900]/20'
                      : 'border-slate-200/60 focus:border-[#0A2540] focus:ring-[#00D4B2]/20'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  {range!.unit}
                </span>
              </div>
              {abnormal && (
                <span className="mt-0.5 block text-[9px] text-[#FF9900] font-medium">
                  Out of range
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
            {FIELD_LABELS.weight_kg}
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="kg"
            value={form.weight_kg ?? ''}
            onChange={(e) => handleChange('weight_kg', e.target.value)}
            className="w-full rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
            {FIELD_LABELS.height_cm}
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="cm"
            value={form.height_cm ?? ''}
            onChange={(e) => handleChange('height_cm', e.target.value)}
            className="w-full rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
          Clinical Notes
        </label>
        <textarea
          rows={2}
          placeholder="Additional observations..."
          value={form.notes ?? ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full resize-none rounded-xl border border-slate-200/60 px-3 py-2 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20"
        />
      </div>

      {existingVitals && (
        <p className="text-[11px] text-[#2D3A4A] italic">
          Last recorded: {new Date(existingVitals.recorded_at).toLocaleString()}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-xl bg-[#00D4B2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
      >
        {loading ? 'Saving...' : 'Record Vital Signs'}
      </button>
    </form>
  );
}
