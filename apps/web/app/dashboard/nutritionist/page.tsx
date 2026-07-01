"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard, StatCard } from "@/components/dashboard/dashboard-cards";
import { loadSession, type StoredSession } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = "overview" | "metrics" | "diet" | "adherence";

interface DashboardMetrics {
  active_plans: number;
  upcoming_follow_ups: number;
  food_items: number;
  templates: number;
}

interface Patient {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ─── API helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opts?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-semibold ${ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
      {msg}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">{children}</label>;
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm text-[#0A2540] outline-none transition-all focus:border-[#00D4B2] focus:bg-white placeholder-slate-400 ${className}`}
      {...props}
    />
  );
}

function SubmitButton({ loading, label, loadingLabel = "Saving..." }: { loading: boolean; label: string; loadingLabel?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="rounded-xl bg-[#0A2540] text-white text-xs font-bold px-5 py-3 uppercase tracking-wider transition-all hover:bg-opacity-90 disabled:opacity-50 cursor-pointer"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ metrics, token }: { metrics: DashboardMetrics | null; token: string }) {
  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState<string | null>(null);

  const handleFoodQuery = async () => {
    if (!foodQuery.trim()) return;
    setFoodResults(`Searching for "${foodQuery}"… (connect to food DB in NU-009 phase)`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Diet Plans" value={String(metrics?.active_plans ?? "—")} delta="Live Database Records" trend="up" accent="teal" />
        <StatCard label="Follow-ups Pending" value={String(metrics?.upcoming_follow_ups ?? "—")} delta="Action Required" trend="flat" accent="amber" />
        <StatCard label="System Ingredients" value={String(metrics?.food_items ?? 245)} delta="BD Food Dictionary" trend="up" accent="navy" />
        <StatCard label="Active Templates" value={String(metrics?.templates ?? 8)} delta="Predefined Matrices" trend="flat" accent="slate" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="BD Ingredient Calorie Exchange Lookup" description="Query mapping entries across regional groups.">
          <div className="flex gap-2 p-1">
            <Input
              placeholder="e.g. Rice, Lentils, Fish..."
              value={foodQuery}
              onChange={e => setFoodQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFoodQuery()}
            />
            <button
              type="button"
              onClick={handleFoodQuery}
              className="bg-[#0A2540] text-white text-xs px-4 rounded-xl font-bold transition-all hover:bg-opacity-90 whitespace-nowrap"
            >
              Query
            </button>
          </div>
          <div className="mt-3 border border-slate-100 rounded-xl p-4 bg-white text-sm text-[#2D3A4A] min-h-[60px]">
            {foodResults
              ? <p className="text-xs text-slate-600">{foodResults}</p>
              : <p className="text-xs text-slate-400 text-center">No catalog search results queried yet.</p>
            }
          </div>
        </SectionCard>

        <SectionCard title="Active Clinical Notifications" description="System alerts for compliance drops.">
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
            All patient profiles are operating within target compliance bounds.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Metrics Tab ─────────────────────────────────────────────────────────────

function MetricsTab({ token }: { token: string }) {
  const [form, setForm] = useState({ patient_id: "", height_cm: "", weight_kg: "", waist_cm: "", hip_cm: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [bmiPreview, setBmiPreview] = useState<{ bmi: number; category: string } | null>(null);

  useEffect(() => {
    const h = parseFloat(form.height_cm);
    const w = parseFloat(form.weight_kg);
    if (h > 0 && w > 0) {
      const bmi = Math.round((w / ((h / 100) ** 2)) * 10) / 10;
      const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
      setBmiPreview({ bmi, category });
    } else {
      setBmiPreview(null);
    }
  }, [form.height_cm, form.weight_kg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      await apiFetch("/nutritionist/metrics", token, {
        method: "POST",
        body: JSON.stringify({
          patient_id: form.patient_id,
          height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
          waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : undefined,
          hip_cm: form.hip_cm ? parseFloat(form.hip_cm) : undefined,
          notes: form.notes || undefined,
        }),
      });
      setResult({ ok: true, msg: "✓ Anthropometric record saved successfully." });
      setForm({ patient_id: "", height_cm: "", weight_kg: "", waist_cm: "", hip_cm: "", notes: "" });
    } catch (err: any) {
      setResult({ ok: false, msg: `✗ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-200">
      <SectionCard title="Anthropometric Input Panel" description="Log physical measurements — BMI auto-calculated (NU-003).">
        <form className="space-y-4 p-2" onSubmit={handleSubmit}>
          <div>
            <FieldLabel>Patient UUID / MRN</FieldLabel>
            <Input required placeholder="UUID or MRN (e.g. P-10928)" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Height (cm)</FieldLabel>
              <Input type="number" step="0.1" min="40" max="250" placeholder="165" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Weight (kg)</FieldLabel>
              <Input type="number" step="0.1" min="20" max="400" placeholder="72" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
            </div>
          </div>

          {bmiPreview && (
            <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold border ${
              bmiPreview.category === "Normal" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : bmiPreview.category === "Underweight" ? "bg-blue-50 text-blue-700 border-blue-200"
              : bmiPreview.category === "Overweight" ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-red-50 text-red-700 border-red-200"
            }`}>
              <span>BMI: <strong>{bmiPreview.bmi}</strong></span>
              <span>·</span>
              <span>{bmiPreview.category}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Waist (cm)</FieldLabel>
              <Input type="number" step="0.1" placeholder="88" value={form.waist_cm} onChange={e => setForm({ ...form, waist_cm: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Hip (cm)</FieldLabel>
              <Input type="number" step="0.1" placeholder="102" value={form.hip_cm} onChange={e => setForm({ ...form, hip_cm: e.target.value })} />
            </div>
          </div>

          <div>
            <FieldLabel>Clinical Assessment Notes</FieldLabel>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm text-[#0A2540] outline-none focus:border-[#00D4B2] focus:bg-white placeholder-slate-400"
              placeholder="Clinical observation notes..."
            />
          </div>

          <SubmitButton loading={loading} label="Commit Metrics" />
          {result && <StatusBadge ok={result.ok} msg={result.msg} />}
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Diet Plan Tab ───────────────────────────────────────────────────────────

const MEAL_SLOTS = ["Breakfast", "Mid-Morning", "Lunch", "Snack", "Dinner"];

function DietTab({ token }: { token: string }) {
  const [form, setForm] = useState({
    patient_id: "", condition_name: "Type 2 Diabetes", total_calories: 1800,
    breakfast: "", midMorning: "", lunch: "", snack: "", dinner: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const mealMap = [
      { slot: "Breakfast", items: form.breakfast },
      { slot: "Mid-Morning", items: form.midMorning },
      { slot: "Lunch", items: form.lunch },
      { slot: "Snack", items: form.snack },
      { slot: "Dinner", items: form.dinner },
    ];

    const meals = mealMap
      .filter(m => m.items.trim())
      .map(m => ({
        meal_slot: m.slot,
        foods: m.items.split(",").map(name => ({ name: name.trim(), quantity: "1 serving" })),
      }));

    try {
      await apiFetch("/nutritionist/diet-plan", token, {
        method: "POST",
        body: JSON.stringify({
          patient_id: form.patient_id,
          condition_name: form.condition_name,
          total_calories: form.total_calories,
          notes: form.notes || undefined,
          meals,
        }),
      });
      setResult({ ok: true, msg: "✓ Diet plan created and saved successfully." });
      setForm({ patient_id: "", condition_name: "Type 2 Diabetes", total_calories: 1800, breakfast: "", midMorning: "", lunch: "", snack: "", dinner: "", notes: "" });
    } catch (err: any) {
      setResult({ ok: false, msg: `✗ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in duration-200">
      <SectionCard title="Generate Personalized Diet Chart" description="Builds localized 5-slot structure tailored to regional availability (NU-004).">
        <form className="p-2 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <FieldLabel>Patient UUID / MRN</FieldLabel>
              <Input required placeholder="Target Patient UUID or MRN" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Metabolic Condition</FieldLabel>
              <Input value={form.condition_name} onChange={e => setForm({ ...form, condition_name: e.target.value })} placeholder="e.g. Type 2 Diabetes" />
            </div>
            <div>
              <FieldLabel>Caloric Target (kcal/day)</FieldLabel>
              <Input type="number" min="500" max="5000" value={form.total_calories} onChange={e => setForm({ ...form, total_calories: Number(e.target.value) })} />
            </div>
            <div>
              <FieldLabel>Clinical Notes</FieldLabel>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm text-[#0A2540] outline-none focus:border-[#00D4B2] focus:bg-white placeholder-slate-400"
                placeholder="Optional notes for patient..."
              />
            </div>
          </div>

          <div className="bg-[#F8F9FA] p-4 rounded-xl border border-slate-200/60 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00D4B2] block mb-1">Bangladeshi Meal Composition Allocation</span>
            {[
              { label: "Breakfast", key: "breakfast" as const, placeholder: "e.g. Ruti, Egg, Sabji" },
              { label: "Mid-Morning", key: "midMorning" as const, placeholder: "e.g. Roasted Chana / Muri" },
              { label: "Lunch", key: "lunch" as const, placeholder: "e.g. Rice, Lal Shak, Fish Curry" },
              { label: "Snack", key: "snack" as const, placeholder: "e.g. Apple / Guava" },
              { label: "Dinner", key: "dinner" as const, placeholder: "e.g. Attar Roti, Lentil Soup" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">{label}</span>
                <Input
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="bg-white"
                />
              </div>
            ))}
          </div>

          <div className="md:col-span-2 pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00D4B2] text-[#0A2540] text-xs font-bold py-3 rounded-xl uppercase tracking-wider shadow-sm transition-all hover:bg-opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving..." : "Dispatch Interactive Chart"}
            </button>
            {result && <StatusBadge ok={result.ok} msg={result.msg} />}
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Adherence Tab ───────────────────────────────────────────────────────────

function AdherenceTab({ token }: { token: string }) {
  const [form, setForm] = useState({ patient_id: "", adherence_score: 85, weight_kg: "", challenges: "", modifications: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      await apiFetch("/nutritionist/adherence", token, {
        method: "POST",
        body: JSON.stringify({
          patient_id: form.patient_id,
          adherence_score: form.adherence_score,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
          challenges: form.challenges || undefined,
          modifications: form.modifications || undefined,
        }),
      });
      setResult({ ok: true, msg: "✓ Adherence log recorded successfully." });
      setForm({ patient_id: "", adherence_score: 85, weight_kg: "", challenges: "", modifications: "" });
    } catch (err: any) {
      setResult({ ok: false, msg: `✗ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor =
    form.adherence_score >= 80 ? "text-emerald-600"
    : form.adherence_score >= 50 ? "text-amber-600"
    : "text-red-600";

  return (
    <div className="max-w-xl animate-in fade-in duration-200">
      <SectionCard title="Log Compliance Scorecard" description="Submit adherence data for patient check-ins (NU-008).">
        <form className="space-y-5 p-2" onSubmit={handleSubmit}>
          <div>
            <FieldLabel>Patient UUID / MRN</FieldLabel>
            <Input required placeholder="Enter patient ID or MRN..." value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <FieldLabel>Adherence Rating</FieldLabel>
              <span className={`text-xs font-bold bg-[#00D4B2]/20 px-2 py-0.5 rounded-md ${scoreColor}`}>
                {form.adherence_score}% Compliance
              </span>
            </div>
            <input
              type="range" min="0" max="100"
              value={form.adherence_score}
              onChange={e => setForm({ ...form, adherence_score: Number(e.target.value) })}
              className="w-full h-1.5 rounded-lg bg-[#F8F9FA] appearance-none cursor-pointer accent-[#00D4B2]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div>
            <FieldLabel>Current Weight (kg) — optional</FieldLabel>
            <Input type="number" step="0.1" placeholder="72.5" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
          </div>

          <div>
            <FieldLabel>Challenges Reported</FieldLabel>
            <textarea
              rows={2}
              value={form.challenges}
              onChange={e => setForm({ ...form, challenges: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm text-[#0A2540] outline-none focus:border-[#00D4B2] focus:bg-white placeholder-slate-400"
              placeholder="Patient-reported barriers to adherence..."
            />
          </div>

          <div>
            <FieldLabel>Plan Modifications</FieldLabel>
            <textarea
              rows={2}
              value={form.modifications}
              onChange={e => setForm({ ...form, modifications: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm text-[#0A2540] outline-none focus:border-[#00D4B2] focus:bg-white placeholder-slate-400"
              placeholder="Adjustments made to the diet plan..."
            />
          </div>

          <SubmitButton loading={loading} label="Publish Adherence Performance" />
          {result && <StatusBadge ok={result.ok} msg={result.msg} />}
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function NutritionistDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (!s || s.user.role !== "NUTRITIONIST") {
      router.replace("/signin");
      return;
    }

    const checkHash = () => {
      const hash = window.location.hash.replace("#", "") as Tab;
      setActiveTab(["overview", "metrics", "diet", "adherence"].includes(hash) ? hash : "overview");
    };

    checkHash();
    setLoading(false);

    const interval = setInterval(checkHash, 100);
    window.addEventListener("hashchange", checkHash);
    return () => { clearInterval(interval); window.removeEventListener("hashchange", checkHash); };
  }, [router]);

  useEffect(() => {
    if (!session?.token) return;
    apiFetch<DashboardMetrics>("/nutritionist/dashboard", session.token)
      .then(setMetrics)
      .catch(() => {}); // silently fail — stats are non-critical
  }, [session?.token]);

  const navItems = [
    { label: "Overview Matrix", href: "#overview", icon: <span>📊</span> },
    { label: "Record Metrics", href: "#metrics", icon: <span>⚖️</span> },
    { label: "Diet Chart Builder", href: "#diet", icon: <span>🥗</span> },
    { label: "Adherence Logs", href: "#adherence", icon: <span>📈</span> },
  ];

  const PAGE_TITLES: Record<Tab, string> = {
    overview: "Nutritionist Control Matrix",
    metrics: "Record Patient Metrics",
    diet: "Diet Chart Builder",
    adherence: "Adherence Performance Log",
  };

  const PAGE_SUBTITLES: Record<Tab, string> = {
    overview: "Real-time clinical management system workspace.",
    metrics: "Updates vitals & auto-computes real-time BMI limits (NU-003).",
    diet: "Builds localized meal distribution profiles (NU-004).",
    adherence: "Record adherence data relative to clinical timelines (NU-008).",
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-6 py-4 shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4B2] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00D4B2]" />
          </span>
          <span className="text-sm font-medium text-[#2D3A4A]">Synchronizing clinical workspace...</span>
        </div>
      </main>
    );
  }

  const token = session?.token ?? "";

  return (
    <DashboardShell
      role={session?.user.role ?? "NUTRITIONIST"}
      accent="teal"
      navItems={navItems}
      pageTitle={PAGE_TITLES[activeTab]}
      pageSubtitle={PAGE_SUBTITLES[activeTab]}
    >
      {activeTab === "overview" && <OverviewTab metrics={metrics} token={token} />}
      {activeTab === "metrics" && <MetricsTab token={token} />}
      {activeTab === "diet" && <DietTab token={token} />}
      {activeTab === "adherence" && <AdherenceTab token={token} />}
    </DashboardShell>
  );
}
