"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Heart, ShieldAlert, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PatientFileProps {
  patientId: string;
  onBack: () => void;
}

export default function PatientFile({ patientId, onBack }: PatientFileProps) {
  // History and clinical context states
  const [history, setHistory] = useState<any>(null);
  const [adherenceLogs, setAdherenceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Anthropometrics form calculator state
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState(''); // in cm
  const [bmiResult, setBmiResult] = useState<{ bmi: number; category: string } | null>(null);
  const [submittingAntro, setSubmittingAntro] = useState(false);

  useEffect(() => {
    // Simultaneously pull patient profile, health records, and previous progress logs
    const loadPatientRecords = async () => {
      try {
        // Mock data structures corresponding exactly to your database models
        setHistory({
          patient: { name: 'Rahima Begum', mrn: 'HHDMS-20260704-8841', age: 54, sex: 'Female' },
          allergies: ['Shrimp', 'Peanuts'],
          current_medications: ['Metformin 500mg', 'Atorvastatin 10mg'],
          past_medical_history: 'Diagnosed with Type 2 Diabetes in 2021. Mild fatty liver disease reported.'
        });

        setAdherenceLogs([
          { id: '1', logged_at: '2026-07-02', compliance_percentage: 90, status: 'EXCELLENT' },
          { id: '2', logged_at: '2026-06-25', compliance_percentage: 75, status: 'ADHERENT' },
          { id: '3', logged_at: '2026-06-18', compliance_percentage: 50, status: 'LAPSING' }
        ]);
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
    const h = parseFloat(height) / 100; // Convert cm to meters

    if (w > 0 && h > 0) {
      const bmi = parseFloat((w / (h * h)).toFixed(1));
      let category = 'Normal';
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi >= 25 && bmi < 30) category = 'Overweight';
      else if (bmi >= 30) category = 'Obese';
      
      setBmiResult({ bmi, category });
    } else {
      setBmiResult(null);
    }
  }, [weight, height]);

  const handleSaveAnthropometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bmiResult) return;
    setSubmittingAntro(true);
    try {
      // POST payload to /nutritionist/anthropometrics matching your CreateAnthropometricRecordDto
      alert(`Recorded successfully: BMI ${bmiResult.bmi} (${bmiResult.category})`);
      setWeight('');
      setHeight('');
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
          <h2 className="text-xl font-bold text-slate-900 mt-1">{history?.patient.name}</h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{history?.patient.mrn} • {history?.patient.age} Yrs • {history?.patient.sex}</p>
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
                <p className="text-rose-700 font-medium">{history?.allergies.join(', ') || 'No known nutritional exclusions.'}</p>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <p className="font-semibold text-blue-800 flex items-center mb-1"><Activity size={14} className="mr-1" /> Active Medications</p>
                <p className="text-blue-700 font-medium">{history?.current_medications.join(', ')}</p>
              </div>
            </div>

            <div className="text-xs space-y-1 pt-2">
              <p className="font-semibold text-slate-500 uppercase tracking-wide">Historical Baseline Evaluation</p>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 border border-slate-200 rounded-lg">{history?.past_medical_history}</p>
            </div>
          </div>

          {/* Adherence Logs History Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-3">Patient Diet Adherence Timeline</h3>
            <div className="space-y-2.5">
              {adherenceLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className={log.status === 'EXCELLENT' ? 'text-emerald-500' : 'text-blue-500'} />
                    <span className="font-medium text-slate-700">{log.logged_at}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-slate-500">Compliance: <strong className="text-slate-800">{log.compliance_percentage}%</strong></span>
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      log.status === 'LAPSING' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>{log.status}</span>
                  </div>
                </div>
              ))}
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
              <input type="number" placeholder="e.g., 72" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" required />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Measured Stature Height (cm)</label>
              <input type="number" placeholder="e.g., 165" value={height} onChange={(e) => setHeight(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" required />
            </div>

            {/* Live Real-Time Computational Category Output Box */}
            {bmiResult && (
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