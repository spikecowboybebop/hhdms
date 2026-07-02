"use client";

import { useState, useCallback, useEffect } from "react";
import { callCenterApi, type BookingSessionResult } from "@/lib/call-center-api";
import ServiceFormFields from "@/components/dashboard/service-form-fields";
import ProviderSelector, { type ServiceFormMeta } from "@/components/dashboard/provider-selector";

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

const STEPS = [
  { label: "Demographics", key: "demographics" },
  { label: "Contact", key: "contact" },
  { label: "Address", key: "address" },
  { label: "Register", key: "register" },
  { label: "Services", key: "services" },
  { label: "Booking", key: "booking" },
] as const;

const SERVICE_CONFIG: Record<string, { label: string; price: number }> = {
  MBBS: { label: "MBBS Doctor Consultation", price: 800 },
  SPECIALIST: { label: "Specialist Doctor Consultation", price: 1200 },
  ADULT_NURSE: { label: "Adult Nursing Service", price: 1500 },
  PEDIATRIC_NURSE: { label: "Pediatric Nursing Service", price: 1500 },
  NUTRITIONIST: { label: "Nutritionist Consultation", price: 1000 },
  CAREGIVER: { label: "Caregiver (M/F/Child)", price: 2500 },
  USG: { label: "Ultrasound (USG)", price: 1200 },
  XRAY: { label: "X-Ray", price: 500 },
};

const TIME_SLOTS = [
  "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00",
  "14:00-15:00", "15:00-16:00", "16:00-17:00",
];

interface Props {
  open: boolean;
  patientPhone?: string;
  callerName: string;
  callerEmail: string;
  callDuration: number;
  onEndCall: () => void;
  onClose: () => void;
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

interface CartItem {
  id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time_slot: string;
  price: number;
  assigned_provider_id: string | null;
  additional_meta: ServiceFormMeta;
}

let cartIdCounter = 0;

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

export default function PatientRegistrationModal({ open, patientPhone, callerName, callerEmail, callDuration, onEndCall, onClose }: Props) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pastPatients, setPastPatients] = useState<import("@/lib/call-center-api").PastPatient[]>([]);
  const [pastPatientsLoading, setPastPatientsLoading] = useState(false);
  const [selectedPastPatientId, setSelectedPastPatientId] = useState("");
  const [step, setStep] = useState(0);

  const [registeredPatientId, setRegisteredPatientId] = useState<string | null>(null);
  const [registeredMrn, setRegisteredMrn] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceType, setNewServiceType] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [newProviderId, setNewProviderId] = useState<string | null>(null);
  const [newMeta, setNewMeta] = useState<ServiceFormMeta>({});
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingSessionResult | null>(null);

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
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const data = await callCenterApi.registerPatient(form);
      setRegisteredPatientId(data.id);
      setRegisteredMrn(data.mrn);
      setStep(4);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAddForm = useCallback(() => {
    setNewServiceType("");
    setNewDate("");
    setNewTimeSlot("");
    setNewProviderId(null);
    setNewMeta({});
    setShowAddForm(false);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!newServiceType) return;
    const item: CartItem = {
      id: `cart-${++cartIdCounter}`,
      service_type: newServiceType,
      scheduled_date: newDate,
      scheduled_time_slot: newTimeSlot,
      price: SERVICE_CONFIG[newServiceType]?.price ?? 0,
      assigned_provider_id: newProviderId,
      additional_meta: { ...newMeta },
    };
    setCart((prev) => [...prev, item]);
    resetAddForm();
  }, [newServiceType, newDate, newTimeSlot, newProviderId, newMeta, resetAddForm]);

  const handleRemoveFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleSubmitBooking = async () => {
    if (cart.length === 0 || !registeredPatientId) return;
    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const payload = cart.map((item) => ({
        service_type: item.service_type,
        scheduled_date: item.scheduled_date || undefined,
        scheduled_time_slot: item.scheduled_time_slot || undefined,
        price: item.price,
        assigned_provider_id: item.assigned_provider_id || undefined,
        additional_meta: Object.values(item.additional_meta).some((v) => v)
          ? (item.additional_meta as Record<string, unknown>)
          : undefined,
      }));

      const data = await callCenterApi.createBookingSession({
        patient_id: registeredPatientId,
        booked_by: callerEmail,
        services: payload,
      });

      setBookingResult(data);
      setCart([]);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking submission failed.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
  const totalAmount = cart.reduce((sum, i) => sum + i.price, 0);
  const cartServicesInCart = new Set(cart.map((i) => i.service_type));

  const breadcrumbItems: { index: number }[] = [];
  if (step > 1) breadcrumbItems.push({ index: -1 });
  if (step > 0) breadcrumbItems.push({ index: step - 1 });
  breadcrumbItems.push({ index: step });
  if (step < STEPS.length - 1) breadcrumbItems.push({ index: step + 1 });
  if (step < STEPS.length - 2) breadcrumbItems.push({ index: -1 });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="flex w-full max-w-4xl h-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Left Panel — Caller Info */}
        <div className="flex w-80 shrink-0 flex-col items-center justify-between bg-gradient-to-b from-[#0A2540] to-[#0A2540]/90 px-6 py-10">
          <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white ring-2 ring-white/20">
              {initials}
            </div>
            <p className="mt-3 text-center text-lg font-semibold text-white">{callerName}</p>
            <p className="text-[16px] text-white">{callerEmail}</p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white">Call Duration</p>
              <p className="mt-1 text-2xl font-mono font-bold text-white tabular-nums">{formatDuration(callDuration)}</p>
            </div>

            <button
              onClick={onEndCall}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 active:scale-90 transition-all"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.18-.29-.43-.29-.71 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Breadcrumb Step Indicator — shows at most prev + current + next */}
          {!bookingResult && (
            <div className="flex items-center gap-1.5 border-b border-slate-200/60 px-5 py-3">
              {breadcrumbItems.map((item, idx) => {
                const isEllipsis = item.index < 0;
                const key = isEllipsis ? `ellipsis-${idx}` : STEPS[item.index]!.key;
                return (
                <div key={key} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 shrink-0">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                  {isEllipsis ? (
                    <span className="text-xs font-semibold text-slate-300 px-1">…</span>
                  ) : (
                    <>
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-lg text-[10px] font-bold shrink-0 ${
                          item.index === step
                            ? "bg-[#0A2540] text-white"
                            : item.index < step
                            ? "bg-[#00D4B2]/10 text-[#00D4B2]"
                            : "bg-slate-100 text-slate-300"
                        }`}
                      >
                        {item.index < step ? "✓" : item.index + 1}
                      </span>
                      <span
                        className={`whitespace-nowrap text-xs font-semibold ${
                          item.index === step
                            ? "text-[#0A2540]"
                            : item.index < step
                            ? "text-[#00D4B2]"
                            : "text-slate-300"
                        }`}
                      >
                        {STEPS[item.index]!.label}
                      </span>
                    </>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {serverError && !bookingResult && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-[11px] text-red-600">{serverError}</p>
              </div>
            )}

            {/* Booking Success View */}
            {bookingResult && (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 animate-in zoom-in duration-300">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#0A2540]">Booking Successful</h3>
                <p className="mt-1 text-xs text-slate-500 text-center">
                  Service has been booked for the patient successfully.
                </p>
                <p className="mt-3 text-[10px] text-slate-400 font-mono">
                  Session: {bookingResult.session_id}
                </p>
                <div className="mt-4 w-full max-w-sm space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tickets</p>
                  {bookingResult.tickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs font-semibold text-[#0A2540]">{t.ticket_no}</span>
                        <span className="text-[10px] text-slate-500">{t.service_type}</span>
                      </div>
                      <span className="text-xs font-bold text-[#0A2540]">৳{t.price ?? 0}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-xs font-bold text-[#0A2540]">Total</span>
                    <span className="text-sm font-bold text-[#0A2540]">৳{bookingResult.total_amount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Past patient selector — show on step 0 */}
            {step === 0 && !bookingResult && (
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
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Step 0: Demographics */}
            {step === 0 && !bookingResult && (
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

            {/* Step 1: Contact */}
            {step === 1 && !bookingResult && (
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

            {/* Step 2: Address */}
            {step === 2 && !bookingResult && (
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

            {/* Step 3: Review & Register */}
            {step === 3 && !bookingResult && (
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

            {/* Step 4: Services */}
            {step === 4 && !bookingResult && (
              <section>
                <h3 className="text-sm font-bold text-[#0A2540] mb-3">Add Services</h3>

                {registeredMrn && (
                  <p className="mb-3 text-[10px] text-emerald-600 font-medium">
                    Patient registered — MRN: {registeredMrn}
                  </p>
                )}

                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full rounded-lg border-2 border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-400 hover:border-[#00D4B2] hover:text-[#00D4B2] transition"
                  >
                    + Add Service
                  </button>
                ) : (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">Service Type</label>
                      <select
                        value={newServiceType}
                        onChange={(e) => { setNewServiceType(e.target.value); setNewMeta({}); }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] outline-none focus:border-[#00D4B2]"
                      >
                        <option value="">Select</option>
                        {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key} disabled={cartServicesInCart.has(key)}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">Date</label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] outline-none focus:border-[#00D4B2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">Time Slot</label>
                      <select
                        value={newTimeSlot}
                        onChange={(e) => setNewTimeSlot(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] outline-none focus:border-[#00D4B2]"
                      >
                        <option value="">Select</option>
                        {TIME_SLOTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {newServiceType && (
                      <ServiceFormFields
                        serviceType={newServiceType}
                        meta={newMeta}
                        onChange={setNewMeta}
                      />
                    )}

                    <ProviderSelector
                      serviceType={newServiceType}
                      date={newDate}
                      district={form.district}
                      onSelect={setNewProviderId}
                      selectedProviderId={newProviderId}
                    />

                    {newServiceType && (
                      <p className="text-xs font-semibold text-[#0A2540]">
                        Price: ৳{SERVICE_CONFIG[newServiceType]?.price ?? 0}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={resetAddForm}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddToCart}
                        disabled={!newServiceType}
                        className="rounded-lg bg-[#0A2540] px-4 py-1.5 text-[10px] font-bold text-white hover:bg-[#0A2540]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-2">
                    Cart ({cart.length})
                  </p>
                  {cart.length === 0 ? (
                    <p className="py-4 text-center text-[10px] text-slate-400 italic">
                      No services added yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2.5">
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs font-semibold text-[#0A2540]">
                              {SERVICE_CONFIG[item.service_type]?.label ?? item.service_type}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {item.scheduled_date || "TBD"} {item.scheduled_time_slot ? `• ${item.scheduled_time_slot}` : ""}
                              {item.assigned_provider_id ? " • Provider assigned" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[#0A2540]">৳{item.price}</span>
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="rounded p-1 text-slate-300 hover:text-red-500 transition"
                              aria-label="Remove"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Step 5: Booking Review & Submit */}
            {step === 5 && !bookingResult && (
              <section>
                <h3 className="text-sm font-bold text-[#0A2540] mb-3">Review & Submit Booking</h3>

                {bookingError && (
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-[11px] text-red-600">{bookingError}</p>
                  </div>
                )}

                {cart.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400 italic">No services in cart.</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-semibold text-[#0A2540]">
                            {SERVICE_CONFIG[item.service_type]?.label ?? item.service_type}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.scheduled_date || "TBD"} {item.scheduled_time_slot ? `• ${item.scheduled_time_slot}` : ""}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[#0A2540]">৳{item.price}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-2">
                      <span className="text-sm font-bold text-[#0A2540]">Total</span>
                      <span className="text-lg font-bold text-[#0A2540]">৳{totalAmount}</span>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between border-t border-slate-200/60 px-6 py-4">
            {bookingResult ? (
              <button
                onClick={handleClose}
                className="w-full rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0A2540]/90"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={step === 0 ? handleClose : handleBack}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  {step === 0 ? "Cancel" : "Back"}
                </button>

                {step < 3 && (
                  <button
                    onClick={handleNext}
                    className="rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0A2540]/90"
                  >
                    Next
                  </button>
                )}

                {step === 3 && (
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

                {step === 4 && (
                  <button
                    onClick={() => setStep(5)}
                    disabled={cart.length === 0}
                    className="rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0A2540]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                )}

                {step === 5 && (
                  <button
                    onClick={handleSubmitBooking}
                    disabled={cart.length === 0 || bookingSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0A2540]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingSubmitting ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Booking"
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
