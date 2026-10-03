"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export type DashboardPeriod = "this_month" | "last_month" | "this_quarter" | "this_year";

export const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
];

export function PeriodSelect({
  value,
  onChange,
  className,
}: {
  value: DashboardPeriod;
  onChange: (next: DashboardPeriod) => void;
  className?: string;
}) {
  const current = PERIOD_OPTIONS.find((o) => o.value === value) ?? PERIOD_OPTIONS[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] shadow-portal-xs outline-none transition-colors hover:bg-[var(--surface-2)]",
          className
        )}
      >
        {current.label}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-portal-md"
        >
          {PERIOD_OPTIONS.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-2 text-sm outline-none transition-colors",
                option.value === value
                  ? "bg-[var(--surface-3)] font-medium text-[var(--ink)]"
                  : "text-[var(--ink-2)] data-[highlighted]:bg-[var(--surface-2)] data-[highlighted]:text-[var(--ink)]"
              )}
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
