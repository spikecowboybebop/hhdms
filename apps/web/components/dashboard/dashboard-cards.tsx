import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  trend?: "up" | "down" | "flat";
  accent?: "teal" | "amber" | "navy" | "slate";
  icon?: ReactNode;
}

const accentMap = {
  teal: { bg: "bg-[#00D4B2]/10", text: "text-[#00D4B2]" },
  amber: { bg: "bg-[#FF9900]/10", text: "text-[#FF9900]" },
  navy: { bg: "bg-[#0A2540]/10", text: "text-[#0A2540]" },
  slate: { bg: "bg-[#2D3A4A]/10", text: "text-[#2D3A4A]" },
} as const;

export function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  accent = "teal",
  icon,
}: StatCardProps) {
  const a = accentMap[accent];
  const trendColor =
    trend === "up"
      ? "text-[#00D4B2]"
      : trend === "down"
        ? "text-[#FF9900]"
        : "text-[#2D3A4A]";
  const trendArrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "•";

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
            {label}
          </span>
          <span className="text-2xl font-bold tracking-tight text-[#0A2540] sm:text-3xl">
            {value}
          </span>
          {delta && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <span aria-hidden>{trendArrow}</span>
              {delta}
            </span>
          )}
        </div>
        {icon && (
          <span className={`grid h-10 w-10 place-items-center rounded-xl ${a.bg} ${a.text}`}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/60 bg-white shadow-sm ${className}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200/60 px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold tracking-tight text-[#0A2540]">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-[#2D3A4A]">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
