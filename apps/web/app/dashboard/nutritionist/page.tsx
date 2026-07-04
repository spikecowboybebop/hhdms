"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell"; // Adjust import if needed

const STEPS = [
  { id: 1, title: "Patient & Vitals", description: "Record MRN and anthropometrics" },
  { id: 2, title: "Diet Plan", description: "Build caloric distribution map" },
  { id: 3, title: "Adherence", description: "Log compliance scorecard" },
];

export default function NutritionistDiagnosticWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Shared State (Passes down the pipeline)
  const [patientId, setPatientId] = useState("");

  // Step 1: Metrics State
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // Step 2: Diet Plan State
  const [targetCalories, setTargetCalories] = useState("1800");
  const [meals, setMeals] = useState([{ slot: "Breakfast", items: "" }]);

  // Step 3: Adherence State
  const [score, setScore] = useState(85);

  // Handlers
  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  const handleAddMeal = () => setMeals([...meals, { slot: "", items: "" }]);

  return (
    <DashboardShell
      role="NUTRITIONIST"
      accent="teal"
      navItems={[]} // Add your nav items back here if needed
      pageTitle="Clinical Diagnosis Flow"
      pageSubtitle="Sequential diagnostic and dietary planning workspace."
    >
      <div className="mx-auto max-w-4xl animate-in fade-in duration-300">
        
        {/* --- STEPPER PROGRESS BAR --- */}
        <div className="mb-8 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between relative">
            {/* Background Line */}
            <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-slate-100 z-0"></div>
            {/* Active Line */}
            <div 
              className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-[#00D4B2] transition-all duration-500 z-0"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>

            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                    isActive ? "border-[#0A2540] bg-[#0A2540] text-white" : 
                    isCompleted ? "border-[#00D4B2] bg-[#00D4B2] text-white" : 
                    "border-slate-200 bg-white text-slate-400"
                  }`}>
                    {isCompleted ? "✓" : step.id}
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-bold uppercase ${isActive || isCompleted ? "text-[#0A2540]" : "text-slate-400"}`}>{step.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- WORKSPACE AREA --- */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 md:p-8 shadow-sm min-h-[400px] flex flex-col">
          
          {/* STEP 1: VITALS */}
          {currentStep === 1 && (
            <div className="space-y-6 flex-grow animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-[#0A2540]">Patient & Vitals</h2>
                <p className="text-sm text-slate-500 mt-1">Log physical diagnostic trends (NU-003).</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-[#2D3A4A] mb-2">Patient ID / MRN</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="e.g., P-10928"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-[#00D4B2] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#2D3A4A] mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="72.5"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-[#00D4B2] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#2D3A4A] mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="170"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-[#00D4B2] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DIET PLAN */}
          {currentStep === 2 && (
            <div className="space-y-6 flex-grow animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-[#0A2540]">Customized Diet Chart</h2>
                <p className="text-sm text-slate-500 mt-1">Build specific caloric distribution maps.</p>
              </div>
              <div className="flex flex-col gap-6 max-w-2xl">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#2D3A4A] mb-2">Target Calories (kcal)</label>
                  <input 
                    type="number" 
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-[#00D4B2] outline-none" 
                  />
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold uppercase text-[#0A2540] mb-3">Meal Configuration</h3>
                  {meals.map((meal, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 mb-3">
                      <input 
                        type="text" 
                        placeholder="Meal Slot" 
                        value={meal.slot}
                        onChange={(e) => {
                          const updated = [...meals];
                          updated[idx]!.slot = e.target.value;
                          setMeals(updated);
                        }}
                        className="col-span-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-[#00D4B2] outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Items (e.g., Rice, Fish)" 
                        value={meal.items}
                        onChange={(e) => {
                          const updated = [...meals];
                          updated[idx]!.items = e.target.value;
                          setMeals(updated);
                        }}
                        className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-[#00D4B2] outline-none"
                      />
                    </div>
                  ))}
                  <button onClick={handleAddMeal} className="text-xs font-bold text-[#00D4B2] hover:underline mt-2">
                    + Add Meal Slot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADHERENCE */}
          {currentStep === 3 && (
            <div className="space-y-6 flex-grow animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-[#0A2540]">Log Adherence</h2>
                <p className="text-sm text-slate-500 mt-1">Submit progress scorecard (NU-006).</p>
              </div>
              <div className="flex flex-col gap-6 max-w-xl">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#2D3A4A]">Performance Score</label>
                    <span className="text-xs font-bold text-[#0A2540] bg-[#00D4B2]/20 px-2 py-1 rounded-md">
                      {score}% Compliance
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full h-2 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-[#00D4B2]" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- NAVIGATION CONTROLS --- */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Back
            </button>
            
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                className="rounded-xl bg-[#0A2540] text-white px-6 py-2.5 text-sm font-bold transition-all hover:bg-[#0A2540]/90 shadow-sm"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={() => alert("Ready to submit to the API!")}
                className="rounded-xl bg-[#00D4B2] text-white px-6 py-2.5 text-sm font-bold transition-all hover:bg-[#00D4B2]/90 shadow-sm"
              >
                Save & Complete Diagnosis
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
