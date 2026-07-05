"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Heart, ShieldAlert, Scale, CheckCircle2, AlertTriangle, FlaskConical, Stethoscope } from 'lucide-react';
import { nutritionistApi, type MedicalHistory, type AdherenceLog } from '@/lib/nutritionist-api';

interface PatientFileProps {
  patientId: string;
  onBack: () => void;
  onOpenDietBuilder?: (patientId: string) => void;
}

export default function PatientFile({ patientId, onBack, onOpenDietBuilder }: PatientFileProps) {
  // History and clinical context states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<MedicalHistory | null>(null);
  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Anthropometrics form calculator state
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState(''); // in cm
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [bmiResult, setBmiResult] = useState<{ bmi: number; category: string; idealBodyWeight?: number | null; caloricNeeds?: { basal: number; total: number } | null } | null>(null);
  const [submittingAntro, setSubmittingAntro] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savedRecord, setSavedRecord] = useState<any>(null);

  useEffect(() => {
    const loadPatientRecords = async () => {
      try {
        const [medHistory, adherence] = await Promise.all([
          nutritionistApi.getPatientMedicalHistory(patientId),
          nutritionistApi.getAdherenceLogs(patientId),
        ]);
        setHistory(medHistory);
        setAdherenceLogs(adherence);
      } catch (err) {
        console.error("Error pulling history layers", err);
      } finally {
        setLoading(false);
      }
    };
    loadPatientRecords();
  }, [patientId]);

  // Live computation block triggered on input updates
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;

    if (w > 0 && h > 0) {
      const bmi = parseFloat((w / (h * h)).toFixed(1));
      let category = 'Normal';
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi >= 25 && bmi < 30) category = 'Overweight';
      else if (bmi >= 30) category = 'Obese';

      const heightCm = parseFloat(height);
      let idealBodyWeight: number | null = null;
      if (heightCm > 0 && history?.patient?.sex) {
        if (history.patient.sex === 'M') {
          idealBodyWeight = Math.round(50 + 2.3 * ((heightCm - 152.4) / 2.54));
        } else {
          idealBodyWeight = Math.round(45.5 + 2.3 * ((heightCm - 152.4) / 2.54));
        }
        if (idealBodyWeight < 0) idealBodyWeight = null;
      }

      setBmiResult({ bmi, category, idealBodyWeight, caloricNeeds: null });
    } else {
      setBmiResult(null);
    }
  }, [weight, height, history]);

  const handleSaveAnthropometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bmiResult) return;
    setSubmittingAntro(true);
    try {
      const record = await nutritionistApi.recordAnthropometrics({
        patient_id: patientId,
        height_cm: parseFloat(height) || undefined,
        weight_kg: parseFloat(weight) || undefined,
        waist_cm: parseFloat(waist) || undefined,
        hip_cm: parseFloat(hip) || undefined,
      });
      setSavedRecord(record);
      setWeight('');
      setHeight('');
      setWaist('');
      setHip('');
      setBmiResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAntro(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading Clinical Medical Charts...</div>;

  return (
    <div className="space-y-6 bg-slate-50 p-6 min-h-screen">
      {/* Structural Navigation Row */}
      <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> <span>Back to Dashboard</span>
      </button>

      {/* Patient Meta Flag */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">Patient File</span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{history?.patient.first_name_en} {history?.patient.last_name_en}</h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{history?.patient.mrn} • {history?.patient.sex === 'M' ? 'Male' : 'Female'}</p>
        </div>
        <div className="flex items-center space-x-2">
          {onOpenDietBuilder && (
            <button onClick={() => onOpenDietBuilder(patientId)}
              className="text-xs border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg text-blue-700 font-medium transition shadow-sm">
              Create Diet Plan
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Column: Medical History Canvas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center border-b border-slate-100 pb-3">
              <Heart size={18} className="text-rose-500 mr-2" /> Clinical Manifestations & Diagnostics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100">
                <p className="font-semibold text-rose-800 flex items-center mb-1"><ShieldAlert size={14} className="mr-1" /> Allergies / Contradictions</p>
                <p className="text-rose-700 font-medium">{history?.patient?.known_allergies || 'No known nutritional exclusions.'}</p>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <p className="font-semibold text-blue-800 flex items-center mb-1"><Activity size={14} className="mr-1" /> Active Medications</p>
                <p className="text-blue-700 font-medium">{history?.patient?.current_medications || 'None recorded'}</p>
              </div>
            </div>

            <div className="text-xs space-y-1 pt-2">
              <p className="font-semibold text-slate-500 uppercase tracking-wide">Historical Baseline Evaluation</p>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 border border-slate-200 rounded-lg">{history?.patient?.past_medical_history || 'No history recorded'}</p>
            </div>

            {/* Diagnoses */}
            {history?.diagnoses && history.diagnoses.length > 0 && (
              <div className="pt-2">
                <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center"><Stethoscope size={14} className="mr-1" /> Diagnoses</p>
                <div className="space-y-1.5">
                  {history.diagnoses.map((d: any) => (
                    <div key={d.id} className="text-xs bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 flex justify-between">
                      <div>
                        <span className="font-semibold text-indigo-800">{d.preliminary_diagnosis}</span>
                        <span className="text-indigo-500 ml-2">({d.icd10_code})</span>
                        {d.is_primary && <span className="ml-2 bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">Primary</span>}
                      </div>
                      {d.doctor && <span className="text-indigo-400">{d.doctor}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lab Results */}
            {history?.lab_results && (
              <div className="pt-2">
                <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center"><FlaskConical size={14} className="mr-1" /> Lab Results</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['kidney_function', 'glucose', 'lipids'] as const).map((category) => {
                    const results = history.lab_results[category];
                    if (!results || results.length === 0) return null;
                    return (
                      <div key={category} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <p className="font-bold text-slate-600 uppercase text-[10px] mb-1">
                          {category === 'kidney_function' ? 'Kidney' : category === 'glucose' ? 'Glucose' : 'Lipids'}
                        </p>
                        {results.map((r: any, i: number) => (
                          <div key={i} className="text-[11px] text-slate-700 flex justify-between py-0.5">
                            <span>{r.test_name}</span>
                            <span className="font-mono font-semibold">{r.result || '—'}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specialist Notes */}
            {history?.specialist_notes && history.specialist_notes.length > 0 && (
              <div className="pt-2">
                <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2">Specialist Referrals & Notes</p>
                <div className="space-y-1.5">
                  {history.specialist_notes.map((n: any) => (
                    <div key={n.id} className="text-xs bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                      <div className="flex justify-between">
                        <span className="font-semibold text-amber-800">{n.specialty_code}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          n.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>{n.status}</span>
                      </div>
                      {n.clinical_summary && <p className="text-amber-700 mt-1">{n.clinical_summary}</p>}
                      {n.response_notes && <p className="text-amber-600 mt-0.5 italic">Response: {n.response_notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Adherence Logs History Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-3">Patient Diet Adherence Timeline</h3>
            <div className="space-y-2.5">
              {adherenceLogs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No adherence logs recorded yet.</p>
              )}
              {adherenceLogs.map((log) => {
                const score = log.adherence_score;
                const status = score >= 85 ? 'EXCELLENT' : score >= 65 ? 'ADHERENT' : 'LAPSING';
                return (
                  <div key={log.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={15} className={status === 'EXCELLENT' ? 'text-emerald-500' : status === 'ADHERENT' ? 'text-blue-500' : 'text-rose-500'} />
                      <span className="font-medium text-slate-700">{new Date(log.logged_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-slate-500">Compliance: <strong className="text-slate-800">{score}%</strong></span>
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        status === 'LAPSING' ? 'bg-rose-50 text-rose-600' : status === 'ADHERENT' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>{status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side Column: Real-time Anthropometrics Calculator */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center border-b border-slate-100 pb-3">
            <Scale size={18} className="text-blue-600 mr-2" /> Live Anthropometric Engine (NU-003)
          </h3>
          <form onSubmit={handleSaveAnthropometrics} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Current Weight (kg)</label>
              <input type="number" step="0.1" placeholder="e.g., 72" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Measured Stature Height (cm)</label>
              <input type="number" step="0.1" placeholder="e.g., 165" value={height} onChange={(e) => setHeight(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Waist (cm)</label>
                <input type="number" step="0.1" placeholder="e.g., 85" value={waist} onChange={(e) => setWaist(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Hip (cm)</label>
                <input type="number" step="0.1" placeholder="e.g., 100" value={hip} onChange={(e) => setHip(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
              </div>
            </div>

            {/* Live Real-Time Computational Category Output Box */}
            {bmiResult && (
              <div className="space-y-2">
                <div className={`p-4 rounded-lg border flex items-start space-x-3 transition duration-150 ${
                  bmiResult.category === 'Obese' || bmiResult.category === 'Underweight' 
                    ? 'bg-rose-50 border-rose-100 text-rose-800' 
                    : bmiResult.category === 'Overweight' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                }`}>
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Calculated BMI: {bmiResult.bmi}</p>
                    <p className="font-medium mt-0.5">Classification: {bmiResult.category}</p>
                  </div>
                </div>
                {bmiResult.idealBodyWeight !== null && bmiResult.idealBodyWeight !== undefined && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
                    <span className="font-medium text-blue-700">Ideal Body Weight: </span>
                    <span className="font-bold text-blue-800">{bmiResult.idealBodyWeight} kg</span>
                  </div>
                )}
              </div>
            )}

            {savedRecord && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
                Recorded successfully! BMI: {savedRecord.bmi} ({savedRecord.bmi_category})
              </div>
            )}

            <button type="submit" disabled={!bmiResult || submittingAntro}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-medium py-2.5 rounded-lg shadow-sm transition">
              {submittingAntro ? 'Saving Logs...' : 'Log Anthropometrics'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}