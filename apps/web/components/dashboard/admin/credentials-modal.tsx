"use client";

import { useState } from "react";
import type { StaffRole } from "@/lib/admin-api";

interface Props {
  open: boolean;
  email: string;
  role: StaffRole;
  temporaryPassword: string;
  onClose: () => void;
}

export default function CredentialsModal({
  open,
  email,
  role,
  temporaryPassword,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(true);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200/60 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0A2540]">
                Credentials Generated
              </h2>
              <p className="text-xs text-[#2D3A4A]">
                Temporary password — this will only be shown once
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] hover:text-[#0A2540]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-xl border border-[#00D4B2]/20 bg-[#00D4B2]/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                  Email
                </span>
                <span className="text-sm font-semibold text-[#0A2540]">
                  {email}
                </span>
              </div>
              <span className="rounded-full bg-[#0A2540] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#00D4B2]">
                {role}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                Temporary Password
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm font-bold tracking-wider text-[#0A2540]">
                  {hidden ? "•".repeat(temporaryPassword.length) : temporaryPassword}
                </code>
                <button
                  onClick={() => setHidden((v) => !v)}
                  aria-label={hidden ? "Show password" : "Hide password"}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {hidden ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
                <button
                  onClick={copy}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
                  aria-label="Copy password"
                >
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 px-4 py-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-xs leading-snug text-[#2D3A4A]">
              Save this password now. It will never be shown again. The staff
              member will be prompted to change it on their first login.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200/60 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
