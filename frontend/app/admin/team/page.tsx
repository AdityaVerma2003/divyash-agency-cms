"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, fetchCurrentUser } from "@/lib/auth";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { DESIGNATIONS } from "@/lib/designations";
import { parseBankDetails } from "@/lib/bankDetails";
import PageLoader from "@/components/PageLoader";

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
  managedClients?: { id: string; companyName: string }[];
  /** Only present in the API response when the viewer is SUPER_ADMIN */
  bankDetails?: string | null;
}

interface ClientOption {
  id: string;
  companyName: string;
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
  clientIds: string[];
}

const EMPTY_FORM: InviteForm = {
  name: "",
  email: "",
  role: "ACCOUNT_MANAGER",
  designation: "",
  clientIds: [],
};

export default function AdminTeamPage() {
  const { success, error: toastError, warning } = useToast();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<TeamMember | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [bankDetailsMember, setBankDetailsMember] = useState<TeamMember | null>(null);

  function loadMembers() {
    api
      .get<TeamMember[]>("/users", getAccessToken())
      .then(setMembers)
      .catch((err: Error) => toastError("Could not load team", err.message));
  }

  useEffect(() => {
    loadMembers();
    fetchCurrentUser().then((u) => setCurrentUserRole(u?.role ?? null)).catch(() => null);
    api.get<ClientOption[]>("/clients", getAccessToken()).then(setClientOptions).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openModal() {
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function toggleClient(clientId: string) {
    setForm((p) => ({
      ...p,
      clientIds: p.clientIds.includes(clientId)
        ? p.clientIds.filter((id) => id !== clientId)
        : [...p.clientIds, clientId],
    }));
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.designation) {
      warning("Required fields missing", "Name, email and designation are required.");
      return;
    }
    if (form.clientIds.length === 0) {
      warning("Assign at least one client", "Every teammate must be assigned to at least one client.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post<TeamMember>("/users", form, getAccessToken());
      success(
        "Member added",
        `${form.name} has been added. A setup email is being sent to ${form.email}. Assigned to ${form.clientIds.length} client${form.clientIds.length !== 1 ? "s" : ""}.`
      );
      setShowModal(false);
      loadMembers();
    } catch (err) {
      toastError("Could not invite member", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editClientIds, setEditClientIds] = useState<string[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  function openEditAssignments(m: TeamMember) {
    setEditMember(m);
    setEditClientIds(m.managedClients?.map((c) => c.id) ?? []);
  }

  function toggleEditClient(clientId: string) {
    setEditClientIds((p) => (p.includes(clientId) ? p.filter((id) => id !== clientId) : [...p, clientId]));
  }

  async function saveAssignments() {
    if (!editMember) return;
    if (editClientIds.length === 0) {
      warning("Assign at least one client", "A teammate must always be working on at least one client.");
      return;
    }
    setSavingAssignments(true);
    try {
      const { managedClients } = await api.patch<{ managedClients: { id: string; companyName: string }[] }>(
        `/users/${editMember.id}/clients`,
        { clientIds: editClientIds },
        getAccessToken()
      );
      setMembers((prev) => prev?.map((m) => (m.id === editMember.id ? { ...m, managedClients } : m)) ?? null);
      success("Assignments updated", `${editMember.name} is now working on ${managedClients.length} client${managedClients.length !== 1 ? "s" : ""}.`);
      setEditMember(null);
    } catch (err) {
      toastError("Could not update assignments", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingAssignments(false);
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
        <PageLoader fullScreen={false} />
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

                {/* Assigned clients */}
                {m.managedClients && m.managedClients.length > 0 && (
                  <div className="rounded-lg bg-[var(--surface-2)] px-2.5 py-2">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                      Working on {m.managedClients.length} client{m.managedClients.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-[var(--ink)] truncate">
                      {m.managedClients.map((c) => c.companyName).join(", ")}
                    </p>
                  </div>
                )}

                {/* Role badge + actions */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border)]">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${roleCfg.bg} ${roleCfg.text}`}>
                    {roleCfg.label}
                  </span>
                  {currentUserRole === "SUPER_ADMIN" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBankDetailsMember(m)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] hover:border-coral-500 hover:text-coral-500 transition-all"
                      >
                        Bank details
                      </button>
                      <button
                        onClick={() => openEditAssignments(m)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] hover:border-coral-500 hover:text-coral-500 transition-all"
                      >
                        Edit clients
                      </button>
                      <button
                        onClick={() => setConfirmMember(m)}
                        disabled={deletingId === m.id}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-40"
                      >
                        {deletingId === m.id ? "…" : "Remove"}
                      </button>
                    </div>
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

      {/* Bank details modal (Super Admin only) */}
      {bankDetailsMember && (
        <Modal title={`Bank details — ${bankDetailsMember.name}`} onClose={() => setBankDetailsMember(null)}>
          {(() => {
            const d = parseBankDetails(bankDetailsMember.bankDetails);
            if (!d) {
              return (
                <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm text-[var(--muted)]">
                  Bank details not added yet.
                </p>
              );
            }
            const rows: [string, string][] = [
              ["Account holder name", d.accountHolderName],
              ["Bank name", d.bankName],
              ["Account number", d.accountNumber],
              ["IFSC code", d.ifsc],
            ];
            return (
              <div className="space-y-3">
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-[var(--muted)]">{label}</p>
                    <p className="text-sm font-medium text-[var(--ink)]">{value || <span className="italic text-[var(--muted)]">Not provided</span>}</p>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setBankDetailsMember(null)} className="btn btn-ghost">Close</button>
          </div>
        </Modal>
      )}

      {/* Edit assignments modal */}
      {editMember && (
        <Modal title={`Edit clients — ${editMember.name}`} onClose={() => setEditMember(null)}>
          <div className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Assigned to client(s) <span className="text-danger">*</span></span>
            {clientOptions.length === 0 ? (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-xs text-[var(--muted)]">
                No clients exist yet.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
                {clientOptions.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">
                    <input
                      type="checkbox"
                      checked={editClientIds.includes(c.id)}
                      onChange={() => toggleEditClient(c.id)}
                      className="h-4 w-4 rounded border-[var(--border)] text-coral-500 focus:ring-coral-500"
                    />
                    {c.companyName}
                  </label>
                ))}
              </div>
            )}
            <span className="mt-1 block text-xs text-[var(--muted)]">
              Other team members already assigned to these clients are unaffected — this only changes {editMember.name}&apos;s own assignments.
            </span>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setEditMember(null)} className="btn btn-ghost">Cancel</button>
            <button
              type="button"
              onClick={saveAssignments}
              disabled={savingAssignments}
              className="btn btn-primary disabled:opacity-60"
            >
              {savingAssignments ? "Saving…" : "Save changes"}
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

              <div className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Assign to client(s) <span className="text-danger">*</span></span>
                {clientOptions.length === 0 ? (
                  <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-xs text-[var(--muted)]">
                    No clients exist yet — add a client first, then invite this teammate.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
                    {clientOptions.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">
                        <input
                          type="checkbox"
                          checked={form.clientIds.includes(c.id)}
                          onChange={() => toggleClient(c.id)}
                          className="h-4 w-4 rounded border-[var(--border)] text-coral-500 focus:ring-coral-500"
                        />
                        {c.companyName}
                      </label>
                    ))}
                  </div>
                )}
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  Multiple team members can work on the same client — this adds them alongside anyone already assigned.
                </span>
              </div>

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
