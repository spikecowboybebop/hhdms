"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard, StatCard } from "@/components/dashboard/dashboard-cards";
import { loadSession, type StoredSession } from "@/lib/auth";

export default function NutritionistDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "diet" | "adherence">("overview");
  const [loading, setLoading] = useState(true);

  // Form States
  const [foodQuery, setFoodQuery] = useState("");
  const [score, setScore] = useState(85);
  const [anthroForm, setAnthroForm] = useState({
    patient_id: "", height_cm: "", weight_kg: "", waist_cm: "", hip_cm: "", notes: ""
  });
  const [dietForm, setDietForm] = useState({
    patient_id: "", condition_name: "Type 2 Diabetes", total_calories: 1800,
    breakfast: "", midMorning: "", lunch: "", snack: "", dinner: ""
  });

  // Watch the URL hash changes continuously to force state re-renders
  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (!s || s.user.role !== "NUTRITIONIST") {
      router.replace("/signin");
      return;
    }

    const checkHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (["overview", "metrics", "diet", "adherence"].includes(hash)) {
        setActiveTab(hash as any);
      } else {
        setActiveTab("overview");
      }
    };

    // Run immediately on load
    checkHash();
    setLoading(false);

    // Set up a small polling interval to catch internal Next.js link pushes instantly
    const interval = setInterval(checkHash, 100);
    window.addEventListener("hashchange", checkHash);

    return () => {
      clearInterval(interval);
      window.removeEventListener("hashchange", checkHash);
    };
  }, [router]);

  // Sidebar navigation configuration mapping to local view hashes
  const customNavItems = [
    { label: "Overview Matrix", href: "#overview", icon: <span>📊</span> },
    { label: "Record Metrics", href: "#metrics", icon: <span>⚖️</span> },
    { label: "Diet Chart Builder", href: "#diet", icon: <span>🥗</span> },
    { label: "Adherence Logs", href: "#adherence", icon: <span>📈</span> }
  ];

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

  return (
    <DashboardShell
      role={session?.user.role || "NUTRITIONIST"}
      accent="teal"
      navItems={customNavItems}
      pageTitle={
        activeTab === "overview" ? "Nutritionist Control Matrix" :
        activeTab === "metrics" ? "Record Patient Metrics" :
        activeTab === "diet" ? "Diet Chart Builder" : "Adherence Performance Log"
      }
      pageSubtitle={
        activeTab === "overview" ? "Real-time clinical management system workspace." :
        activeTab === "metrics" ? "Updates vitals & auto-computes real-time BMI limits (NU-003)." :
        activeTab === "diet" ? "Builds localized meal distribution profiles (NU-004)." :
        "Record adherence data relative to clinical timelines (NU-006)."
      }
    >
      {/* 1. OVERVIEW VIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Diet Registers" value="12" delta="Live Database Records" trend="up" accent="teal" />
            <StatCard label="Follow-ups Pending" value="4" delta="Action Required" trend="flat" accent="amber" />
            <StatCard label="System Ingredients" value="245" delta="BD Food Dictionary" trend="up" accent="navy" />
            <StatCard label="Active Templates" value="8" delta="Predefined Matrices" trend="flat" accent="slate" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="BD Ingredient Calorie Exchange Lookup" description="Query mapping entries across regional groups.">
              <div className="flex gap-2 p-1">
                <input 
                  type="text" 
                  placeholder="e.g. Rice, Lentils, Fish..." 
                  value={foodQuery} 
                  onChange={e => setFoodQuery(e.target.value)} 
                  className="flex-1 rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-clinical-navy"
                />
                <button type="button" className="bg-[#0A2540] text-white text-xs px-4 rounded-xl font-bold transition-all hover:bg-opacity-90">Query</button>
              </div>
              <div className="mt-3 border border-slate-100 rounded-xl p-6 bg-white text-sm text-[#2D3A4A] text-center">
                <p className="text-xs text-slate-400">No catalog search results queried yet.</p>
              </div>
            </SectionCard>

            <SectionCard title="Active Clinical Notifications" description="System alerts for compliance drops.">
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                All patient profiles are operating within target compliance bounds.
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* 2. RECORD METRICS VIEW */}
      {activeTab === "metrics" && (
        <div className="max-w-2xl animate-in fade-in duration-200">
          <SectionCard title="Anthropometric Input Panel" description="Log physical diagnostic trends and body configurations.">
            <form className="space-y-4 p-2" onSubmit={e => e.preventDefault()}>
              <div>
                <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Patient UUID / ID</label>
                <input type="text" required value={anthroForm.patient_id} onChange={e => setAnthroForm({...anthroForm, patient_id: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-clinical-navy" placeholder="abcd-1234-uuid" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Height (cm)</label>
                  <input type="number" step="0.1" value={anthroForm.height_cm} onChange={e => setAnthroForm({...anthroForm, height_cm: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-clinical-navy" placeholder="165" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={anthroForm.weight_kg} onChange={e => setAnthroForm({...anthroForm, weight_kg: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-clinical-navy" placeholder="72" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Waist (cm)</label>
                  <input type="number" step="0.1" value={anthroForm.waist_cm} onChange={e => setAnthroForm({...anthroForm, waist_cm: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-clinical-navy" placeholder="88" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Hip (cm)</label>
                  <input type="number" step="0.1" value={anthroForm.hip_cm} onChange={e => setAnthroForm({...anthroForm, hip_cm: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-clinical-navy" placeholder="102" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Clinical Assessment Notes</label>
                <textarea rows={3} value={anthroForm.notes} onChange={e => setAnthroForm({...anthroForm, notes: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] focus:bg-white text-clinical-navy" placeholder="Provide observation overview..." />
              </div>
              <button type="submit" className="rounded-xl bg-[#0A2540] text-white text-xs font-bold px-5 py-3 uppercase tracking-wider transition-all hover:bg-opacity-90 cursor-pointer">Commit Metrics Logs</button>
            </form>
          </SectionCard>
        </div>
      )}

      {/* 3. DIET CHART BUILDER VIEW */}
      {activeTab === "diet" && (
        <div className="max-w-4xl animate-in fade-in duration-200">
          <SectionCard title="Generate Personalized Diet Chart" description="Builds localized 5-slot structure tailored to regional availability.">
            <form className="space-y-4 p-2 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={e => e.preventDefault()}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Patient Identifier ID</label>
                  <input type="text" required value={dietForm.patient_id} onChange={e => setDietForm({...dietForm, patient_id: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" placeholder="Target Patient UUID" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Metabolic Condition</label>
                  <input type="text" value={dietForm.condition_name} onChange={e => setDietForm({...dietForm, condition_name: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Caloric Target (kcal)</label>
                  <input type="number" value={dietForm.total_calories} onChange={e => setDietForm({...dietForm, total_calories: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" />
                </div>
              </div>

              <div className="bg-[#F8F9FA] p-4 rounded-xl border border-slate-200/60 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#00D4B2] block mb-1">Bangladeshi Meal Composition Allocation</span>
                <input type="text" placeholder="Breakfast: Ruti, Egg, Sabji" value={dietForm.breakfast} onChange={e => setDietForm({...dietForm, breakfast: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" />
                <input type="text" placeholder="Mid-morning: Roasted Chana / Muri" value={dietForm.midMorning} onChange={e => setDietForm({...dietForm, midMorning: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" />
                <input type="text" placeholder="Lunch: Rice, Lal Shak, Fish Curry" value={dietForm.lunch} onChange={e => setDietForm({...dietForm, lunch: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" />
                <input type="text" placeholder="Snack: Apple / Guava" value={dietForm.snack} onChange={e => setDietForm({...dietForm, snack: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" />
                <input type="text" placeholder="Dinner: Attar Roti, Lentil Soup" value={dietForm.dinner} onChange={e => setDietForm({...dietForm, dinner: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00D4B2] text-clinical-navy" />
              </div>

              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full bg-[#00D4B2] text-[#0A2540] text-xs font-bold py-3 rounded-xl uppercase tracking-wider shadow-sm transition-all hover:bg-opacity-90 cursor-pointer">Dispatch Interactive Chart</button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      {/* 4. ADHERENCE VIEW */}
      {activeTab === "adherence" && (
        <div className="max-w-xl animate-in fade-in duration-200">
          <SectionCard title="Log Compliance Scorecard" description="Submit progress scorecard metrics for patient check-ins.">
            <div className="space-y-5 p-2">
              <div>
                <label className="block text-xs font-semibold text-[#2D3A4A] uppercase tracking-wider mb-1">Patient MRN Selection</label>
                <input type="text" placeholder="Enter valid patient record ID..." className="w-full rounded-xl border border-slate-200 bg-[#F8F9FA] px-3 py-2.5 text-sm text-[#0A2540] outline-none focus:border-[#00D4B2] focus:bg-white" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#2D3A4A]">Adherence Rating</label>
                  <span className="text-xs font-bold text-[#0A2540] bg-[#00D4B2]/20 px-2 py-0.5 rounded-md">{score}% Compliance</span>
                </div>
                <input type="range" min="0" max="100" value={score} onChange={e => setScore(Number(e.target.value))} className="w-full h-1.5 rounded-lg bg-[#F8F9FA] appearance-none cursor-pointer accent-[#00D4B2]" />
              </div>
              <button type="button" className="rounded-xl bg-[#0A2540] text-white px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all hover:bg-opacity-90 cursor-pointer">Publish Adherence Performance</button>
            </div>
          </SectionCard>
        </div>
      )}
    </DashboardShell>
  );
}