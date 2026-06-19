// apps/web/app/dashboard/nutritionist/diet-plan/page.tsx
"use client";

import { useState } from "react";

export default function DietPlanBuilderPage() {
  const [patientId, setPatientId] = useState("");
  const [targetCalories, setTargetCalories] = useState("1800");
  const [meals, setMeals] = useState([{ slot: "Breakfast", items: "" }]);

  const handleAddMeal = () => setMeals([...meals, { slot: "", items: "" }]);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm max-w-2xl">
      <h2 className="text-lg font-bold text-[#0A2540] mb-2">Create Customized Diet Chart</h2>
      <p className="text-xs text-[#2D3A4A] mb-6">Build specific caloric distribution maps for patients.</p>
      
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#2D3A4A] mb-1">Patient Identifier</label>
            <input type="text" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" value={patientId} onChange={e => setPatientId(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#2D3A4A] mb-1">Target Calories (kcal)</label>
            <input type="number" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" value={targetCalories} onChange={e => setTargetCalories(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold uppercase text-[#0A2540] mb-3">Meal Items Configuration</h3>
          {meals.map((meal, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-3 mb-3">
              <input 
                type="text" 
                placeholder="Meal Slot (e.g., Lunch)" 
                className="col-span-1 rounded-xl border border-slate-200 p-2 text-sm"
                value={meal.slot}
                onChange={e => {
                  const updated = [...meals];
                  updated[idx]!.slot = e.target.value;
                  setMeals(updated);
                }}
              />
              <input 
                type="text" 
                placeholder="Items (e.g., Rice, Fish, Lentils)" 
                className="col-span-2 rounded-xl border border-slate-200 p-2 text-sm"
                value={meal.items}
                onChange={e => {
                  const updated = [...meals];
                  updated[idx]!.items = e.target.value;
                  setMeals(updated);
                }}
              />
            </div>
          ))}
          <button onClick={handleAddMeal} className="text-xs font-bold text-[#00D4B2] hover:underline">+ Add Another Meal Slot</button>
        </div>

        <button className="mt-4 rounded-xl bg-[#0A2540] text-white py-2.5 text-sm font-semibold hover:bg-[#0A2540]/90">
          Publish and Sync Diet Plan
        </button>
      </div>
    </div>
  );
}