"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Apple, FileText, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import {
  dashboardPathForRole,
  loadSession,
  type StoredSession,
} from "@/lib/auth";
import { nutritionistApi } from '@/lib/nutritionist-api';
import PatientFile from './components/PatientFile';
import DietBuilder from './components/DietBuilder';

type View = 'dashboard' | 'patient-file' | 'diet-builder';

const navItems: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard/nutritionist",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "Diet Plans",
    href: "/dashboard/nutritionist",
    icon: <Apple size={18} />,
  },
  {
    label: "Patients",
    href: "/dashboard/nutritionist",
    icon: <Users size={18} />,
  },
];

export default function NutritionistDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [metrics, setMetrics] = useState({ activePlans: 0, upcomingFollowUps: 0, foodItems: 0, templates: 0 });
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/signin");
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    const fetchDashboardData = async () => {
      try {
        const [dashboard, patientList] = await Promise.all([
          nutritionistApi.getDashboard(),
          nutritionistApi.getPatients(),
        ]);
        setMetrics({
          activePlans: dashboard.active_plans,
          upcomingFollowUps: dashboard.upcoming_follow_ups,
          foodItems: dashboard.food_items,
          templates: dashboard.templates,
        });
        setPatients(patientList.map(p => ({
          id: p.id,
          mrn: p.mrn,
          name: `${p.first_name_en} ${p.last_name_en}`,
          condition: 'Active',
          status: 'Active',
        })));
      } catch (err) {
        console.error("Failed loading dashboard metrics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [session]);

  const openPatientFile = (patientId: string) => {
    setSelectedPatientId(patientId);
    setView('patient-file');
  };

  const openDietBuilder = (patientId: string) => {
    setSelectedPatientId(patientId);
    setView('diet-builder');
  };

  const backToDashboard = () => {
    setView('dashboard');
    setSelectedPatientId(null);
  };

  if (!session) return null;

  return (
    <DashboardShell
      role={session.user.role}
      accent="teal"
      navItems={navItems}
      pageTitle="Nutritionist Dashboard"
      pageSubtitle="Manage patient medical diets and nutritional care"
    >
      {view === 'patient-file' && selectedPatientId ? (
        <PatientFile patientId={selectedPatientId} onBack={backToDashboard} onOpenDietBuilder={openDietBuilder} />
      ) : view === 'diet-builder' && selectedPatientId ? (
        <DietBuilder patientId={selectedPatientId} onBack={backToDashboard} />
      ) : loading ? (
        <div className="text-slate-500 animate-pulse">Loading Clinical Workspace...</div>
      ) : (
        <>
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Apple size={24} /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase">Active Diet Plans</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{metrics.activePlans}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Calendar size={24} /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase">Follow-ups Pending</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{metrics.upcomingFollowUps}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={24} /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase">Verified Foods DB</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{metrics.foodItems}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><FileText size={24} /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase">Diet Templates</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{metrics.templates}</p>
              </div>
            </div>
          </div>

          {/* Main Panel Content Split */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Active Patients Roster */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Assigned Case Load</h3>
                <button className="text-xs font-medium text-blue-600 flex items-center hover:underline">View All Patients <ArrowUpRight size={14} className="ml-0.5" /></button>
              </div>
              <div className="divide-y divide-slate-100">
                {patients.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400">No patients assigned yet. Create a diet plan to get started.</div>
                )}
                {patients.map((patient: any) => (
                  <div key={patient.id} className="p-4 hover:bg-slate-50/70 transition flex justify-between items-center">
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-800 text-sm">{patient.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{patient.mrn} • <span className="text-slate-500 font-sans">{patient.condition}</span></p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        patient.status === 'Lapsing' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>{patient.status}</span>
                      <button onClick={() => openDietBuilder(patient.id)}
                        className="text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-blue-700 font-medium transition">
                        Diet Plan
                      </button>
                      <button onClick={() => openPatientFile(patient.id)}
                        className="text-xs border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-medium transition">
                        Open File
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Follow-up Action List */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-slate-800">Today&apos;s Reminders</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <Clock size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-amber-800">Review Rahima Begum (2 Weeks)</p>
                    <p className="text-amber-600 mt-0.5">Bi-weekly weight update due for macro assessment adjustments.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <CheckCircle size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-700">Adherence Log Logged</p>
                    <p className="text-slate-500 mt-0.5">Tamim Iqbal checked in: 85% breakfast meal target accuracy.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
