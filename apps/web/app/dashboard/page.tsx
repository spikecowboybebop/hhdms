"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardPathForRole, loadSession } from "@/lib/auth";

/**
 * Dashboard index — acts as a role-aware router.
 *
 * Reads the stored JWT session, extracts the role, and forwards the user to the
 * appropriate role-specific dashboard. If no session is found, it redirects to
 * the sign-in page.
 */
export default function DashboardIndexPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("Verifying credentials…");

  useEffect(() => {
    const session = loadSession();

    if (!session) {
      setStatus("No active session. Redirecting to sign-in…");
      router.replace("/signin");
      return;
    }

    const role = session.user.role;
    setStatus(`Routing ${role.replace("_", " ").toLowerCase()} to their workspace…`);
    router.replace(dashboardPathForRole(role));
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-6 py-4 shadow-sm">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4B2] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00D4B2]" />
        </span>
        <span className="text-sm font-medium text-[#2D3A4A]">{status}</span>
      </div>
    </main>
  );
}
