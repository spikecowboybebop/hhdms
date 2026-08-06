"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSession,
  loadSession,
  roleLabel,
  type StoredSession,
} from "@/lib/auth";
import {
  notificationsApi,
  type PendingNotification,
} from "@/lib/notifications";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface DashboardUserMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export interface DashboardShellProps {
  role: string;
  /** Role-specific accent (defaults to teal). */
  accent?: "teal" | "amber" | "navy" | "slate";
  navItems: DashboardNavItem[];
  userMenuItems?: DashboardUserMenuItem[];
  pageTitle: string;
  pageSubtitle?: string;
  children: React.ReactNode;
}

const accentMap = {
  teal: {
    bar: "bg-[#00D4B2]",
    text: "text-[#00D4B2]",
    pill: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
  },
  amber: {
    bar: "bg-[#FF9900]",
    text: "text-[#FF9900]",
    pill: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
  },
  navy: {
    bar: "bg-[#0A2540]",
    text: "text-[#0A2540]",
    pill: "bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20",
  },
  slate: {
    bar: "bg-[#2D3A4A]",
    text: "text-[#2D3A4A]",
    pill: "bg-[#2D3A4A]/10 text-[#2D3A4A] border-[#2D3A4A]/20",
  },
} as const;

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12L12 4l9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function DashboardShell({
  role,
  accent = "teal",
  navItems,
  userMenuItems,
  pageTitle,
  pageSubtitle,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<PendingNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  // Poll for pending notifications every 30s
  useEffect(() => {
    if (!hydrated) return;
    const poll = async () => {
      try {
        const data = await notificationsApi.getPending();
        setNotifications(data);
      } catch {
        // silently ignore poll errors
      }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [hydrated]);

  const colors = accentMap[accent];

  // Hydrate the session from localStorage on mount.
  useEffect(() => {
    const stored = loadSession();
    setSession(stored);
    setHydrated(true);
    // Force first-login users (still on a temporary password) to set a new one.
    if (
      stored &&
      stored.user.require_password_change === true &&
      pathname !== "/dashboard/change-password"
    ) {
      router.replace("/dashboard/change-password");
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/signin");
  };

  const initials = useMemo(() => {
    const name = session?.user?.first_name_en || session?.user?.email || "U";
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [session]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0A2540]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#0A2540]/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/60 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-200/60 px-6 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0A2540] text-[#00D4B2] font-bold">
            A
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-[#0A2540]">
              Aastha Tele-Health
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#2D3A4A]">
              HHDMS Console
            </span>
          </div>
        </div>

        <div className="px-4 pt-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${colors.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${colors.bar}`} />
            {roleLabel(role)}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={`${item.label}::${item.href}`}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    active
                      ? "bg-[#0A2540] text-[#00D4B2] shadow-md" 
                      : "text-[#2D3A4A] font-medium hover:bg-[#F8F9FA] hover:text-[#0A2540]"
                  }`}
                >
                  <span className={active ? "text-[#FFFFF0]" : "text-[#2D3A4A]/70"}>
                    {item.icon}
                  </span>
                  <span className={active ? "text-[#FFFFF0]" : ""}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          </ul>
        </nav>

        <div className="border-t border-slate-200/60 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#2D3A4A] transition-all hover:border-[#FF9900] hover:bg-[#FF9900]/10 hover:text-[#FF9900]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/60 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/60 text-[#0A2540] lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
            <div className="flex flex-col leading-tight">
              <h1 className="text-base font-bold tracking-tight text-[#0A2540] sm:text-lg">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <span className="hidden text-xs text-[#2D3A4A] sm:block">
                  {pageSubtitle}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-slate-200/60 bg-[#F8F9FA] px-3 py-1.5 text-xs font-medium text-[#2D3A4A] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D4B2] animate-pulse" />
              Live Shift
            </span>
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200/60 px-3 py-1.5 text-xs font-medium text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540] sm:inline-flex"
            >
              <HomeIcon /> Home
            </Link>

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200/60 text-[#2D3A4A] transition-all hover:border-[#0A2540] hover:text-[#0A2540]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#FF9900] text-[8px] font-bold text-white">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 origin-top-right rounded-2xl border border-slate-200/60 bg-white shadow-xl ring-1 ring-slate-900/5">
                  <div className="border-b border-slate-200/60 px-4 py-3">
                    <span className="text-xs font-bold text-[#0A2540]">Notifications</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-[#2D3A4A]">
                        No new notifications
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {notifications.map((n) => (
                          <li key={n.id}>
                            <button
                              onClick={() => setNotifOpen(false)}
                              className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-[#F8F9FA]"
                            >
                              <span className="text-xs font-semibold text-[#0A2540]">
                                {n.title}
                              </span>
                              <span className="text-[11px] text-[#2D3A4A] leading-snug">
                                {n.body}
                              </span>
                              <span className="text-[9px] text-[#2D3A4A]/60">
                                {new Date(n.created_at).toLocaleString()}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200/60 bg-white px-2 py-1 shadow-sm transition-all hover:shadow-md"
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${colors.bar}`}>
                  {hydrated ? initials : "—"}
                </span>
                <div className="hidden flex-col leading-tight pr-2 sm:flex">
                  <span className="text-xs font-semibold text-[#0A2540]">
                    {hydrated
                      ? session?.user?.first_name_en || "Authenticated User"
                      : "Loading…"}
                  </span>
                  <span className="text-[10px] text-[#2D3A4A]">
                    {hydrated ? session?.user?.email : ""}
                  </span>
                </div>
              </button>

              {userMenuOpen && userMenuItems && userMenuItems.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/60 bg-white shadow-xl ring-1 ring-slate-900/5">
                  <nav className="p-2">
                    <ul className="flex flex-col gap-1">
                      {userMenuItems.map((item, idx) => (
                        <li key={`user-menu-${idx}`}>
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              item.onClick?.();
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#2D3A4A] transition-all hover:bg-[#F8F9FA] hover:text-[#0A2540]"
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardShell;
