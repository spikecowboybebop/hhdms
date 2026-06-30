"use client";

import { type ServiceFormMeta } from "./provider-selector";

interface Props {
  serviceType: string;
  meta: ServiceFormMeta;
  onChange: (meta: ServiceFormMeta) => void;
}

const SERVICE_FIELDS: Record<
  string,
  { key: keyof ServiceFormMeta; label: string; type: "text" | "select"; options?: string[] }[]
> = {
  XRAY: [
    { key: "anatomical_region", label: "Anatomical Region", type: "text" },
    { key: "projection_view", label: "Projection View", type: "text" },
  ],
  USG: [
    { key: "targeted_body_part", label: "Targeted Body Part", type: "text" },
    { key: "scan_type", label: "Scan Type", type: "text" },
  ],
  CAREGIVER: [
    {
      key: "shift_type",
      label: "Shift Type",
      type: "select",
      options: ["Day", "Night", "24h", "Respite"],
    },
    { key: "certification", label: "Certification Criteria", type: "text" },
  ],
};

export default function ServiceFormFields({ serviceType, meta, onChange }: Props) {
  const fields = SERVICE_FIELDS[serviceType] ?? [];

  if (fields.length === 0) return null;

  const update = (key: keyof ServiceFormMeta, value: string) => {
    onChange({ ...meta, [key]: value });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
            {f.label}
          </label>
          {f.type === "select" && f.options ? (
            <select
              value={(meta[f.key] as string) ?? ""}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] outline-none focus:border-[#00D4B2]"
            >
              <option value="">Select</option>
              {f.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={(meta[f.key] as string) ?? ""}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.label}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] placeholder:text-slate-400 outline-none focus:border-[#00D4B2]"
            />
          )}
        </div>
      ))}
    </div>
  );
}
