"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { EVENT_COLORS } from "@/types/calendar";
import type { CalendarEvent, EventMode } from "@/types/calendar";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 border-[var(--border)]";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TeamOption { id: string; name: string }

export function EventModal({
  event,
  defaultDate,
  onClose,
  onSaved,
  onDeleted,
}: {
  event: CalendarEvent | null;
  defaultDate?: Date;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const token = getAccessToken();
  const isNew = event === null;
  const base = defaultDate ?? new Date();

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [mode, setMode] = useState<EventMode>(event?.mode ?? "OFFLINE");
  const [startAt, setStartAt] = useState(event ? toLocalInput(event.startAt) : toLocalInput(base.toISOString()));
  const [endAt, setEndAt] = useState(
    event
      ? toLocalInput(event.endAt)
      : toLocalInput(new Date(base.getTime() + 60 * 60 * 1000).toISOString())
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(event?.meetingUrl ?? "");
  const [clientEmail, setClientEmail] = useState(event?.clientEmail ?? "");
  const [colorTag, setColorTag] = useState(event?.colorTag ?? "indigo");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(event?.attendees.map((a) => a.id) ?? []);
  const [team, setTeam] = useState<TeamOption[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<TeamOption[]>("/users", token).then(setTeam).catch(() => setTeam([]));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        description: description || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        mode,
        location: mode === "OFFLINE" ? location : undefined,
        meetingUrl: mode === "ONLINE" ? meetingUrl : undefined,
        clientEmail: mode === "ONLINE" ? clientEmail || undefined : undefined,
        colorTag,
        attendeeIds,
      };
      if (isNew) {
        await api.post("/calendar-events", payload, token);
      } else {
        await api.patch(`/calendar-events/${event!.id}`, payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event || !confirm("Delete this event?")) return;
    await api.del(`/calendar-events/${event.id}`, token);
    onDeleted?.();
  }

  return (
    <Modal title={isNew ? "New event" : "Edit event"} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Title</span>
          <input className={INPUT_CLS} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Description</span>
          <textarea className={`${INPUT_CLS} resize-none`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Starts</span>
            <input type="datetime-local" className={INPUT_CLS} value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Ends</span>
            <input type="datetime-local" className={INPUT_CLS} value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </label>
        </div>

        <div className="flex items-center gap-4">
          {(["OFFLINE", "ONLINE"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === m} onChange={() => setMode(m)} />
              <span className="text-[var(--ink)]">{m === "OFFLINE" ? "Offline" : "Online"}</span>
            </label>
          ))}
        </div>

        {mode === "OFFLINE" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Location</span>
            <input className={INPUT_CLS} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office, address…" required />
          </label>
        ) : (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Meeting link</span>
              <input className={INPUT_CLS} value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Client email <span className="text-xs font-normal text-[var(--muted)]">(optional)</span></span>
              <input
                type="email"
                className={INPUT_CLS}
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@company.com"
              />
              <span className="mt-1 block text-xs text-[var(--muted)]">
                If set, they&apos;ll get an email confirming this meeting (along with you) when it&apos;s created.
              </span>
            </label>
          </>
        )}

        <div>
          <span className="mb-1.5 block text-sm text-[var(--muted)]">Colour</span>
          <div className="flex gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.tag}
                type="button"
                onClick={() => setColorTag(c.tag)}
                title={c.label}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform",
                  colorTag === c.tag ? "scale-110 border-[var(--ink)]" : "border-transparent"
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Attendees</span>
          <select
            multiple
            className={`${INPUT_CLS} h-24`}
            value={attendeeIds}
            onChange={(e) => setAttendeeIds(Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {(team ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between pt-1">
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <div className="ml-auto flex items-center gap-2">
            {!isNew && (
              <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm">
                Delete
              </button>
            )}
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
              {saving ? "Saving…" : isNew ? "Create event" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
