"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileDown, Plus, Trash2, LayoutTemplate, Sparkles, HelpCircle } from 'lucide-react';
import { nutritionistApi } from '@/lib/nutritionist-api';

interface DietBuilderProps {
  patientId: string;
  onBack: () => void;
}

export default function DietBuilder({ patientId, onBack }: DietBuilderProps) {  
  // Database datasets state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [foodDb, setFoodDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);

  // Active form builder state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [planTitle, setPlanTitle] = useState('Custom Therapeutic Diet Plan');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [targetCalories, setTargetCalories] = useState(2000);
  const [specialNotes, setSpecialNotes] = useState('');
  const [conditionName, setConditionName] = useState('');
  const [language, setLanguage] = useState('en');
  
  // Structured slots containing food selections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [meals, setMeals] = useState<any[]>([
    { id: '1', slot: 'Breakfast', guidance: '', items: [{ foodId: '', grams: 100 }] },
    { id: '2', slot: 'Lunch', guidance: '', items: [{ foodId: '', grams: 150 }] }
  ]);

  // Live analytics counters
  const [liveTotals, setLiveTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const bootstrapBuilderData = async () => {
      try {
        const [templateList, foodItems] = await Promise.all([
          nutritionistApi.getTemplates(),
          nutritionistApi.getFoodItems().catch(() => []),
        ]);
        setTemplates(templateList);
        if (foodItems.length > 0) setFoodDb(foodItems);
      } catch (err) {
        console.error("Failed configuration payload fetch", err);
      } finally {
        setLoading(false);
      }
    };
    bootstrapBuilderData();
  }, []);

  // Compute live macro distributions whenever food item rows modify
  useEffect(() => {
    const recalculateMacros = () => {
      setCalculating(true);
      let cal = 0, prot = 0, carb = 0, fat = 0;

      meals.forEach((m: any) => {
        m.items.forEach((item: any) => {
          const match = foodDb.find((f: any) => f.id === item.foodId);
          if (match) {
            const factor = parseFloat(item.grams || 0) / 100;
            cal += match.calories * factor;
            prot += match.protein * factor;
            carb += match.carbs * factor;
            fat += match.fat * factor;
          }
        });
      });

      setLiveTotals({
        calories: Math.round(cal),
        protein: Math.round(prot),
        carbs: Math.round(carb),
        fat: Math.round(fat)
      });
      setCalculating(false);
    };

    recalculateMacros();
  }, [meals, foodDb]);

  const handleApplyTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;
    try {
      const template = await nutritionistApi.getTemplateById(templateId);
      setConditionName(template.condition_name);
      setPlanTitle(`Therapeutic Plan: ${template.condition_name}`);
      setTargetCalories(template.total_calories);

      if (template.meals && template.meals.length > 0) {
        setMeals(template.meals.map((m: any, idx: number) => {
          let foods: any[] = [];
          try { foods = JSON.parse(m.foods_json); } catch { foods = []; }
          return {
            id: `m${idx + 1}`,
            slot: m.meal_slot,
            guidance: m.preparation_guidance || '',
            items: foods.length > 0
              ? foods.map((f: any) => ({ foodId: f.food_id || '', grams: f.grams || 100 }))
              : [{ foodId: '', grams: 100 }],
          };
        }));
      }
    } catch (err) {
      console.error("Failed to load template", err);
    }
  };

  const updateFoodItem = (mealId: string, itemIndex: number, field: string, value: string) => {
    setMeals((prev: any[]) => prev.map((m: any) => {
      if (m.id !== mealId) return m;
      const updatedItems = [...m.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
      return { ...m, items: updatedItems };
    }));
  };

  const addFoodRow = (mealId: string) => {
    setMeals((prev: any[]) => prev.map((m: any) => m.id === mealId ? { ...m, items: [...m.items, { foodId: '', grams: 100 }] } : m));
  };

  const removeFoodRow = (mealId: string, itemIndex: number) => {
    setMeals((prev: any[]) => prev.map((m: any) => {
      if (m.id !== mealId) return m;
      return { ...m, items: m.items.filter((_: any, idx: number) => idx !== itemIndex) };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const plan = await nutritionistApi.createDietPlan({
        patient_id: patientId,
        title: planTitle,
        condition_name: conditionName || undefined,
        language,
        total_calories: targetCalories,
        notes: specialNotes || undefined,
        meals: meals.map((m: any) => ({
          meal_slot: m.slot,
          calories: undefined,
          preparation_guidance: m.guidance || undefined,
          foods: m.items
            .filter((i: any) => i.foodId)
            .map((i: any) => {
              const food = foodDb.find((f: any) => f.id === i.foodId);
              return {
                name: food?.name_en || 'Food Item',
                quantity: `${i.grams}g`,
                grams: parseInt(i.grams) || 100,
              };
            }),
        })),
      });
      setSavedPlanId(plan.id);
    } catch (err) {
      console.error("Failed to save diet plan", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (savedPlanId) {
      setExportingPdf(true);
      try {
        await nutritionistApi.downloadDietPlanPdf(savedPlanId);
      } catch (err) {
        console.error("PDF export failed", err);
      } finally {
        setExportingPdf(false);
      }
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading Canvas Configuration...</div>;

  return (
    <div className="space-y-6 bg-slate-50 p-6 min-h-screen">
      {/* Navigation and Actions row */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
          <ArrowLeft size={16} /> <span>Exit Chart Builder</span>
        </button>
        <div className="flex items-center space-x-2 self-end">
          <button onClick={handleExportPdf} disabled={!savedPlanId || exportingPdf} className="flex items-center space-x-1.5 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 px-3.5 py-2 rounded-lg shadow-sm text-slate-700 transition">
            <FileDown size={14} /> <span>{exportingPdf ? 'Downloading...' : 'Export Printable PDF'}</span>
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center space-x-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 px-3.5 py-2 rounded-lg shadow-sm text-white transition">
            <Save size={14} /> <span>{saving ? 'Saving...' : 'Save & Commit Chart'}</span>
          </button>
        </div>
      </div>

      {/* Grid Split layout canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Chart Data Parameters (ColSpan 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center"><LayoutTemplate size={16} className="text-blue-500 mr-2" /> Global Templates Blueprint Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-1">
                <label className="block text-slate-500 font-medium mb-1">Select Clinical Blueprint Condition</label>
                <select value={selectedTemplate} onChange={(e) => handleApplyTemplate(e.target.value)} title="Select Clinical Blueprint Condition"
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- No Blueprint (Build Scratch Manual) --</option>
                  {templates.map((t: any) => <option key={t.id} value={t.id}>{t.condition_name} ({t.total_calories} kcal)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Calorie Target Baseline</label>
                <input type="number" value={targetCalories} onChange={(e) => setTargetCalories(parseInt(e.target.value) || 0)}
                  placeholder="Enter calorie target" className="w-full border border-slate-200 p-2.5 rounded-lg text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="en">English</option>
                  <option value="bn">বাংলা</option>
                  <option value="both">Bilingual (English + বাংলা)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Meals Slots Management Stack */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Daily Meal Slots Framework</h3>
            
            {meals.map((meal) => (
              <div key={meal.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md">{meal.slot} Slot</span>
                  <button onClick={() => addFoodRow(meal.id)} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"><Plus size={14} className="mr-0.5" /> Add Food Row</button>
                </div>

                {/* Rows mapping */}
                <div className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {meal.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-center text-xs">
                      <div className="flex-1">
                        <select aria-label={`Select food item for ${meal.slot} slot row ${idx + 1}`} value={item.foodId} onChange={(e) => updateFoodItem(meal.id, idx, 'foodId', e.target.value)}
                          className="w-full border border-slate-200 p-2 rounded-lg bg-white font-medium text-slate-700 focus:outline-none">
                          <option value="">-- Choose Food Database Item --</option>
                          {foodDb.map(f => <option key={f.id} value={f.id}>{f.name_en} ({f.calories} kcal/100g)</option>)}
                        </select>
                      </div>
                      <div className="w-24 flex items-center space-x-1.5">
                        <input type="number" title="Enter quantity in grams" value={item.grams} onChange={(e) => updateFoodItem(meal.id, idx, 'grams', e.target.value)}
                          className="w-full border border-slate-200 p-2 rounded-lg text-center text-slate-800 font-semibold" />
                        <span className="text-slate-400">g</span>
                      </div>
                      {meal.items.length > 1 && (
                        <button type="button" aria-label={`Remove row ${idx + 1} from ${meal.slot} slot`} title={`Remove row ${idx + 1}`} onClick={() => removeFoodRow(meal.id, idx)} className="text-slate-300 hover:text-rose-600 p-1 transition">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Preparation Context block */}
                <div className="pt-2">
                  <input type="text" placeholder="Add preparation guidance, timings, or exclusions here..." value={meal.guidance}
                    onChange={(e) => {
                      const text = e.target.value;
                      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, guidance: text } : m));
                    }}
                    className="w-full text-xs text-slate-600 border-none bg-slate-50/70 placeholder-slate-400 p-2 rounded-lg focus:outline-none" />
                </div>
              </div>
            ))}
          </div>

          {/* Notes TextArea */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Chart Footer Special Instructions / Notes</label>
            <textarea rows={3} placeholder="Provide general lifestyle, hydration goals, or physical activity parameters..." value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full text-xs border border-slate-200 p-3 rounded-xl focus:outline-none text-slate-700 leading-relaxed" />
          </div>
        </div>

        {/* Right Side Sticky Panel: Real-time Analytics Tracker */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-xl space-y-6 lg:sticky lg:top-6">
          <div>
            <h3 className="font-semibold text-sm tracking-wide flex items-center text-blue-400"><Sparkles size={16} className="mr-2" /> Live Nutritional Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Asynchronous computation engine calculating data matrices per 100g factors.</p>
          </div>

          {/* Calorie Progress Ring Card */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-800/80 space-y-2">
            <div className="flex justify-between items-end text-xs">
              <span className="text-slate-400 font-medium">Energy Aggregation</span>
              <span className="font-mono text-sm font-bold text-blue-400">{liveTotals.calories} / <span className="text-slate-500">{targetCalories} kcal</span></span>
            </div>
            
            {/* Dynamic Progress Indicator Bar */}
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${Math.min((liveTotals.calories / (targetCalories || 1)) * 100, 100)}%` }} role="progressbar" title="Energy Aggregation Progress" aria-label="Energy Aggregation Progress" aria-valuenow={Math.round(Math.min((liveTotals.calories / (targetCalories || 1)) * 100, 100))} aria-valuemin={0} aria-valuemax={100} />
            </div>
          </div>

          {/* Macros Detailed Subgrid */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800/50">
              <p className="text-slate-400 font-medium">Protein</p>
              <p className="text-sm font-bold font-mono mt-0.5 text-emerald-400">{liveTotals.protein}g</p>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800/50">
              <p className="text-slate-400 font-medium">Carbs</p>
              <p className="text-sm font-bold font-mono mt-0.5 text-amber-400">{liveTotals.carbs}g</p>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800/50">
              <p className="text-slate-400 font-medium">Fats</p>
              <p className="text-sm font-bold font-mono mt-0.5 text-pink-400">{liveTotals.fat}g</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-start space-x-2">
            <HelpCircle size={14} className="mt-0.5 flex-shrink-0 text-slate-600" />
            <p className="leading-normal">Calculations dynamically fetch raw attributes from verified regional food databases mapped during runtime compilation.</p>
          </div>
        </div>

      </div>
    </div>
  );
}