"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { callCenterApi, type PatientProfile, type ServiceTicketPayload, type BookingSessionResult } from "@/lib/call-center-api";
import { loadSession, dashboardPathForRole } from "@/lib/auth";
import ServiceFormFields from "@/components/dashboard/service-form-fields";
import ProviderSelector, { type ServiceFormMeta } from "@/components/dashboard/provider-selector";

const navItems: DashboardNavItem[] = [
  {
    label: "Live Queue",
    href: "/dashboard/call-center",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    label: "Booking Workspace",
    href: "/dashboard/call-center/booking",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

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

const SERVICE_PRICES: Record<string, number> = {
  XRAY: 500,
  USG: 1200,
  CAREGIVER: 2500,
};

const TIME_SLOTS = [
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
];

export default function BookingWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const mrn = searchParams.get("mrn");

  const [session, setSession] = useState<ReturnType<typeof loadSession>>(null);
  const [hydrated, setHydrated] = useState(false);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add-service form state
  const [newServiceType, setNewServiceType] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [newProviderId, setNewProviderId] = useState<string | null>(null);
  const [newMeta, setNewMeta] = useState<ServiceFormMeta>({});

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "CALL_CENTER_AGENT") {
      router.replace(dashboardPathForRole(s.user.role));
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!patientId) {
      setPatientLoading(false);
      return;
    }
    callCenterApi
      .getPatient(patientId)
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setPatientLoading(false));
  }, [patientId]);

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
      price: SERVICE_PRICES[newServiceType] ?? 0,
      assigned_provider_id: newProviderId,
      additional_meta: { ...newMeta },
    };
    setCart((prev) => [...prev, item]);
    resetAddForm();
  }, [newServiceType, newDate, newTimeSlot, newProviderId, newMeta, resetAddForm]);

  const handleRemoveFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (cart.length === 0 || !patientId) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: ServiceTicketPayload[] = cart.map((item) => ({
        service_type: item.service_type,
        scheduled_date: item.scheduled_date || undefined,
        scheduled_time_slot: item.scheduled_time_slot || undefined,
        price: item.price,
        assigned_provider_id: item.assigned_provider_id || undefined,
        additional_meta:
          Object.values(item.additional_meta).some((v) => v)
            ? (item.additional_meta as Record<string, unknown>)
            : undefined,
      }));

      const data = await callCenterApi.createBookingSession({
        patient_id: patientId,
        booked_by: session?.user.email,
        agent_id: session?.user.id,
        services: payload,
      });

      setResult(data);
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking submission failed.");
    } finally {
      setSubmitting(false);
    }
  }, [cart, patientId, session]);

  const handleBackToDashboard = useCallback(() => {
    router.push("/dashboard/call-center");
  }, [router]);

  const totalAmount = cart.reduce((sum, i) => sum + i.price, 0);

  if (!hydrated || patientLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">Loading patient data...</span>
        </div>
      </main>
    );
  }

  if (!session || !patientId || !mrn) return null;

  // Success state
  if (result) {
    return (
      <DashboardShell role={session.user.role} accent="teal" navItems={navItems} pageTitle="Booking Confirmed" pageSubtitle="Multi-service session created successfully">
        <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#0A2540]">Session Created</h2>
          <p className="mt-1 text-xs text-slate-500">
            Session ID: <span className="font-mono font-semibold text-[#0A2540]">{result.session_id}</span>
          </p>
          <div className="mt-4 space-y-2 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Tickets</p>
            {result.tickets.map((t) => (
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
              <span className="text-sm font-bold text-[#0A2540]">৳{result.total_amount}</span>
            </div>
          </div>
          <button onClick={handleBackToDashboard} className="mt-6 w-full rounded-xl bg-[#0A2540] px-5 py-3 text-xs font-bold text-white hover:bg-[#0A2540]/90 transition">
            Back to Dashboard
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={session.user.role}
      accent="teal"
      navItems={navItems}
      pageTitle="Multi-Service Booking Workspace"
      pageSubtitle="Configure and submit service requests for the patient"
    >
      {/* Sticky Patient Header */}
      <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 rounded-none border-b border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur-sm shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0A2540] text-sm font-bold text-[#00D4B2]">
              {patient ? patient.first_name_en.charAt(0) : "?"}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-[#0A2540]">
                {patient ? `${patient.first_name_en} ${patient.last_name_en}` : "—"}
              </span>
              <span className="text-[10px] text-slate-500">MRN: {mrn}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
            <span>Gender: <strong className="text-[#0A2540]">{patient?.sex ?? "—"}</strong></span>
            <span>Phone: <strong className="text-[#0A2540]">{patient?.phone_number ?? "—"}</strong></span>
            <span>District: <strong className="text-[#0A2540]">{patient?.district ?? "—"}</strong></span>
            <span>Booked by: <strong className="text-[#0A2540]">{session.user.email}</strong></span>
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="mb-6 rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#0A2540]">Service Cart ({cart.length})</h3>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
            className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#00D4B2]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Service
          </button>
        </div>

        {/* Inline Add-Service Form */}
        {showAddForm && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">Service Type</label>
                <select
                  value={newServiceType}
                  onChange={(e) => { setNewServiceType(e.target.value); setNewMeta({}); }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0A2540] outline-none focus:border-[#00D4B2]"
                >
                  <option value="">Select</option>
                  <option value="XRAY">X-Ray</option>
                  <option value="USG">Ultrasound (USG)</option>
                  <option value="CAREGIVER">Caregiver</option>
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
              <div className="flex items-end">
                <p className="text-xs font-bold text-[#0A2540]">
                  ৳{newServiceType ? SERVICE_PRICES[newServiceType] : 0}
                </p>
              </div>
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
              district={patient?.district ?? ""}
              onSelect={setNewProviderId}
              selectedProviderId={newProviderId}
            />

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

        {/* Cart Items */}
        {cart.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-slate-400 italic">
            No services added yet. Click Add Service to begin.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2.5">
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-[#0A2540]">{item.service_type}</span>
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

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-[11px] text-red-600">{error}</p>
        </div>
      )}

      {/* Submit Footer */}
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 rounded-none border-t border-slate-200/80 bg-white px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">
              {cart.length} service{cart.length !== 1 ? "s" : ""}
            </span>
            <span className="text-base font-bold text-[#0A2540]">Total: ৳{totalAmount}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToDashboard}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitting}
              className="flex items-center gap-2 rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0A2540]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Submitting...
                </>
              ) : (
                "Submit Booking"
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
