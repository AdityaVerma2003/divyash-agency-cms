"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, fetchCurrentUser } from "@/lib/auth";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { DESIGNATIONS } from "@/lib/designations";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ACCOUNT_MANAGER";
  onboardingStatus: "INVITED" | "PENDING" | "COMPLETE";
  photoUrl?: string | null;
  mobile?: string | null;
  designation?: string | null;
  createdAt: string;
}

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: "Super Admin", bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300" },
  ACCOUNT_MANAGER: { label: "Account Manager", bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300" },
};

const ONBOARDING_CONFIG = {
  INVITED: { label: "Invited", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  PENDING: { label: "Pending", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  COMPLETE: { label: "Complete", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
};

const AVATAR_COLORS = ["#6366F1", "#2DBFA0", "#5B7CF7", "#F87DA3", "#D97706", "#7C3AED"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface InviteForm {
  name: string;
  email: string;
  role: "ACCOUNT_MANAGER" | "SUPER_ADMIN";
  designation: string;
}

const EMPTY_FORM: InviteForm = {
  name: "",
  email: "",
  role: "ACCOUNT_MANAGER",
  designation: "",
};

export default function AdminTeamPage() {
  const { success, error: toastError, warning } = useToast();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<TeamMember | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  function loadMembers() {
    api
      .get<TeamMember[]>("/users", getAccessToken())
      .then(setMembers)
      .catch((err: Error) => toastError("Could not load team", err.message));
  }

  useEffect(() => {
    loadMembers();
    fetchCurrentUser().then((u) => setCurrentUserRole(u?.role ?? null)).catch(() => null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openModal() {
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.designation) {
      warning("Required fields missing", "Name, email and designation are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post<TeamMember>("/users", form, getAccessToken());
      success("Member added", `${form.name} has been added. A setup email is being sent to ${form.email}.`);
      setShowModal(false);
      loadMembers();
    } catch (err) {
      toastError("Could not invite member", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!confirmMember) return;
    const member = confirmMember;
    setConfirmMember(null);
    setDeletingId(member.id);
    try {
      await api.del(`/users/${member.id}`, getAccessToken());
      success("Member removed", `${member.name} has been removed from the team.`);
      setMembers((prev) => prev?.filter((m) => m.id !== member.id) ?? null);
    } catch (err) {
      toastError("Could not remove member", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Team</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {members ? `${members.length} team member${members.length !== 1 ? "s" : ""}` : "Loading…"}
          </p>
        </div>
        <button onClick={openModal} className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Invite teammate
        </button>
      </div>

      {/* Card grid */}
      {!members ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">No team members yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Invite your first teammate to get started.</p>
          <button onClick={openModal} className="btn btn-primary mt-4">+ Invite teammate</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const roleCfg = ROLE_CONFIG[m.role];
            const obCfg = ONBOARDING_CONFIG[m.onboardingStatus ?? "INVITED"];
            return (
              <div key={m.id} className="card flex flex-col gap-4">
                {/* Top row: avatar + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt={m.name} className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                        style={{ backgroundColor: avatarColor(m.name) }}
                        aria-hidden
                      >
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--ink)] truncate">{m.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">
                        {m.designation ?? <span className="italic">Profile incomplete</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`mt-0.5 shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${obCfg.bg} ${obCfg.text}`}>
                    {obCfg.label}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-[var(--muted)]">
                  <p className="truncate">{m.email}</p>
                  {m.mobile && <p>{m.mobile}</p>}
                  <p>Joined {formatDate(m.createdAt)}</p>
                </div>

                {/* Role badge + actions */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border)]">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${roleCfg.bg} ${roleCfg.text}`}>
                    {roleCfg.label}
                  </span>
                  {currentUserRole === "SUPER_ADMIN" && (
                    <button
                      onClick={() => setConfirmMember(m)}
                      disabled={deletingId === m.id}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40"
                    >
                      {deletingId === m.id ? "…" : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm remove modal */}
      {confirmMember && (
        <Modal title="Remove team member" onClose={() => setConfirmMember(null)}>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Are you sure you want to remove <span className="font-semibold text-[var(--ink)]">{confirmMember.name}</span> from the team? This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmMember(null)} className="btn btn-ghost">Cancel</button>
            <button
              type="button"
              onClick={confirmDelete}
              className="btn rounded-lg border border-transparent bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
            >
              Remove member
            </button>
          </div>
        </Modal>
      )}

      {/* Invite modal — name, email, role only */}
      {showModal && (
        <Modal title="Invite teammate" onClose={() => setShowModal(false)}>
          <form onSubmit={handleInvite} noValidate>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Full name <span className="text-danger">*</span></span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Priya Sharma"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Email address <span className="text-danger">*</span></span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={inputClass}
                  placeholder="priya@divyashdigital.co.in"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Designation <span className="text-danger">*</span></span>
                <select
                  required
                  value={form.designation}
                  onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                  className={inputClass}
                >
                  <option value="" disabled>Select a designation…</option>
                  {DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  The job title they&apos;re being onboarded for. They can change it later on their profile.
                </span>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Portal access</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as InviteForm["role"] }))}
                  className={inputClass}
                >
                  <option value="ACCOUNT_MANAGER">Account Manager — standard access</option>
                  <option value="SUPER_ADMIN">Super Admin — full access</option>
                </select>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  Controls what they can see and do inside the portal.
                </span>
              </label>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)] leading-relaxed">
                <strong className="text-[var(--ink)]">How it works:</strong> {form.name.trim() || "They"} will receive an invitation email to set their password. After logging in, they complete the rest of their profile (photo, contact details).
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-60">
                {submitting ? "Sending invite…" : "Send invitation"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
