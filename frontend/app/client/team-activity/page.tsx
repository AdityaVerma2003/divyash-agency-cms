"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { TeamActivity } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}
function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TeamActivityPage() {
  const [activity, setActivity] = useState<TeamActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<TeamActivity>("/portal/team-activity", getAccessToken())
      .then(setActivity)
      .catch(() => setActivity({ member: null, sessions: [], totalActiveMinutes: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const member = activity?.member ?? null;
  const sessions = activity?.sessions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--ink)]">Team Activity</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          See who&apos;s managing your account and when they&apos;ve been active on the portal.
        </p>
      </div>

      {!member ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">No team member assigned yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Once someone from Divyash Digital is assigned to your account, their activity will show here.</p>
        </div>
      ) : (
        <>
          {/* Assigned member + total active time */}
          <div className="card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {member.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photoUrl} alt={member.name} className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-coral-100 text-lg font-bold text-coral-600 dark:bg-coral-900/30 dark:text-coral-400">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-[var(--ink)]">{member.name}</p>
                <p className="text-sm text-[var(--muted)]">{member.designation ?? "Account manager"}</p>
              </div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center sm:text-right">
              <p className="text-2xl font-bold text-[var(--ink)]">{formatDuration(activity!.totalActiveMinutes)}</p>
              <p className="text-xs text-[var(--muted)]">Total active time recorded</p>
            </div>
          </div>

          {/* Session history */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Recent sessions</p>
            {sessions.length === 0 ? (
              <div className="card py-12 text-center">
                <p className="text-sm text-[var(--muted)]">No portal activity recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                {/* Mobile list */}
                <div className="divide-y divide-[var(--border)] sm:hidden">
                  {sessions.map((s) => (
                    <div key={s.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--ink)]">{formatDate(s.loginAt)}</p>
                        {s.logoutAt ? (
                          <span className="text-xs text-[var(--muted)]">{formatDuration(s.durationMinutes ?? 0)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active now
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        In {formatTime(s.loginAt)} · Out {s.logoutAt ? formatTime(s.logoutAt) : "—"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <table className="hidden w-full text-sm sm:table">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">In time</th>
                      <th className="px-5 py-3">Out time</th>
                      <th className="px-5 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-3 text-[var(--ink)]">{formatDate(s.loginAt)}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">{formatTime(s.loginAt)}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">
                          {s.logoutAt ? (
                            formatTime(s.logoutAt)
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active now
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[var(--muted)]">
                          {s.durationMinutes != null ? formatDuration(s.durationMinutes) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
