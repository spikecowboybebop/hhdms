"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  // 1. Setup state for email, password, and feedback messages
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2. Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong during sign-in.");
      }

      // Success logic (e.g., Save token, redirect user to dashboard)
      console.log("Login successful:", data);
      alert("Login successful!"); 
      
    } catch (err: any) {
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#F8F9FA] min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D3A4A] transition-colors hover:text-[#0A2540]"
        >
          <span aria-hidden>←</span>
          Back
        </Link>

        {/* Branding Header */}
        <header className="mt-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A2540] text-[#00D4B2] font-bold">
              A
            </span>
            <span className="text-sm font-bold tracking-tight text-[#0A2540]">
              Aastha Tele-HealthCare
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0A2540] sm:text-3xl">
            Sign In
          </h1>
        </header>

        {/* Error Message Display */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-widest text-[#0A2540]"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="dr.rahman@hhdms.bd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-widest text-[#0A2540]"
              >
                Password
              </label>
              <a
                href="#"
                className="text-xs font-medium text-[#00D4B2] transition-colors hover:text-[#0A2540]"
              >
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
            />
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-[#00D4B2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}