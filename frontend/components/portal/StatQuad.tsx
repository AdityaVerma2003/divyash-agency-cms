import { cn } from "@/lib/utils";
import { LinkOrDiv } from "./LinkOrDiv";

/**
 * Renders "—" rather than a number whenever the prior-period figure is
 * genuinely missing, so a fresh account never shows an invented delta.
 */
export function KpiDelta({
  pct,
  label = "vs Last month",
  className,
}: {
  pct?: number | null;
  label?: string;
  className?: string;
}) {
  if (pct == null || !Number.isFinite(pct)) {
    return (
      <span className={cn("kpi-delta kpi-delta-flat", className)}>
        <span>—</span>
        <span className="text-[var(--muted)]">{label}</span>
      </span>
    );
  }

  const rounded = Math.round(pct * 10) / 10;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";

  return (
    <span
      className={cn(
        "kpi-delta",
        direction === "up" && "kpi-delta-up",
        direction === "down" && "kpi-delta-down",
        direction === "flat" && "kpi-delta-flat",
        className
      )}
    >
      <span>
        {rounded > 0 ? "+" : ""}
        {rounded}%
      </span>
      {direction !== "flat" && <span aria-hidden>{direction === "up" ? "↑" : "↓"}</span>}
      <span className="text-[var(--muted)]">{label}</span>
    </span>
  );
}

export interface StatQuadItem {
  label: string;
  value: string;
  dotColor: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  href?: string;
}

/** 2×2 KPI grid inside a single card with hairline internal dividers. */
export function StatQuad({ items, className }: { items: StatQuadItem[]; className?: string }) {
  return (
    <div className={cn("card overflow-hidden p-0", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {items.map((item, i) => {
          return (
            <LinkOrDiv
              key={item.label}
              href={item.href}
              className={cn(
                "block p-5 transition-colors",
                item.href && "hover:bg-[var(--surface-2)]",
                // hairline dividers between cells only
                i % 2 === 0 && "sm:border-r sm:border-[var(--border-subtle)]",
                i < 2 && "border-b border-[var(--border-subtle)]"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: item.dotColor }}
                  aria-hidden
                />
                <span className="text-sm font-medium text-[var(--ink-2)]">{item.label}</span>
              </div>
              <p className="mt-3 font-portal text-[28px] font-bold leading-9 tabular-nums text-[var(--ink)]">
                {item.value}
              </p>
              <KpiDelta pct={item.deltaPct} label={item.deltaLabel} className="mt-1.5" />
            </LinkOrDiv>
          );
        })}
      </div>
    </div>
  );
}

/** Single KPI card with a tinted icon badge — used where a 4-up grid fits better than a quad. */
export function StatCard({
  label,
  value,
  icon,
  accent,
  deltaPct,
  deltaLabel,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  href?: string;
}) {
  return (
    <LinkOrDiv
      href={href}
      className={cn("card block", href && "transition-colors hover:bg-[var(--surface-2)]")}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
      >
        {icon}
      </div>
      <p className="mt-6 font-portal text-[28px] font-bold leading-9 tabular-nums text-[var(--ink)]">
        {value}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--ink-2)]">{label}</span>
        <KpiDelta pct={deltaPct} label={deltaLabel} />
      </div>
    </LinkOrDiv>
  );
}
