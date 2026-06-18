"use client";

import type { ReferralChainEvent } from "@/lib/mbbs-api";

interface Props {
  events: ReferralChainEvent[];
}

const stepIcons: Record<string, string> = {
  CALL_CENTER: "📞",
  VITAL_SIGNS: "🩺",
  DIAGNOSIS: "📋",
  TEST_ORDER: "🧪",
  REFERRAL: "🏥",
  PRESCRIPTION: "💊",
  EMERGENCY_FLAG: "🚨",
};

export function ReferralChainTimeline({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <p className="text-xs text-[#2D3A4A] italic">
        No care chain events recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative ml-3 border-l-2 border-slate-200">
      {events.map((evt, i) => (
        <li key={evt.id || i} className="mb-6 ml-6 last:mb-0">
          <span className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-slate-200 text-xs">
            {stepIcons[evt.step_type] || "📌"}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <time className="text-[10px] font-mono uppercase tracking-widest text-[#2D3A4A]">
                {evt.created_at ? new Date(evt.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
              </time>
              <span className="text-xs font-semibold text-[#0A2540]">
                {evt.step_label}
              </span>
              {evt.step_type === 'EMERGENCY_FLAG' && (
                <span className="rounded-full bg-[#FF9900]/10 px-2 py-0.5 text-[9px] font-bold text-[#FF9900]">
                  ACTIVE
                </span>
              )}
            </div>
            {evt.actor_role && (
              <span className="text-[11px] text-[#2D3A4A]">
                By: {evt.actor_role.replace(/_/g, ' ')}
              </span>
            )}
            {evt.notes && (
              <p className="text-[11px] text-[#2D3A4A] leading-relaxed bg-[#F8F9FA] rounded-lg p-2">
                {evt.notes}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
