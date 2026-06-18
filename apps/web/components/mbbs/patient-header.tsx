"use client";

import type { Patient } from "@/lib/mbbs-api";

interface Props {
  patient: Patient;
}

export function PatientHeader({ patient }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-200/60 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold tracking-tight text-[#0A2540]">
              {patient.first_name_en} {patient.last_name_en}
            </h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#2D3A4A]">
                MRN: {patient.mrn}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[11px] text-[#2D3A4A]">
                {patient.sex === 'M' ? 'Male' : 'Female'}, {patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'N/A'} yrs
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[11px] text-[#2D3A4A]">
                {patient.blood_group || 'Blood: N/A'}
              </span>
            </div>
          </div>
          {patient.has_emergency_flag && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF9900]/30 bg-[#FF9900]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FF9900]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9900] animate-pulse" />
              Emergency
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
        <InfoTile label="Phone" value={patient.phone_number || 'N/A'} />
        <InfoTile label="Email" value={patient.email || 'N/A'} />
        <InfoTile label="Address" value={[patient.address_line1, patient.district].filter(Boolean).join(', ') || 'N/A'} />
        <InfoTile label="Emergency Contact" value={patient.emergency_contact || 'N/A'} />
      </div>
      {(patient.known_allergies || patient.current_medications || patient.past_medical_history) && (
        <div className="border-t border-slate-200/60 px-5 py-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {patient.known_allergies && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#FF9900] mb-1">
                Allergies
              </span>
              <p className="text-xs text-[#2D3A4A]">{patient.known_allergies}</p>
            </div>
          )}
          {patient.current_medications && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#00D4B2] mb-1">
                Current Medications
              </span>
              <p className="text-xs text-[#2D3A4A]">{patient.current_medications}</p>
            </div>
          )}
          {patient.past_medical_history && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
                Past History
              </span>
              <p className="text-xs text-[#2D3A4A]">{patient.past_medical_history}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
        {label}
      </span>
      <span className="text-xs font-medium text-[#0A2540]">
        {value}
      </span>
    </div>
  );
}

function calculateAge(dateStr: string): number {
  const dob = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
