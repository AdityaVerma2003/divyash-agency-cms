"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ACCOUNT_MANAGER";
  createdAt: string;
}

const ROLE_CONFIG = {
  SUPER_ADMIN: {
    label: "Super Admin",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
  },
  ACCOUNT_MANAGER: {
    label: "Account Manager",
    bg: "bg-sky-100 dark:bg-sky-900/30",
    text: "text-sky-700 dark:text-sky-300",
  },
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
}

const EMPTY_FORM: InviteForm = { name: "", email: "", role: "ACCOUNT_MANAGER" };

export default function AdminTeamPage() {
  const { success, error: toastError, warning } = useToast();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<TeamMember | null>(null);

  function loadMembers() {
    api
      .get<TeamMember[]>("/users", getAccessToken())
      .then(setMembers)
      .catch((err: Error) => toastError("Could not load team", err.message));
  }

  useEffect(() => { loadMembers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openModal() {
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      warning("Required fields missing", "Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post<TeamMember>("/users", form, getAccessToken());
      success("Invitation sent", `${form.name} will receive a setup email to activate their account.`);
      setShowModal(false);
      loadMembers();
    } catch (err) {
      toastError("Could not invite member", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(member: TeamMember) {
    setConfirmMember(member);
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

      {/* Table */}
      {!members ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--border)] opacity-40" />)}
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
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
          {/* Mobile cards */}
          <div className="divide-y divide-[var(--border)] md:hidden">
            {members.map((m) => {
              const cfg = ROLE_CONFIG[m.role];
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-4">
                  <div className="h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: avatarColor(m.name) }} aria-hidden>
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--ink)] truncate">{m.name}</p>
                    <p className="text-xs text-[var(--muted)] truncate">{m.email}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(m)}
                    disabled={deletingId === m.id}
                    className="flex-shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40"
                  >
                    {deletingId === m.id ? "…" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_2fr_160px_120px_80px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
              {["Name", "Email", "Role", "Joined", ""].map((h) => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {members.map((m) => {
                const cfg = ROLE_CONFIG[m.role];
                return (
                  <div key={m.id} className="grid grid-cols-[2fr_2fr_160px_120px_80px] items-center px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: avatarColor(m.name) }} aria-hidden>
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-[var(--ink)] truncate">{m.name}</span>
                    </div>
                    <span className="text-sm text-[var(--muted)] truncate">{m.email}</span>
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-sm text-[var(--muted)]">{formatDate(m.createdAt)}</span>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={deletingId === m.id}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40"
                      >
                        {deletingId === m.id ? "…" : "Remove"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

      {/* Invite modal */}
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
                <span className="mb-1 block text-[var(--muted)]">Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as InviteForm["role"] }))}
                  className={inputClass}
                >
                  <option value="ACCOUNT_MANAGER">Account Manager</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </label>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted)] leading-relaxed">
                <strong className="text-[var(--ink)]">How it works:</strong> We'll send {form.name.trim() || "them"} an invitation email with a link to set their own password and activate their account. The link expires in 24 hours.
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
