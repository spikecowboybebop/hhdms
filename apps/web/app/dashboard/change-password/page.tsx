"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  dashboardPathForRole,
  loadSession,
  persistSession,
} from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/signin");
      return;
    }
    if (session.user.require_password_change !== true) {
      router.replace(dashboardPathForRole(session.user.role));
      return;
    }
    setRedirect(dashboardPathForRole(session.user.role));
    setHydrated(true);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    const session = loadSession();
    if (!session) {
      router.replace("/signin");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to change password.");
      }

      session.user.require_password_change = false;
      persistSession(session);
      setSuccess(true);
      setTimeout(() => router.replace(redirect || "/dashboard"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">Checking session…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/60 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A2540] text-[#00D4B2] font-bold">
            A
          </span>
          <span className="text-sm font-bold tracking-tight text-[#0A2540]">
            Aastha Tele-HealthCare
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#0A2540]">
          Change Your Password
        </h1>
        <p className="mt-1 text-xs text-[#2D3A4A]">
          You are using a temporary password. Please set a new one before you
          can access your dashboard.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-600 border border-emerald-100">
            Password updated. Redirecting to your dashboard…
          </div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="current-password"
              className="text-xs font-semibold uppercase tracking-widest text-[#0A2540]"
            >
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] outline-none transition-all focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-password"
              className="text-xs font-semibold uppercase tracking-widest text-[#0A2540]"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] outline-none transition-all focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
            />
            <p className="text-[10px] text-[#2D3A4A]/70">
              At least 10 characters with uppercase, lowercase, a digit and a
              special character.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirm-password"
              className="text-xs font-semibold uppercase tracking-widest text-[#0A2540]"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] outline-none transition-all focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="mt-2 w-full rounded-xl bg-[#00D4B2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
