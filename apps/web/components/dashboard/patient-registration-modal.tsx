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
  callerName: string;
  callerEmail: string;
  callDuration: number;
  onEndCall: () => void;
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

const STEPS = [
  { label: "Demographics", key: "demographics" },
  { label: "Contact", key: "contact" },
  { label: "Address", key: "address" },
  { label: "Review", key: "review" },
] as const;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PatientRegistrationModal({ open, patientPhone, callerName, callerEmail, callDuration, onEndCall, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pastPatients, setPastPatients] = useState<import("@/lib/call-center-api").PastPatient[]>([]);
  const [pastPatientsLoading, setPastPatientsLoading] = useState(false);
  const [selectedPastPatientId, setSelectedPastPatientId] = useState("");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open && callerEmail) {
      setPastPatientsLoading(true);
      import("@/lib/call-center-api").then(({ callCenterApi }) => {
        callCenterApi.fetchPastPatients(callerEmail).then((patients) => {
          setPastPatients(patients);
          setPastPatientsLoading(false);
        }).catch(() => {
          setPastPatients([]);
          setPastPatientsLoading(false);
        });
      });
    }
  }, [open, callerEmail]);

  useEffect(() => {
    if (patientPhone && !form.primary_phone) {
      setForm((prev) => ({ ...prev, primary_phone: patientPhone }));
    }
  }, [patientPhone, form.primary_phone]);

  const setField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }, []);

  const parseAddressLine1 = useCallback((line: string) => {
    const getValue = (re: RegExp): string => {
      const m = line.match(re);
      return m?.[1]?.trim() ?? "";
    };
    return {
      division: getValue(/Division:\s*([^,]+)/i),
      district: getValue(/District:\s*([^,]+)/i),
      thana: getValue(/Thana:\s*([^,]+)/i),
    };
  }, []);

  const handlePastPatientSelect = useCallback((patientId: string) => {
    setSelectedPastPatientId(patientId);
    if (!patientId) return;
    const patient = pastPatients.find((p) => p.id === patientId);
    if (!patient) return;
    const parsed = parseAddressLine1(patient.address_line1);
    setForm({
      full_name_en: patient.full_name_en,
      full_name_bn: patient.full_name_bn,
      date_of_birth: patient.date_of_birth,
      sex: patient.sex,
      blood_group: patient.blood_group,
      primary_phone: patient.primary_phone,
      alternative_phone: "",
      emergency_contact_name: "",
      emergency_contact_relation: "",
      emergency_contact_phone: patient.emergency_contact,
      division: parsed.division,
      district: parsed.district || patient.district,
      thana: parsed.thana,
      address_detail: patient.address_line2,
      agent_notes: "",
      has_emergency_flag: false,
    });
    setErrors([]);
  }, [pastPatients, parseAddressLine1]);

  const getFieldError = (field: keyof FormData): string | undefined =>
    errors.find((e) => e.field === field)?.message;

  const validateStep = (stepIdx: number): boolean => {
    const newErrors: FieldError[] = [];

    if (stepIdx === 0) {
      if (!form.full_name_en.trim()) newErrors.push({ field: "full_name_en", message: "Full name is required." });
      if (!form.full_name_bn.trim()) newErrors.push({ field: "full_name_bn", message: "বাংলায় নাম আবশ্যক।" });
      if (!form.date_of_birth) newErrors.push({ field: "date_of_birth", message: "Date of birth is required." });
      if (!form.sex) newErrors.push({ field: "sex", message: "Please select a gender." });
    }

    if (stepIdx === 1) {
      if (!form.primary_phone.match(/^01[3-9]\d{8}$/)) newErrors.push({ field: "primary_phone", message: "Enter a valid 11-digit phone number." });
      if (!form.emergency_contact_name.trim()) newErrors.push({ field: "emergency_contact_name", message: "Emergency contact name is required." });
      if (!form.emergency_contact_relation.trim()) newErrors.push({ field: "emergency_contact_relation", message: "Relationship is required." });
      if (!form.emergency_contact_phone.match(/^01[3-9]\d{8}$/)) newErrors.push({ field: "emergency_contact_phone", message: "Enter a valid 11-digit number." });
      if (form.alternative_phone && !form.alternative_phone.match(/^01[3-9]\d{8}$/)) {
        newErrors.push({ field: "alternative_phone", message: "Enter a valid 11-digit number." });
      }
    }

    if (stepIdx === 2) {
      if (!form.division) newErrors.push({ field: "division", message: "Please select a division." });
      if (!form.district) newErrors.push({ field: "district", message: "Please select a district." });
      if (!form.thana) newErrors.push({ field: "thana", message: "Please select a thana." });
      if (!form.address_detail.trim()) newErrors.push({ field: "address_detail", message: "Please enter the road/house/landmark details." });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    setErrors([]);
  };

  const handleSubmit = async () => {
    // Validate all required fields before final submit
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;
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
    setStep(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setErrors([]);
      setServerError(null);
      setStep(0);
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

  const initials = getInitials(callerName);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Left Panel — Caller Info */}
        <div className="flex w-64 shrink-0 flex-col items-center justify-between bg-gradient-to-b from-[#0A2540] to-[#0A2540]/90 px-6 py-8">
          <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white ring-2 ring-white/20">
              {initials}
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-white/90">{callerName}</p>
            <p className="text-[10px] text-white/50">{callerEmail}</p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Call Duration</p>
              <p className="mt-1 text-2xl font-mono font-bold text-white tabular-nums">{formatDuration(callDuration)}</p>
            </div>

            <button
              onClick={onEndCall}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 active:scale-90 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Step Indicator */}
          <div className="flex items-center gap-0 border-b border-slate-200/60 px-6">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  i === step
                    ? "text-[#0A2540]"
                    : i < step
                    ? "text-[#00D4B2]"
                    : "text-slate-300"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-lg text-[10px] font-bold ${
                    i === step
                      ? "bg-[#0A2540] text-white"
                      : i < step
                      ? "bg-[#00D4B2]/10 text-[#00D4B2]"
                      : "bg-slate-100 text-slate-300"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div className={`ml-4 h-px w-8 ${i < step ? "bg-[#00D4B2]" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {serverError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-[11px] text-red-600">{serverError}</p>
              </div>
            )}

            {/* Past patient selector — show on step 0 */}
            {step === 0 && (
              <section className="mb-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Booked By</label>
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-[#0A2540]">
                      {callerName}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Book for a Past Patient</label>
                    <select
                      value={selectedPastPatientId}
                      onChange={(e) => handlePastPatientSelect(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] transition-all outline-none focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
                    >
                      <option value="">
                        {pastPatientsLoading ? "Loading..." : pastPatients.length > 0 ? "-- Select a past patient --" : "No past patients found"}
                      </option>
                      {pastPatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name_en} — {p.primary_phone}
                        </option>
                      ))}
                    </select>
                    {selectedPastPatientId && (
                      <p className="mt-1 text-[10px] text-amber-600">
                        Fields auto-filled from past record. Edit as needed.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Step 1: Demographics */}
            {step === 0 && (
              <section>
                <h3 className="text-sm font-bold text-[#0A2540] mb-3">Patient Demographics</h3>
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
            )}

            {/* Step 2: Contact */}
            {step === 1 && (
              <section>
                <h3 className="text-sm font-bold text-[#0A2540] mb-3">Contact Information</h3>
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
            )}

            {/* Step 3: Address */}
            {step === 2 && (
              <section>
                <h3 className="text-sm font-bold text-[#0A2540] mb-3">Geographic Address &amp; Routing</h3>
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
            )}

            {/* Step 4: Review & Notes */}
            {step === 3 && (
              <section>
                <h3 className="text-sm font-bold text-[#0A2540] mb-3">Administrative Notes</h3>
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
            )}
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between border-t border-slate-200/60 px-6 py-4">
            <button
              onClick={step === 0 ? handleClose : handleBack}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0A2540]/90"
              >
                Next
              </button>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
