"use client";

import { useState, useCallback, useEffect } from "react";
import { callCenterApi } from "@/lib/call-center-api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const DIVISIONS = {
  dhaka: {
    name: "Dhaka",
    districts: {
      dhaka: ["Adabar", "Badda", "Cantonment", "Demra", "Dhanmondi", "Gulshan", "Hazaribagh", "Kadamtali", "Kafrul", "Kamrangirchar", "Khilgaon", "Khilkhet", "Lalbagh", "Mirpur", "Mohammadpur", "Motijheel", "New Market", "Pallabi", "Ramna", "Rampura", "Sabujbagh", "Shah Ali", "Shahbagh", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur", "Tejgaon", "Tejgaon Industrial", "Uttara", "Uttarkhan"],
        gazipur: ["Kaliakair", "Kaliganj", "Kapasia", "Sreepur", "Gazipur Sadar"],
        narayanganj: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"],
        tangail: ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"],
      },
    },
  chattogram: {
    name: "Chattogram",
    districts: {
      chattogram: ["Akbar Shah", "Anwara", "Bakalia", "Bandar", "Bayezid", "Bhashan Char", "Chandgaon", "Chattogram Kotwali", "Double Mooring", "EPZ", "Halishahar", "Karnaphuli", "Khulshi", "Pahartali", "Panchlaish", "Patenga", "Sandwip", "Satkania", "Sitakunda"],
        coxs_bazar: ["Chakaria", "Cox's Bazar Sadar", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia"],
    },
  },
  rajshahi: {
    name: "Rajshahi",
    districts: {
      rajshahi: ["Bagha", "Bagmara", "Boalia", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Putnia", "Rajshahi Sadar", "Tanore"],
      bogura: ["Adamdighi", "Bogura Sadar", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"],
    },
  },
  khulna: {
    name: "Khulna",
    districts: {
      khulna: ["Aranghata", "Daulatpur", "Dighalia", "Dumuria", "Khalishpur", "Khan Jahan Ali", "Khulna Sadar", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Sonadanga", "Terokhada"],
      jessore: ["Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Jessore Sadar", "Keshabpur", "Manirampur", "Sharsha"],
    },
  },
  barishal: {
    name: "Barishal",
    districts: {
      barishal: ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar", "Gournadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
      patuakhali: ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"],
    },
  },
  sylhet: {
    name: "Sylhet",
    districts: {
      sylhet: ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Dakshin Surma", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zakiganj"],
      moulvibazar: ["Barlekha", "Juri", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"],
    },
  },
  rangpur: {
    name: "Rangpur",
    districts: {
      rangpur: ["Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Rangpur Sadar", "Taraganj"],
      dinajpur: ["Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Dinajpur Sadar", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
    },
  },
  mymensingh: {
    name: "Mymensingh",
    districts: {
      mymensingh: ["Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Mymensingh Sadar", "Nandail", "Phulpur", "Trishal"],
      jamalpur: ["Bakshiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"],
    },
  },
};

interface Props {
  open: boolean;
  patientPhone?: string;
  onClose: () => void;
  onSuccess: (result: { id: string; mrn: string; full_name_en: string; sex: string; primary_phone: string; district: string }) => void;
}

interface FormData {
  full_name_en: string;
  full_name_bn: string;
  date_of_birth: string;
  sex: string;
  blood_group: string;
  primary_phone: string;
  alternative_phone: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  division: string;
  district: string;
  thana: string;
  address_detail: string;
  agent_notes: string;
  has_emergency_flag: boolean;
}

const initialForm: FormData = {
  full_name_en: "",
  full_name_bn: "",
  date_of_birth: "",
  sex: "",
  blood_group: "",
  primary_phone: "",
  alternative_phone: "",
  emergency_contact_name: "",
  emergency_contact_relation: "",
  emergency_contact_phone: "",
  division: "",
  district: "",
  thana: "",
  address_detail: "",
  agent_notes: "",
  has_emergency_flag: false,
};

interface FieldError {
  field: keyof FormData;
  message: string;
}

export default function PatientRegistrationModal({ open, patientPhone, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Pre-fill phone from WebRTC context when available
  useEffect(() => {
    if (patientPhone && !form.primary_phone) {
      setForm((prev) => ({ ...prev, primary_phone: patientPhone }));
    }
  }, [patientPhone, form.primary_phone]);

  const setField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }, []);

  const getFieldError = (field: keyof FormData): string | undefined =>
    errors.find((e) => e.field === field)?.message;

  const validate = (): boolean => {
    const newErrors: FieldError[] = [];

    if (!form.full_name_en.trim()) newErrors.push({ field: "full_name_en", message: "Full name is required." });
    if (!form.full_name_bn.trim()) newErrors.push({ field: "full_name_bn", message: "বাংলায় নাম আবশ্যক।" });
    if (!form.date_of_birth) newErrors.push({ field: "date_of_birth", message: "Date of birth is required." });
    if (!form.sex) newErrors.push({ field: "sex", message: "Please select a gender." });
    if (!form.primary_phone.match(/^01[3-9]\d{8}$/)) newErrors.push({ field: "primary_phone", message: "Enter a valid 11-digit phone number." });
    if (!form.emergency_contact_name.trim()) newErrors.push({ field: "emergency_contact_name", message: "Emergency contact name is required." });
    if (!form.emergency_contact_relation.trim()) newErrors.push({ field: "emergency_contact_relation", message: "Relationship is required." });
    if (!form.emergency_contact_phone.match(/^01[3-9]\d{8}$/)) newErrors.push({ field: "emergency_contact_phone", message: "Enter a valid 11-digit number." });
    if (!form.division) newErrors.push({ field: "division", message: "Please select a division." });
    if (!form.district) newErrors.push({ field: "district", message: "Please select a district." });
    if (!form.thana) newErrors.push({ field: "thana", message: "Please select a thana." });
    if (!form.address_detail.trim()) newErrors.push({ field: "address_detail", message: "Please enter the road/house/landmark details." });

    if (form.alternative_phone && !form.alternative_phone.match(/^01[3-9]\d{8}$/)) {
      newErrors.push({ field: "alternative_phone", message: "Enter a valid 11-digit number." });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const data = await callCenterApi.registerPatient(form);
      onSuccess({
        id: data.id,
        mrn: data.mrn,
        full_name_en: form.full_name_en,
        sex: form.sex,
        primary_phone: form.primary_phone,
        district: form.district,
      });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    setForm(initialForm);
    setErrors([]);
    setServerError(null);
    setSubmitting(false);
    onClose();
  }, [onClose]);

  // Auto-close if call drops while modal is open
  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setErrors([]);
      setServerError(null);
    }
  }, [open]);

  if (!open) return null;

  const selectedDivision = form.division ? DIVISIONS[form.division as keyof typeof DIVISIONS] : null;
  const selectedDistrict = form.district && selectedDivision
    ? (selectedDivision.districts as Record<string, string[]>)[form.district]
    : null;

  const inputClass = (field: keyof FormData) =>
    `w-full rounded-xl border px-4 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 transition-all outline-none ${
      getFieldError(field)
        ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
        : "border-slate-200 bg-white focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
    }`;

  const labelClass = "block text-[11px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1.5";
  const requiredMark = <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[#0A2540]">Patient Registration</h2>
            <p className="text-xs text-[#2D3A4A] mt-0.5">Call intake &amp; demographic capture form</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Server error */}
          {serverError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[11px] text-red-600">{serverError}</p>
            </div>
          )}

          {/* 1. Patient Demographics */}
          <section>
            <h3 className="text-sm font-bold text-[#0A2540] mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#00D4B2]/10 text-[10px] font-bold text-[#00D4B2]">1</span>
              Patient Demographics
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Full Name (English){requiredMark}</label>
                <input
                  type="text"
                  placeholder="e.g., Md. Abdur Rahman"
                  value={form.full_name_en}
                  onChange={(e) => setField("full_name_en", e.target.value)}
                  className={inputClass("full_name_en")}
                />
                {getFieldError("full_name_en") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("full_name_en")}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Full Name (Bengali){requiredMark}</label>
                <input
                  type="text"
                  placeholder="যেমন, মোঃ আব্দুর রহমান"
                  value={form.full_name_bn}
                  onChange={(e) => setField("full_name_bn", e.target.value)}
                  className={inputClass("full_name_bn")}
                />
                {getFieldError("full_name_bn") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("full_name_bn")}</p>}
              </div>
              <div>
                <label className={labelClass}>Date of Birth{requiredMark}</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setField("date_of_birth", e.target.value)}
                  className={inputClass("date_of_birth")}
                />
                {getFieldError("date_of_birth") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("date_of_birth")}</p>}
              </div>
              <div>
                <label className={labelClass}>Gender{requiredMark}</label>
                <select
                  value={form.sex}
                  onChange={(e) => setField("sex", e.target.value)}
                  className={inputClass("sex")}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Child">Child</option>
                </select>
                {getFieldError("sex") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("sex")}</p>}
              </div>
              <div>
                <label className={labelClass}>Blood Group</label>
                <select
                  value={form.blood_group}
                  onChange={(e) => setField("blood_group", e.target.value)}
                  className={inputClass("blood_group")}
                >
                  <option value="">Select blood group (optional)</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 2. Contact Information */}
          <section>
            <h3 className="text-sm font-bold text-[#0A2540] mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#00D4B2]/10 text-[10px] font-bold text-[#00D4B2]">2</span>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Primary Phone Number{requiredMark}</label>
                <input
                  type="tel"
                  placeholder="e.g., 01712345678"
                  value={form.primary_phone}
                  onChange={(e) => setField("primary_phone", e.target.value)}
                  className={inputClass("primary_phone")}
                />
                {getFieldError("primary_phone") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("primary_phone")}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Alternative Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g., 01912345678"
                  value={form.alternative_phone}
                  onChange={(e) => setField("alternative_phone", e.target.value)}
                  className={inputClass("alternative_phone")}
                />
                {getFieldError("alternative_phone") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("alternative_phone")}</p>}
              </div>
              <div>
                <label className={labelClass}>Emergency Contact Name{requiredMark}</label>
                <input
                  type="text"
                  placeholder="e.g., Fatima Begum"
                  value={form.emergency_contact_name}
                  onChange={(e) => setField("emergency_contact_name", e.target.value)}
                  className={inputClass("emergency_contact_name")}
                />
                {getFieldError("emergency_contact_name") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("emergency_contact_name")}</p>}
              </div>
              <div>
                <label className={labelClass}>Emergency Contact Relationship{requiredMark}</label>
                <input
                  type="text"
                  placeholder="e.g., Mother, Spouse"
                  value={form.emergency_contact_relation}
                  onChange={(e) => setField("emergency_contact_relation", e.target.value)}
                  className={inputClass("emergency_contact_relation")}
                />
                {getFieldError("emergency_contact_relation") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("emergency_contact_relation")}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Emergency Contact Phone Number{requiredMark}</label>
                <input
                  type="tel"
                  placeholder="e.g., 01712345678"
                  value={form.emergency_contact_phone}
                  onChange={(e) => setField("emergency_contact_phone", e.target.value)}
                  className={inputClass("emergency_contact_phone")}
                />
                {getFieldError("emergency_contact_phone") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("emergency_contact_phone")}</p>}
              </div>
            </div>
          </section>

          {/* 3. Geographic Address & Routing */}
          <section>
            <h3 className="text-sm font-bold text-[#0A2540] mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#00D4B2]/10 text-[10px] font-bold text-[#00D4B2]">3</span>
              Geographic Address &amp; Routing
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Division{requiredMark}</label>
                <select
                  value={form.division}
                  onChange={(e) => {
                    setField("division", e.target.value);
                    setField("district", "");
                    setField("thana", "");
                  }}
                  className={inputClass("division")}
                >
                  <option value="">Select division</option>
                  {Object.entries(DIVISIONS).map(([key, div]) => (
                    <option key={key} value={key}>{div.name}</option>
                  ))}
                </select>
                {getFieldError("division") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("division")}</p>}
              </div>
              <div>
                <label className={labelClass}>District{requiredMark}</label>
                <select
                  value={form.district}
                  onChange={(e) => {
                    setField("district", e.target.value);
                    setField("thana", "");
                  }}
                  className={inputClass("district")}
                  disabled={!selectedDivision}
                >
                  <option value="">Select district</option>
                  {selectedDivision && Object.entries(selectedDivision.districts).map(([key]) => (
                    <option key={key} value={key}>{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
                {getFieldError("district") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("district")}</p>}
              </div>
              <div>
                <label className={labelClass}>Thana{requiredMark}</label>
                <select
                  value={form.thana}
                  onChange={(e) => setField("thana", e.target.value)}
                  className={inputClass("thana")}
                  disabled={!selectedDistrict}
                >
                  <option value="">Select thana</option>
                  {selectedDistrict?.map((thana: string) => (
                    <option key={thana} value={thana}>{thana}</option>
                  ))}
                </select>
                {getFieldError("thana") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("thana")}</p>}
              </div>
              <div className="sm:col-span-3">
                <label className={labelClass}>Road / House No. / Landmark{requiredMark}</label>
                <textarea
                  placeholder="e.g., House 12, Road 5, Block C, Beside City Hospital"
                  value={form.address_detail}
                  onChange={(e) => setField("address_detail", e.target.value)}
                  rows={3}
                  className={inputClass("address_detail")}
                />
                {getFieldError("address_detail") && <p className="mt-1 text-[10px] text-red-500">{getFieldError("address_detail")}</p>}
              </div>
            </div>
          </section>

          {/* 4. Administrative Notes */}
          <section>
            <h3 className="text-sm font-bold text-[#0A2540] mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#00D4B2]/10 text-[10px] font-bold text-[#00D4B2]">4</span>
              Administrative Notes
            </h3>
            <div>
              <label className={labelClass}>Agent Intake Notes</label>
              <textarea
                placeholder="Log initial symptoms, triage observations, or special requirements noted during the call..."
                value={form.agent_notes}
                onChange={(e) => setField("agent_notes", e.target.value)}
                rows={3}
                className={inputClass("agent_notes")}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                id="has_emergency_flag"
                checked={form.has_emergency_flag}
                onChange={(e) => setField("has_emergency_flag", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#FF9900] accent-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20"
              />
              <label htmlFor="has_emergency_flag" className="text-xs font-semibold text-[#2D3A4A] cursor-pointer select-none">
                Mark as Emergency — This patient requires immediate clinical attention
              </label>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200/60 px-6 py-4">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0A2540]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Registering...
              </>
            ) : (
              "Register Patient"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
