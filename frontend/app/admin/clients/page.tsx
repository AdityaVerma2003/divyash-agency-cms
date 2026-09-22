"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import PhoneInput, { validatePhone } from "@/components/PhoneInput";
import PasswordInput from "@/components/PasswordInput";
import type { Client } from "@/types";

interface NewClientForm {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  portalPassword: string;
}

const EMPTY_FORM: NewClientForm = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  gstin: "",
  address: "",
  portalPassword: "",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validate(form: NewClientForm): Partial<Record<keyof NewClientForm, string>> {
  const errors: Partial<Record<keyof NewClientForm, string>> = {};
  if (!form.companyName.trim()) errors.companyName = "Required";
  if (!form.contactPerson.trim()) errors.contactPerson = "Required";
  if (!form.email.trim()) errors.email = "Required";
  if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim().toUpperCase()))
    errors.gstin = "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)";
  const phoneErr = validatePhone(form.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (form.portalPassword && form.portalPassword.length < 8)
    errors.portalPassword = "Password must be at least 8 characters";
  return errors;
}

const AVATAR_COLORS = ["#6366F1", "#2DBFA0", "#5B7CF7", "#F87DA3", "#D97706", "#7C3AED", "#0891B2", "#DB2777"];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ClientAvatar({ name }: { name: string }) {
  return (
    <div
      className="h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm"
      style={{ backgroundColor: avatarColor(name) }}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  const isSuspended = status === "SUSPENDED";
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
      isActive
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
        : isSuspended
        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
        : "bg-[var(--surface-2)] text-[var(--muted)]"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        isActive ? "bg-emerald-500" : isSuspended ? "bg-amber-500" : "bg-[var(--muted)]"
      }`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function AdminClientsPage() {
  const router = useRouter();
  const { success, error: toastError, warning } = useToast();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<NewClientForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewClientForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<Client[]>("/clients", getAccessToken())
      .then(setClients)
      .catch((err: Error) => toastError("Could not load clients", err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openModal() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      warning("Please fix the errors", "Required fields are highlighted below.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.gstin.trim() && { gstin: form.gstin.trim() }),
        ...(form.address.trim() && { address: form.address.trim() }),
        ...(form.portalPassword.trim() && { portalPassword: form.portalPassword.trim() }),
      };
      const created = await api.post<Client>("/clients", payload, getAccessToken());
      success(
        "Client created",
        form.portalPassword.trim()
          ? `${form.companyName.trim()} added. They can log in with ${form.email.trim()}.`
          : `${form.companyName.trim()} added. No portal access set yet.`
      );
      router.push(`/admin/clients/${created.id}`);
    } catch (err) {
      toastError("Could not create client", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function field(key: keyof NewClientForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
        if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
      },
    };
  }

  const filtered = clients
    ? clients.filter((c) => c.companyName.toLowerCase().includes(query.toLowerCase()))
    : null;

  const inputClass = (key: keyof NewClientForm) =>
    `w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 ${
      formErrors[key] ? "border-danger" : "border-[var(--border)]"
    }`;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Clients</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {clients ? `${clients.length} client${clients.length !== 1 ? "s" : ""} on platform` : "Loading…"}
          </p>
        </div>
        <button
          onClick={openModal}
          className="btn btn-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New client
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search by company name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {!clients ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--border)] opacity-40" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">No clients yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Add your first client to get started.</p>
          <button onClick={openModal} className="btn btn-primary mt-4">
            + New client
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
          {filtered && filtered.length > 0 ? (<>
            {/* ── Mobile card list (< md) ── */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {filtered.map((client) => (
                <div key={client.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <ClientAvatar name={client.companyName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/admin/clients/${client.id}`} className="font-semibold text-[var(--ink)] hover:text-coral-500 transition-colors leading-tight">
                          {client.companyName}
                        </Link>
                        <StatusPill status={client.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--muted)] truncate">{client.email}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                          <span>{client.contactPerson}</span>
                          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-[var(--surface-2)] px-1.5 text-[10px] font-semibold text-[var(--ink)]">
                            {client._count?.clientServices ?? 0} services
                          </span>
                        </div>
                        <Link href={`/admin/clients/${client.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] hover:border-coral-500 hover:text-coral-500 transition-all">
                          View
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop grid table (≥ md) ── */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[2fr_1fr_80px_110px_100px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                {["Company", "Contact", "Services", "Status", ""].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {filtered.map((client) => (
                  <div key={client.id} className="group grid grid-cols-[2fr_1fr_80px_110px_100px] items-center px-5 py-4 transition-colors hover:bg-[var(--surface-2)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClientAvatar name={client.companyName} />
                      <div className="min-w-0">
                        <Link href={`/admin/clients/${client.id}`} className="block truncate font-semibold text-[var(--ink)] hover:text-coral-500 transition-colors">
                          {client.companyName}
                        </Link>
                        <p className="truncate text-xs text-[var(--muted)]">{client.email}</p>
                      </div>
                    </div>
                    <span className="text-sm text-[var(--muted)]">{client.contactPerson}</span>
                    <span className="inline-flex w-fit h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-[var(--surface-2)] px-2 text-xs font-semibold tabular-nums text-[var(--ink)]">
                      {client._count?.clientServices ?? 0}
                    </span>
                    <StatusPill status={client.status} />
                    <div className="flex justify-end">
                      <Link href={`/admin/clients/${client.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-all hover:border-coral-500 hover:text-coral-500 hover:bg-coral-500/5">
                        View
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>) : (
            <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">
              {query ? `No clients match "${query}". Try a different name.` : "No clients yet."}
            </div>
          )}
        </div>
      )}

      {/* New client modal */}
      {showModal && (
        <Modal title="New client" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-[var(--muted)]">
                  Company name <span className="text-danger">*</span>
                </span>
                <input type="text" className={inputClass("companyName")} {...field("companyName")} />
                {formErrors.companyName && (
                  <p className="mt-1 text-xs text-danger">{formErrors.companyName}</p>
                )}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">
                  Contact person <span className="text-danger">*</span>
                </span>
                <input type="text" className={inputClass("contactPerson")} {...field("contactPerson")} />
                {formErrors.contactPerson && (
                  <p className="mt-1 text-xs text-danger">{formErrors.contactPerson}</p>
                )}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">
                  Email <span className="text-danger">*</span>
                </span>
                <input type="email" className={inputClass("email")} {...field("email")} />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-danger">{formErrors.email}</p>
                )}
              </label>

              <div className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Phone</span>
                <PhoneInput
                  value={form.phone}
                  onChange={(v) => {
                    setForm((prev) => ({ ...prev, phone: v }));
                    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  onInvalidPaste={() => warning("Invalid paste", "Phone number must contain digits only.")}
                  error={!!formErrors.phone}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-danger">{formErrors.phone}</p>
                )}
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">GSTIN</span>
                <input
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  className={inputClass("gstin")}
                  {...field("gstin")}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }));
                    if (formErrors.gstin) setFormErrors((prev) => ({ ...prev, gstin: undefined }));
                  }}
                />
                {formErrors.gstin && (
                  <p className="mt-1 text-xs text-danger">{formErrors.gstin}</p>
                )}
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-[var(--muted)]">Address</span>
                <textarea
                  rows={2}
                  className={`${inputClass("address")} resize-none`}
                  {...field("address")}
                />
              </label>
            </div>

            {/* Portal access */}
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="text-coral-500">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink)]">Portal access</p>
              </div>
              <p className="mb-3 text-xs text-[var(--muted)] leading-relaxed">
                Optional — set a password so this client can log into their portal immediately.
                Login email will be <span className="font-semibold text-[var(--ink)]">{form.email.trim() || "the email above"}</span>.
              </p>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Portal password <span className="font-normal">(min. 8 chars)</span></span>
                <PasswordInput
                  value={form.portalPassword}
                  onChange={(v) => {
                    setForm((prev) => ({ ...prev, portalPassword: v }));
                    if (formErrors.portalPassword) setFormErrors((prev) => ({ ...prev, portalPassword: undefined }));
                  }}
                  placeholder="Leave blank to skip"
                  className={inputClass("portalPassword")}
                  autoComplete="new-password"
                />
                {formErrors.portalPassword && (
                  <p className="mt-1 text-xs text-danger">{formErrors.portalPassword}</p>
                )}
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-60"
              >
                {submitting ? "Creating…" : "Create client"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
