"use client";

import Link from "next/link";

export default function SignInPage() {
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

        {/* Form */}
        <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
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
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0A2540] placeholder:text-slate-400 outline-none transition-all focus:border-[#00D4B2] focus:ring-2 focus:ring-[#00D4B2]/20"
            />
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-[#00D4B2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
