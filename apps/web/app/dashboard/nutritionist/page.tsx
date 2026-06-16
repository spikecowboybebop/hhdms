"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import {
  SectionCard,
  StatCard,
} from "@/components/dashboard/dashboard-cards";
import {
  dashboardPathForRole,
  loadSession,
  type StoredSession,
} from "@/lib/auth";

interface MacroSplit {
  label: string;
  grams: number;
  calories: number;
  color: string;
}

interface DietPlan {
  patient: string;
  condition: string;
  totalCalories: number;
  macros: MacroSplit[];
  bmi: number;
  adherence: number;
}

const dietPlan: DietPlan = {
  patient: "Roksana Akter",
  condition: "Type 2 Diabetes • Hypertension",
  totalCalories: 1800,
  bmi: 27.4,
  adherence: 84,
  macros: [
    { label: "Carbohydrate", grams: 225, calories: 900, color: "#00D4B2" },
    { label: "Protein", grams: 90, calories: 360, color: "#0A2540" },
    { label: "Fat", grams: 60, calories: 540, color: "#FF9900" },
  ],
};

const bangladeshiMeals = [
  {
    slot: "Breakfast (07:30)",
    items: [
      "Ruti (1 pc) — 80g",
      "Mixed vegetable sabzi — 100g",
      "Boiled egg (1) — 50g",
      "Unsweetened tea",
    ],
    calories: 320,
  },
  {
    slot: "Mid-morning (10:30)",
    items: ["Roasted chana — 30g", "Cucumber — 100g"],
    calories: 130,
  },
  {
    slot: "Lunch (13:00)",
    items: [
      "Steamed rice (brown) — 150g cooked",
      "Chicken curry (lean) — 80g",
      "Dal (masoor) — 100g",
      "Mixed greens — 80g",
    ],
    calories: 540,
  },
  {
    slot: "Snack (16:30)",
    items: ["Seasonal fruit (guava/papaya) — 150g"],
    calories: 90,
  },
  {
    slot: "Dinner (20:00)",
    items: [
      "Steamed rice — 100g cooked",
      "Fish curry (rui) — 100g",
      "Vegetable stir-fry — 120g",
      "Dal — 80g",
    ],
    calories: 480,
  },
];

const navItems: DashboardNavItem[] = [
  {
    label: "Metabolic Console",
    href: "/dashboard/nutritionist",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9" />
        <polyline points="3 4 3 12 11 12" />
      </svg>
    ),
  },
  {
    label: "Meal Plans",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    ),
  },
  {
    label: "BD Food Database",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6M12 22v-6M2 12h6M22 12h-6" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    label: "Adherence Reports",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Consults",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function NutritionistDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "NUTRITIONIST") {
      router.replace(dashboardPathForRole(s.user.role));
    }
  }, [router]);

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">
            Authenticating session…
          </span>
        </div>
      </main>
    );
  }

  if (!session) return null;

  const macroTotalCalories = dietPlan.macros.reduce(
    (acc, m) => acc + m.calories,
    0,
  );

  return (
    <DashboardShell
      role={session.user.role}
      accent="amber"
      navItems={navItems}
      pageTitle="Metabolic & Diet Optimization Engine"
      pageSubtitle="Bangladeshi-aware macro allocation and adherence telemetry"
    >
      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Plans"
          value="38"
          delta="+4 this week"
          trend="up"
          accent="teal"
        />
        <StatCard
          label="Avg Adherence"
          value="84%"
          delta="+6% vs. last week"
          trend="up"
          accent="amber"
        />
        <StatCard
          label="Daily Avg Calories"
          value="1,820 kcal"
          delta="Within ±50 of plan"
          trend="flat"
          accent="navy"
        />
        <StatCard
          label="BD Food Items"
          value="1,240"
          delta="Curated dataset"
          trend="flat"
          accent="slate"
        />
      </div>

      {/* Plan overview */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Active Plan"
          description={`${dietPlan.patient} • ${dietPlan.condition}`}
          className="lg:col-span-2"
          action={
            <button className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-md">
              Adjust Plan
            </button>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                Target
              </span>
              <span className="mt-1 block text-xl font-bold text-[#0A2540]">
                {dietPlan.totalCalories} kcal
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                BMI
              </span>
              <span className="mt-1 block text-xl font-bold text-[#0A2540]">
                {dietPlan.bmi}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                Adherence
              </span>
              <span className="mt-1 block text-xl font-bold text-[#00D4B2]">
                {dietPlan.adherence}%
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
              Macro Allocation (Bangladesh-aware)
            </span>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F8F9FA]">
              {dietPlan.macros.map((m) => (
                <div
                  key={m.label}
                  style={{
                    width: `${(m.calories / macroTotalCalories) * 100}%`,
                    backgroundColor: m.color,
                  }}
                  className="h-full"
                  title={`${m.label}: ${m.calories} kcal`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {dietPlan.macros.map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="font-semibold text-[#0A2540]">
                    {m.label}
                  </span>
                  <span className="font-mono text-[10px] text-[#2D3A4A]">
                    {m.grams}g • {m.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Adherence Timeline" description="Last 7 days">
          <div className="flex h-32 items-end gap-2">
            {[78, 82, 91, 74, 88, 84, 86].map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#0A2540] to-[#00D4B2]"
                  style={{ height: `${v}%` }}
                />
                <span className="text-[9px] font-mono text-[#2D3A4A]">
                  {["M", "T", "W", "T", "F", "S", "S"][i]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3">
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                Weekly Streak
              </span>
              <span className="text-lg font-bold text-[#0A2540]">5 days ≥ 80%</span>
            </div>
            <span className="text-2xl">🔥</span>
          </div>
        </SectionCard>
      </div>

      {/* Daily meal structure */}
      <div className="mt-6">
        <SectionCard
          title="Daily Meal Structure"
          description="Bangladesh-tailored 5-slot distribution"
          action={
            <button className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-[11px] font-semibold text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540]">
              Export PDF
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {bangladeshiMeals.map((meal) => (
              <div
                key={meal.slot}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#00D4B2]">
                    {meal.slot}
                  </span>
                  <span className="rounded-full bg-[#FF9900]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#FF9900]">
                    {meal.calories} kcal
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {meal.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs text-[#2D3A4A]"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0A2540]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
