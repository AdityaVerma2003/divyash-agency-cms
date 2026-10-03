"use client";

import { colorForTag } from "@/types/calendar";
import type { CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Builds the 6x7 day grid for the month containing `monthDate`. */
function buildGrid(monthDate: Date): Date[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function MonthGrid({
  monthDate,
  events,
  onDayClick,
  onEventClick,
}: {
  monthDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const days = buildGrid(monthDate);
  const today = new Date();

  function eventsForDay(day: Date) {
    return events.filter((e) => {
      const start = startOfDay(new Date(e.startAt));
      const end = startOfDay(new Date(e.endAt));
      return day >= start && day <= end;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === monthDate.getMonth();
          const isToday = sameDay(day, today);
          const dayEvents = eventsForDay(day);
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[104px] cursor-pointer border-b border-r border-[var(--border-subtle)] p-1.5 transition-colors hover:bg-[var(--surface-2)]",
                i % 7 === 6 && "border-r-0",
                !inMonth && "bg-[var(--surface-2)]/40"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday ? "bg-[var(--brand)] text-white" : inMonth ? "text-[var(--ink)]" : "text-[var(--muted)]"
                )}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                    className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white"
                    style={{ backgroundColor: colorForTag(e.colorTag) }}
                    title={e.title}
                  >
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1.5 text-[10px] text-[var(--muted)]">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
