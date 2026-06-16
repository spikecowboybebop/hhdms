"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Our Services", href: "#services" },
  { label: "Mission", href: "#mission" },
  { label: "Providers", href: "#providers" },
  { label: "Contact Us", href: "#contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A2540] text-[#00D4B2] font-bold">
            A
          </span>
          <span className="text-base font-bold tracking-tight text-[#0A2540] sm:text-lg">
            Aastha Tele-HealthCare
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-[#2D3A4A] transition-colors hover:text-[#0A2540]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/signin"
            className="rounded-full border border-[#0A2540] px-5 py-2 text-sm font-medium text-[#0A2540] transition-all hover:bg-[#F8F9FA]"
          >
            Sign In
          </Link>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200/60 text-[#0A2540] md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200/60 bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#2D3A4A] hover:bg-[#F8F9FA] hover:text-[#0A2540]"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/signin"
              className="mt-2 rounded-full border border-[#0A2540] px-5 py-2 text-center text-sm font-medium text-[#0A2540] hover:bg-[#F8F9FA]"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
