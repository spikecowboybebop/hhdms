"use client";

import { useCallback, useState } from "react";

export interface TemplateField {
  id: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
}

interface DynamicTemplateFormProps {
  schema: TemplateField[];
  onSubmit: (data: Record<string, unknown>) => void;
  onBack?: () => void;
}

type FormValues = Record<string, string | number>;

function renderField(
  field: TemplateField,
  value: string | number,
  onChange: (val: string | number) => void,
) {
  const sharedClass =
    "w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-[#0A2540] outline-none transition-all focus:border-[#0A2540] focus:ring-2 focus:ring-[#00D4B2]/20";

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className={sharedClass}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value as string}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : e.target.valueAsNumber)
          }
          className={sharedClass}
        />
      );
    case "select":
      return (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className={sharedClass}
        >
          <option value="">-- Select --</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
  }
}

export function DynamicTemplateForm({
  schema,
  onSubmit,
  onBack,
}: DynamicTemplateFormProps) {
  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of schema) {
      initial[field.id] = field.type === "number" ? "" : "";
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = useCallback((id: string, val: string | number) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of schema) {
      if (field.required) {
        const val = values[field.id];
        if (
          val === "" ||
          val === undefined ||
          val === null ||
          val === 0
        ) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [schema, values]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (validate()) {
        const payload: Record<string, unknown> = {};
        for (const field of schema) {
          payload[field.id] = values[field.id];
        }
        console.log("Template form payload:", payload);
        onSubmit(payload);
      }
    },
    [schema, values, validate, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {schema.map((field) => (
        <div key={field.id}>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {field.label}
            {field.required && <span className="ml-1 text-red-400">*</span>}
          </label>
          {renderField(field, values[field.id] ?? "", (val) => setValue(field.id, val))}
          {errors[field.id] && (
            <p className="mt-1 text-[11px] text-red-400">{errors[field.id]}</p>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-[#0A2540] transition-colors hover:text-[#0A2540]/70"
          >
            &larr; Back to free-text
          </button>
        )}
        <button
          type="submit"
          className="ml-auto rounded-lg bg-[#00D4B2] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#00c2a2]"
        >
          Record Info
        </button>
      </div>
    </form>
  );
}
