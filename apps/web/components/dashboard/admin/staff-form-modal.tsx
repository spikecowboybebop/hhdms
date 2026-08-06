"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminApi,
  type CreateStaffPayload,
  type StaffRecord,
  type StaffRole,
  SPECIALTY_CODES,
  NURSE_TYPES,
  SHIFT_PREFERENCES,
} from "@/lib/admin-api";

interface Props {
  open: boolean;
  editing: StaffRecord | null;
  onClose: () => void;
  onCreated: (result: {
    email: string;
    role: StaffRole;
    temporary_password: string;
  }) => void;
  onSaved: (record: StaffRecord) => void;
}

interface FormState {
  email: string;
  phone_number: string;
  first_name_en: string;
  last_name_en: string;
  first_name_bn: string;
  last_name_bn: string;
  nid: string;
  photo_url: string;
  role: StaffRole;
  license_number: string;
  bmdc_registration: string;
  specialization: string;
  qualification: string;
  years_of_experience: string;
  consultation_fee: string;
  signature_url: string;
  district: string;
  thana: string;
  service_area: string;
  specialty_code: string;
  sub_specialties: string;
  nurse_type: string;
  bnmc_registration: string;
  skills: string;
  shift_preference: string;
  gps_device_id: string;
  gender: string;
  specializations: string;
  training_certs: string;
  address: string;
  qualifications: string;
}

const EMPTY: FormState = {
  email: "",
  phone_number: "",
  first_name_en: "",
  last_name_en: "",
  first_name_bn: "",
  last_name_bn: "",
  nid: "",
  photo_url: "",
  role: "MBBS_DOCTOR",
  license_number: "",
  bmdc_registration: "",
  specialization: "",
  qualification: "",
  years_of_experience: "",
  consultation_fee: "",
  signature_url: "",
  district: "",
  thana: "",
  service_area: "",
  specialty_code: "",
  sub_specialties: "",
  nurse_type: "ADULT",
  bnmc_registration: "",
  skills: "",
  shift_preference: "",
  gps_device_id: "",
  gender: "",
  specializations: "",
  training_certs: "",
  address: "",
  qualifications: "",
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] transition-all outline-none focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20";
const labelCls =
  "block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]";

function fieldLabel(label: string, required?: boolean) {
  return (
    <span className={labelCls}>
      {label} {required && <span className="text-[#FF9900]">*</span>}
    </span>
  );
}

export default function StaffFormModal({
  open,
  editing,
  onClose,
  onCreated,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (editing) {
      const p = editing.profile ?? {};
      setForm({
        email: editing.email,
        phone_number: editing.phone_number,
        first_name_en: editing.first_name_en,
        last_name_en: editing.last_name_en,
        first_name_bn: "",
        last_name_bn: "",
        nid: editing.nid ?? "",
        photo_url: editing.photo_url ?? "",
        role: editing.role,
        license_number: (p.license_number as string) ?? "",
        bmdc_registration: (p.bmdc_registration as string) ?? "",
        specialization: (p.specialization as string) ?? "",
        qualification: (p.qualification as string) ?? "",
        years_of_experience:
          p.years_of_experience != null
            ? String(p.years_of_experience)
            : p.experience_years != null
              ? String(p.experience_years)
              : "",
        consultation_fee:
          p.consultation_fee != null ? String(p.consultation_fee) : "",
        signature_url: (p.signature_url as string) ?? "",
        district: (p.district as string) ?? "",
        thana: (p.thana as string) ?? "",
        service_area: (p.service_area as string) ?? "",
        specialty_code: (p.specialty_code as string) ?? "",
        sub_specialties: (p.sub_specialties as string) ?? "",
        nurse_type: (p.nurse_type as string) ?? "ADULT",
        bnmc_registration: (p.bnmc_registration as string) ?? "",
        skills: (p.skills as string) ?? "",
        shift_preference: (p.shift_preference as string) ?? "",
        gps_device_id: (p.gps_device_id as string) ?? "",
        gender: (p.gender as string) ?? "",
        specializations: (p.specializations as string) ?? "",
        training_certs: (p.training_certs as string) ?? "",
        address: (p.address as string) ?? "",
        qualifications: (p.qualifications as string) ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editing]);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const roleFields = useMemo(() => {
    switch (form.role) {
      case "MBBS_DOCTOR":
        return (
          <>
            <div>
              {fieldLabel("BMDC Registration", true)}
              <input
                className={inputCls}
                value={form.bmdc_registration}
                onChange={(e) => setField("bmdc_registration", e.target.value)}
                placeholder="e.g. BMDC-REG-2024-0001"
              />
            </div>
            <div>
              {fieldLabel("Specialization")}
              <input
                className={inputCls}
                value={form.specialization}
                onChange={(e) => setField("specialization", e.target.value)}
                placeholder="e.g. General Medicine"
              />
            </div>
            <div>
              {fieldLabel("Qualification")}
              <input
                className={inputCls}
                value={form.qualification}
                onChange={(e) => setField("qualification", e.target.value)}
                placeholder="e.g. MBBS, FCPS"
              />
            </div>
            <div>
              {fieldLabel("Years of Experience")}
              <input
                className={inputCls}
                type="number"
                min={0}
                value={form.years_of_experience}
                onChange={(e) => setField("years_of_experience", e.target.value)}
              />
            </div>
            <div>
              {fieldLabel("Consultation Fee (BDT)")}
              <input
                className={inputCls}
                type="number"
                min={0}
                value={form.consultation_fee}
                onChange={(e) => setField("consultation_fee", e.target.value)}
              />
            </div>
            <div>
              {fieldLabel("District")}
              <input
                className={inputCls}
                value={form.district}
                onChange={(e) => setField("district", e.target.value)}
                placeholder="e.g. Dhaka"
              />
            </div>
            <div>
              {fieldLabel("Thana")}
              <input
                className={inputCls}
                value={form.thana}
                onChange={(e) => setField("thana", e.target.value)}
                placeholder="e.g. Gulshan"
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Service Area")}
              <input
                className={inputCls}
                value={form.service_area}
                onChange={(e) => setField("service_area", e.target.value)}
                placeholder="e.g. Dhaka North — Gulshan, Banani"
              />
            </div>
          </>
        );
      case "SPECIALIST":
        return (
          <>
            <div>
              {fieldLabel("Specialty", true)}
              <select
                className={inputCls}
                value={form.specialty_code}
                onChange={(e) => setField("specialty_code", e.target.value)}
              >
                <option value="">Select specialty…</option>
                {SPECIALTY_CODES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {fieldLabel("BMDC Registration", true)}
              <input
                className={inputCls}
                value={form.bmdc_registration}
                onChange={(e) => setField("bmdc_registration", e.target.value)}
                placeholder="e.g. BMDC-REG-2024-0002"
              />
            </div>
            <div>
              {fieldLabel("Qualification")}
              <input
                className={inputCls}
                value={form.qualification}
                onChange={(e) => setField("qualification", e.target.value)}
                placeholder="e.g. MBBS, FCPS (Cardiology)"
              />
            </div>
            <div>
              {fieldLabel("Years of Experience")}
              <input
                className={inputCls}
                type="number"
                min={0}
                value={form.years_of_experience}
                onChange={(e) => setField("years_of_experience", e.target.value)}
              />
            </div>
            <div>
              {fieldLabel("Consultation Fee (BDT)")}
              <input
                className={inputCls}
                type="number"
                min={0}
                value={form.consultation_fee}
                onChange={(e) => setField("consultation_fee", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Sub-specialties")}
              <input
                className={inputCls}
                value={form.sub_specialties}
                onChange={(e) => setField("sub_specialties", e.target.value)}
                placeholder="Comma-separated, e.g. Interventional, Heart Failure"
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Service Area")}
              <input
                className={inputCls}
                value={form.service_area}
                onChange={(e) => setField("service_area", e.target.value)}
                placeholder="e.g. Dhaka & Chattogram"
              />
            </div>
          </>
        );
      case "NURSE":
        return (
          <>
            <div>
              {fieldLabel("Nurse Type", true)}
              <select
                className={inputCls}
                value={form.nurse_type}
                onChange={(e) => setField("nurse_type", e.target.value)}
              >
                {NURSE_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {fieldLabel("BNMC Registration")}
              <input
                className={inputCls}
                value={form.bnmc_registration}
                onChange={(e) => setField("bnmc_registration", e.target.value)}
                placeholder="e.g. BNMC-2024-0123"
              />
            </div>
            <div>
              {fieldLabel("Specialization")}
              <input
                className={inputCls}
                value={form.specialization}
                onChange={(e) => setField("specialization", e.target.value)}
                placeholder="e.g. Medical-Surgical"
              />
            </div>
            <div>
              {fieldLabel("Qualifications")}
              <input
                className={inputCls}
                value={form.qualifications}
                onChange={(e) => setField("qualifications", e.target.value)}
                placeholder="e.g. Diploma in Nursing Science"
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Skills")}
              <input
                className={inputCls}
                value={form.skills}
                onChange={(e) => setField("skills", e.target.value)}
                placeholder="Comma-separated, e.g. IV cannulation, wound dressing"
              />
            </div>
            <div>
              {fieldLabel("Shift Preference")}
              <select
                className={inputCls}
                value={form.shift_preference}
                onChange={(e) => setField("shift_preference", e.target.value)}
              >
                <option value="">Select…</option>
                {SHIFT_PREFERENCES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {fieldLabel("GPS Device ID")}
              <input
                className={inputCls}
                value={form.gps_device_id}
                onChange={(e) => setField("gps_device_id", e.target.value)}
                placeholder="e.g. DEV-8847"
              />
            </div>
          </>
        );
      case "CAREGIVER":
        return (
          <>
            <div>
              {fieldLabel("Gender")}
              <select
                className={inputCls}
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              {fieldLabel("Years of Experience")}
              <input
                className={inputCls}
                type="number"
                min={0}
                value={form.years_of_experience}
                onChange={(e) => setField("years_of_experience", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Specializations")}
              <input
                className={inputCls}
                value={form.specializations}
                onChange={(e) => setField("specializations", e.target.value)}
                placeholder="e.g. Elderly care, Post-operative care"
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Training Certificates")}
              <input
                className={inputCls}
                value={form.training_certs}
                onChange={(e) => setField("training_certs", e.target.value)}
                placeholder="Comma-separated certifications"
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Address")}
              <input
                className={inputCls}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </div>
          </>
        );
      case "NUTRITIONIST":
        return (
          <>
            <div>
              {fieldLabel("Qualifications")}
              <input
                className={inputCls}
                value={form.qualifications}
                onChange={(e) => setField("qualifications", e.target.value)}
                placeholder="e.g. BSc in Nutrition and Dietetics"
              />
            </div>
            <div>
              {fieldLabel("Specializations")}
              <input
                className={inputCls}
                value={form.specializations}
                onChange={(e) => setField("specializations", e.target.value)}
                placeholder="e.g. Diabetes diet, Maternal nutrition"
              />
            </div>
            <div>
              {fieldLabel("Consultation Fee (BDT)")}
              <input
                className={inputCls}
                type="number"
                min={0}
                value={form.consultation_fee}
                onChange={(e) => setField("consultation_fee", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              {fieldLabel("Service Area")}
              <input
                className={inputCls}
                value={form.service_area}
                onChange={(e) => setField("service_area", e.target.value)}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  }, [form, setField]);

  const validate = (): string | null => {
    if (!form.email.trim()) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Please provide a valid email.";
    if (!form.phone_number.trim()) return "Phone number is required.";
    if (!form.first_name_en.trim()) return "First name (English) is required.";
    if (!form.last_name_en.trim()) return "Last name (English) is required.";
    if (form.role === "SPECIALIST" && !form.specialty_code)
      return "Specialty is required for Specialist profiles.";
    if (form.role === "MBBS_DOCTOR" && !form.bmdc_registration.trim())
      return "BMDC registration is required for MBBS Doctor profiles.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    const num = (v: string): number | undefined =>
      v.trim() === "" ? undefined : Number(v);

    const payload: CreateStaffPayload = {
      email: form.email.trim(),
      phone_number: form.phone_number.trim(),
      first_name_en: form.first_name_en.trim(),
      last_name_en: form.last_name_en.trim(),
      first_name_bn: form.first_name_bn.trim() || undefined,
      last_name_bn: form.last_name_bn.trim() || undefined,
      nid: form.nid.trim() || undefined,
      photo_url: form.photo_url.trim() || undefined,
      role: form.role,
      license_number: form.license_number.trim() || undefined,
      bmdc_registration: form.bmdc_registration.trim() || undefined,
      specialization: form.specialization.trim() || undefined,
      qualification: form.qualification.trim() || undefined,
      years_of_experience: num(form.years_of_experience),
      consultation_fee: num(form.consultation_fee),
      signature_url: form.signature_url.trim() || undefined,
      district: form.district.trim() || undefined,
      thana: form.thana.trim() || undefined,
      service_area: form.service_area.trim() || undefined,
      specialty_code: form.specialty_code || undefined,
      sub_specialties: form.sub_specialties.trim() || undefined,
      nurse_type: form.nurse_type || undefined,
      bnmc_registration: form.bnmc_registration.trim() || undefined,
      skills: form.skills.trim() || undefined,
      shift_preference: form.shift_preference || undefined,
      gps_device_id: form.gps_device_id.trim() || undefined,
      gender: form.gender || undefined,
      specializations: form.specializations.trim() || undefined,
      training_certs: form.training_certs.trim() || undefined,
      address: form.address.trim() || undefined,
      qualifications: form.qualifications.trim() || undefined,
    };

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const record = await adminApi.updateStaff(editing.id, payload);
        onSaved(record);
      } else {
        const result = await adminApi.createStaff(payload);
        onCreated({
          email: result.email,
          role: result.role,
          temporary_password: result.temporary_password,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save staff profile.");
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-[#0A2540]">
              {editing ? "Edit Staff Profile" : "Add New Staff"}
            </h2>
            <p className="text-xs text-[#2D3A4A]">
              {editing
                ? `Updating ${editing.first_name_en} ${editing.last_name_en}`
                : "Provision a new provider profile with SRS §5.1 fields"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Role picker (create only) */}
          {!editing && (
            <div className="mb-5">
              {fieldLabel("Role", true)}
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(
                  [
                    ["MBBS_DOCTOR", "MBBS Doctor"],
                    ["SPECIALIST", "Specialist"],
                    ["NURSE", "Nurse"],
                    ["CAREGIVER", "Caregiver"],
                    ["NUTRITIONIST", "Nutritionist"],
                  ] as [StaffRole, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField("role", value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                      form.role === value
                        ? "border-[#00D4B2] bg-[#00D4B2]/10 text-[#0A2540]"
                        : "border-slate-200 bg-white text-[#2D3A4A] hover:border-[#00D4B2]/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 px-4 py-3 text-xs font-semibold text-[#FF9900]">
              {error}
            </div>
          )}

          {/* Common fields */}
          <div className="mb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A2540]">
              Login & Identity
            </span>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                {fieldLabel("Email", true)}
                <input
                  className={inputCls}
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="staff@hhdms.com"
                />
              </div>
              <div>
                {fieldLabel("Phone Number", true)}
                <input
                  className={inputCls}
                  value={form.phone_number}
                  onChange={(e) => setField("phone_number", e.target.value)}
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div>
                {fieldLabel("First Name (English)", true)}
                <input
                  className={inputCls}
                  value={form.first_name_en}
                  onChange={(e) => setField("first_name_en", e.target.value)}
                />
              </div>
              <div>
                {fieldLabel("Last Name (English)", true)}
                <input
                  className={inputCls}
                  value={form.last_name_en}
                  onChange={(e) => setField("last_name_en", e.target.value)}
                />
              </div>
              <div>
                {fieldLabel("First Name (বাংলা)")}
                <input
                  className={inputCls}
                  value={form.first_name_bn}
                  onChange={(e) => setField("first_name_bn", e.target.value)}
                />
              </div>
              <div>
                {fieldLabel("Last Name (বাংলা)")}
                <input
                  className={inputCls}
                  value={form.last_name_bn}
                  onChange={(e) => setField("last_name_bn", e.target.value)}
                />
              </div>
              <div>
                {fieldLabel("NID")}
                <input
                  className={inputCls}
                  value={form.nid}
                  onChange={(e) => setField("nid", e.target.value)}
                  placeholder="National ID (10-20 digits)"
                />
              </div>
              <div>
                {fieldLabel("Photo URL")}
                <input
                  className={inputCls}
                  value={form.photo_url}
                  onChange={(e) => setField("photo_url", e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>

          {/* Role-specific fields */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A2540]">
              {form.role === "MBBS_DOCTOR"
                ? "Doctor Profile"
                : form.role === "SPECIALIST"
                  ? "Specialist Profile"
                  : form.role === "NURSE"
                    ? "Nurse Profile"
                    : form.role === "CAREGIVER"
                      ? "Caregiver Profile"
                      : "Nutritionist Profile"}
            </span>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {roleFields}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200/60 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : editing
                ? "Save Changes"
                : "Create Staff & Generate Credentials"}
          </button>
        </div>
      </div>
    </div>
  );
}
