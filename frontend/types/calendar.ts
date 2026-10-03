export type EventMode = "ONLINE" | "OFFLINE";

export interface CalendarPerson {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  mode: EventMode;
  location: string | null;
  meetingUrl: string | null;
  colorTag: string | null;
  clientId: string | null;
  client: { id: string; companyName: string } | null;
  createdById: string;
  createdBy: { id: string; name: string };
  attendees: CalendarPerson[];
}

export const EVENT_COLORS: { tag: string; hex: string; label: string }[] = [
  { tag: "indigo", hex: "#6366F1", label: "Indigo" },
  { tag: "green", hex: "#22C55E", label: "Green" },
  { tag: "amber", hex: "#F59E0B", label: "Amber" },
  { tag: "rose", hex: "#F43F5E", label: "Rose" },
  { tag: "sky", hex: "#0EA5E9", label: "Sky" },
  { tag: "violet", hex: "#A855F7", label: "Violet" },
];

export function colorForTag(tag: string | null): string {
  return EVENT_COLORS.find((c) => c.tag === tag)?.hex ?? "#6366F1";
}
