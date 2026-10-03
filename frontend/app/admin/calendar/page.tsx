"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Icon } from "@/components/icons";
import { SegmentedControl } from "@/components/portal/SegmentedControl";
import { EmptyState } from "@/components/portal/EmptyState";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { EventModal } from "@/components/calendar/EventModal";
import { colorForTag } from "@/types/calendar";
import type { CalendarEvent } from "@/types/calendar";

type View = "month" | "week" | "day" | "year";

function fmtRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return sameMonth
    ? `${start.toLocaleDateString("en-IN", { month: "long" })} ${start.getFullYear()}`
    : `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", opts)}, ${end.getFullYear()}`;
}

export default function AdminCalendarPage() {
  const token = getAccessToken();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [modalState, setModalState] = useState<{ event: CalendarEvent | null; defaultDate?: Date } | null>(null);

  const { rangeFrom, rangeTo } = useMemo(() => {
    if (view === "year") {
      return { rangeFrom: new Date(cursor.getFullYear(), 0, 1), rangeTo: new Date(cursor.getFullYear() + 1, 0, 1) };
    }
    if (view === "day") {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      return { rangeFrom: d, rangeTo: new Date(d.getTime() + 86400000) };
    }
    if (view === "week") {
      const d = new Date(cursor);
      d.setDate(d.getDate() - d.getDay());
      const end = new Date(d);
      end.setDate(d.getDate() + 7);
      return { rangeFrom: d, rangeTo: end };
    }
    // month — pad to the visible 6-week grid
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridStart.getDate() + 42);
    return { rangeFrom: gridStart, rangeTo: gridEnd };
  }, [cursor, view]);

  function load() {
    setEvents(null);
    api
      .get<CalendarEvent[]>(`/calendar-events?from=${rangeFrom.toISOString()}&to=${rangeTo.toISOString()}`, token)
      .then(setEvents)
      .catch(() => setEvents([]));
  }
  useEffect(() => { load(); }, [rangeFrom.getTime(), rangeTo.getTime()]);

  function step(delta: number) {
    const d = new Date(cursor);
    if (view === "year") d.setFullYear(d.getFullYear() + delta);
    else if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCursor(d);
  }

  if (!events) return <PageLoader fullScreen={false} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => step(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:text-[var(--ink)]">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button onClick={() => step(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:text-[var(--ink)]">
            <Icon name="chevronRight" size={16} />
          </button>
          <button onClick={() => setCursor(new Date())} className="btn btn-ghost btn-sm">Today</button>
          <p className="ml-2 text-base font-semibold text-[var(--ink)]">{fmtRange(rangeFrom, new Date(rangeTo.getTime() - 86400000))}</p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
              { value: "day", label: "Day" },
              { value: "year", label: "Year" },
            ]}
          />
          <button onClick={() => setModalState({ event: null, defaultDate: cursor })} className="btn btn-primary">
            <Icon name="plus" size={16} /> Add Event
          </button>
        </div>
      </div>

      {view === "month" && (
        <MonthGrid
          monthDate={cursor}
          events={events}
          onDayClick={(day) => setModalState({ event: null, defaultDate: day })}
          onEventClick={(event) => setModalState({ event })}
        />
      )}

      {(view === "week" || view === "day") && (
        <div className="card p-0 overflow-hidden">
          {events.length === 0 ? (
            <EmptyState title="Nothing scheduled" description={`No events in this ${view}.`} />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {[...events]
                .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setModalState({ event: e })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: colorForTag(e.colorTag) }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">{e.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(e.startAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{e.mode === "ONLINE" ? "Online" : e.location}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {view === "year" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, m) => {
            const monthDate = new Date(cursor.getFullYear(), m, 1);
            const count = events.filter((e) => new Date(e.startAt).getMonth() === m).length;
            return (
              <button
                key={m}
                onClick={() => { setCursor(monthDate); setView("month"); }}
                className="card text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <p className="font-medium text-[var(--ink)]">{monthDate.toLocaleDateString("en-IN", { month: "long" })}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{count} event{count === 1 ? "" : "s"}</p>
              </button>
            );
          })}
        </div>
      )}

      {modalState && (
        <EventModal
          event={modalState.event}
          defaultDate={modalState.defaultDate}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load(); }}
          onDeleted={() => { setModalState(null); load(); }}
        />
      )}
    </div>
  );
}
