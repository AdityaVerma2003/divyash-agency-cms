"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import PhoneInput, { validatePhone } from "@/components/PhoneInput";
import type { Client, ClientService, Invoice, Service, Post, Campaign, Lead } from "@/types";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

function formatMonth(iso: string) {
  const dateStr = iso.length === 7 ? iso + "-01" : iso;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

type StatusKey =
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "INACTIVE"
  | "SUSPENDED"
  | "PAID"
  | "SENT"
  | "OVERDUE"
  | "PARTIALLY_PAID"
  | "DRAFT";

const STATUS_CLASSES: Record<StatusKey, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAID: "bg-green-100 text-green-700",
  SENT: "bg-coral-100 text-coral-600",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAUSED: "bg-amber-100 text-amber-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  OVERDUE: "bg-red-100 text-danger",
  ENDED: "bg-[var(--surface-2)] text-[var(--muted)]",
  INACTIVE: "bg-[var(--surface-2)] text-[var(--muted)]",
  DRAFT: "bg-[var(--surface-2)] text-[var(--muted)]",
};

function Badge({ status }: { status: string }) {
  const cls = STATUS_CLASSES[status as StatusKey] ?? "bg-[var(--surface-2)] text-[var(--muted)]";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const PLATFORM_CLASSES: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700",
  Facebook: "bg-sky-100 text-sky-700",
  LinkedIn: "bg-blue-100 text-blue-700",
  Twitter: "bg-slate-100 text-slate-700",
  YouTube: "bg-red-100 text-red-700",
};

function PlatformBadge({ platform }: { platform: string }) {
  const cls = PLATFORM_CLASSES[platform] ?? "bg-[var(--surface-2)] text-[var(--muted)]";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {platform}
    </span>
  );
}

const INPUT_CLS =
  "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 border-[var(--border)]";

// ─── Contract duration display helper ────────────────────────────────────────

function contractLabel(sub: ClientService): string {
  if (!sub.contractDurationMonths) return "Ongoing";
  const months = sub.contractDurationMonths;
  const label = months % 12 === 0 ? `${months / 12}yr` : `${months}mo`;
  const end = sub.endDate ? `, ends ${formatDate(sub.endDate)}` : "";
  return `${label} contract${end}`;
}

// ─── Edit client form ─────────────────────────────────────────────────────────

interface EditForm {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
}

function toEditForm(client: Client): EditForm {
  return {
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone ?? "",
    gstin: client.gstin ?? "",
    address: client.address ?? "",
  };
}

interface EditClientModalProps {
  client: Client;
  onClose: () => void;
  onSaved: (updated: Client) => void;
}

function EditClientModal({ client, onClose, onSaved }: EditClientModalProps) {
  const [form, setForm] = useState<EditForm>(toEditForm(client));
  const [errors, setErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Partial<Record<keyof EditForm, string>> = {};
    if (!form.companyName.trim()) e.companyName = "Required";
    if (!form.contactPerson.trim()) e.contactPerson = "Required";
    if (!form.email.trim()) e.email = "Required";
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) e.phone = phoneErr;
    if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim().toUpperCase()))
      e.gstin = "Invalid GSTIN (e.g. 22AAAAA0000A1Z5)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.gstin.trim() && { gstin: form.gstin.trim() }),
        ...(form.address.trim() && { address: form.address.trim() }),
      };
      const updated = await api.patch<Client>(`/clients/${client.id}`, payload, getAccessToken());
      onSaved(updated);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function field(key: keyof EditForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
      },
    };
  }

  const inp = (key: keyof EditForm) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-coral-500 ${
      errors[key] ? "border-danger" : "border-[var(--border)]"
    }`;

  return (
    <Modal title="Edit client" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">
              Company name <span className="text-danger">*</span>
            </span>
            <input type="text" className={inp("companyName")} {...field("companyName")} />
            {errors.companyName && <p className="mt-1 text-xs text-danger">{errors.companyName}</p>}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">
              Contact person <span className="text-danger">*</span>
            </span>
            <input type="text" className={inp("contactPerson")} {...field("contactPerson")} />
            {errors.contactPerson && (
              <p className="mt-1 text-xs text-danger">{errors.contactPerson}</p>
            )}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">
              Email <span className="text-danger">*</span>
            </span>
            <input type="email" className={inp("email")} {...field("email")} />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
          </label>

          <div className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Phone</span>
            <PhoneInput
              value={form.phone}
              onChange={(v) => {
                setForm((p) => ({ ...p, phone: v }));
                if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
              }}
              onInvalidPaste={() => {}}
              error={!!errors.phone}
            />
            {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone}</p>}
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">GSTIN</span>
            <input
              type="text"
              placeholder="22AAAAA0000A1Z5"
              className={inp("gstin")}
              value={form.gstin}
              onChange={(e) => {
                setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }));
                if (errors.gstin) setErrors((p) => ({ ...p, gstin: undefined }));
              }}
            />
            {errors.gstin && <p className="mt-1 text-xs text-danger">{errors.gstin}</p>}
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Address</span>
            <textarea rows={2} className={`${inp("address")} resize-none`} {...field("address")} />
          </label>
        </div>

        {submitError && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger dark:text-red-400">{submitError}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Suspend / reactivate client modal ───────────────────────────────────────

const SUSPENSION_REASONS = [
  { value: "NON_PAYMENT", label: "Non-payment" },
  { value: "CLIENT_REQUESTED", label: "Client requested" },
  { value: "POLICY_VIOLATION", label: "Policy violation" },
  { value: "OTHER", label: "Other" },
];

interface ClientStatusModalProps {
  client: Client;
  targetStatus: "SUSPENDED" | "ACTIVE" | "INACTIVE";
  onClose: () => void;
  onDone: (updated: Client) => void;
}

function ClientStatusModal({ client, targetStatus, onClose, onDone }: ClientStatusModalProps) {
  const [reason, setReason] = useState("NON_PAYMENT");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const title =
    targetStatus === "SUSPENDED"
      ? "Suspend account"
      : targetStatus === "ACTIVE"
      ? "Reactivate account"
      : "Deactivate account";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await api.patch<Client>(
        `/clients/${client.id}/status`,
        { status: targetStatus, reason, notes: notes.trim() || undefined },
        getAccessToken()
      );
      onDone(updated);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {targetStatus !== "ACTIVE" && (
          <div className="mb-4">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Reason <span className="text-danger">*</span></span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={INPUT_CLS}
              >
                {SUSPENSION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">
            Internal notes <span className="text-xs">(optional)</span>
          </span>
          <textarea
            rows={3}
            className={`${INPUT_CLS} resize-none`}
            placeholder="For internal reference only, not shown to the client…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {targetStatus === "SUSPENDED" && (
          <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            The client can still log in and pay outstanding invoices. All performance data will be hidden until reactivated.
          </p>
        )}
        {targetStatus === "INACTIVE" && (
          <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-danger dark:text-red-400">
            The client will be blocked from logging in entirely.
          </p>
        )}

        {submitError && (
          <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger dark:text-red-400">{submitError}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              targetStatus === "ACTIVE" ? "bg-green-600 hover:bg-green-700" :
              targetStatus === "SUSPENDED" ? "bg-amber-600 hover:bg-amber-700" :
              "bg-danger hover:bg-red-700"
            }`}
          >
            {submitting ? "Saving…" : title}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add service form ─────────────────────────────────────────────────────────

interface AddServiceForm {
  serviceId: string;
  rate: string;
  billingCycle: "MONTHLY" | "ONE_TIME";
  startDate: string;
  contractType: "ONGOING" | "FIXED";
  durationValue: string;
  durationUnit: "MONTHS" | "YEARS";
}

const EMPTY_SERVICE_FORM: AddServiceForm = {
  serviceId: "",
  rate: "",
  billingCycle: "MONTHLY",
  startDate: "",
  contractType: "ONGOING",
  durationValue: "3",
  durationUnit: "MONTHS",
};

function computeEndDate(startDate: string, durationValue: string, durationUnit: "MONTHS" | "YEARS"): Date | null {
  if (!startDate || !durationValue || Number(durationValue) <= 0) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  const months = Math.round(Number(durationValue)) * (durationUnit === "YEARS" ? 12 : 1);
  d.setMonth(d.getMonth() + months);
  return d;
}

interface AddServiceModalProps {
  clientId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddServiceModal({ clientId, onClose, onAdded }: AddServiceModalProps) {
  const [services, setServices] = useState<Service[] | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [form, setForm] = useState<AddServiceForm>(EMPTY_SERVICE_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AddServiceForm, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Service[]>("/services", getAccessToken())
      .then(setServices)
      .catch((err) => setServicesError(err.message));
  }, []);

  const previewEnd = form.contractType === "FIXED"
    ? computeEndDate(form.startDate, form.durationValue, form.durationUnit)
    : null;

  function validate(): boolean {
    const e: Partial<Record<keyof AddServiceForm, string>> = {};
    if (!form.serviceId) e.serviceId = "Select a service";
    if (!form.rate || Number(form.rate) <= 0) e.rate = "Enter a positive rate";
    if (!form.startDate) e.startDate = "Required";
    if (form.contractType === "FIXED") {
      if (!form.durationValue || Number(form.durationValue) <= 0)
        e.durationValue = "Enter a positive duration";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const durationMonths = form.contractType === "FIXED"
        ? Math.round(Number(form.durationValue)) * (form.durationUnit === "YEARS" ? 12 : 1)
        : undefined;

      await api.post(
        "/client-services",
        {
          clientId,
          serviceId: form.serviceId,
          rate: Number(form.rate),
          billingCycle: form.billingCycle,
          startDate: form.startDate,
          ...(form.contractType === "FIXED" && previewEnd && {
            endDate: previewEnd.toISOString().split("T")[0],
            contractDurationMonths: durationMonths,
          }),
        },
        getAccessToken()
      );
      onAdded();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inp = (key: keyof AddServiceForm) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-coral-500 ${
      errors[key] ? "border-danger" : "border-[var(--border)]"
    }`;

  function setField<K extends keyof AddServiceForm>(key: K, value: AddServiceForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  return (
    <Modal title="Add service" onClose={onClose}>
      {servicesError && (
        <p className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger dark:text-red-400">{servicesError}</p>
      )}
      {!services && !servicesError && (
        <p className="mb-4 text-sm text-[var(--muted)]">Loading services…</p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">
              Service <span className="text-danger">*</span>
            </span>
            <select
              className={inp("serviceId")}
              value={form.serviceId}
              onChange={(e) => setField("serviceId", e.target.value)}
              disabled={!services}
            >
              <option value="">Select a service…</option>
              {services?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            {errors.serviceId && <p className="mt-1 text-xs text-danger">{errors.serviceId}</p>}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">
              Rate (₹) <span className="text-danger">*</span>
            </span>
            <input
              type="number"
              min="1"
              step="1"
              className={inp("rate")}
              value={form.rate}
              onChange={(e) => setField("rate", e.target.value)}
            />
            {errors.rate && <p className="mt-1 text-xs text-danger">{errors.rate}</p>}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Billing cycle</span>
            <select
              className={inp("billingCycle")}
              value={form.billingCycle}
              onChange={(e) => setField("billingCycle", e.target.value as "MONTHLY" | "ONE_TIME")}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="ONE_TIME">One-time</option>
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">
              Start date <span className="text-danger">*</span>
            </span>
            <input
              type="date"
              className={inp("startDate")}
              value={form.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
            />
            {errors.startDate && <p className="mt-1 text-xs text-danger">{errors.startDate}</p>}
          </label>

          {/* Contract type */}
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm text-[var(--muted)]">Contract term</p>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="contractType"
                  value="ONGOING"
                  checked={form.contractType === "ONGOING"}
                  onChange={() => setField("contractType", "ONGOING")}
                  className="accent-coral-500"
                />
                Ongoing
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="contractType"
                  value="FIXED"
                  checked={form.contractType === "FIXED"}
                  onChange={() => setField("contractType", "FIXED")}
                  className="accent-coral-500"
                />
                Fixed term
              </label>
            </div>
          </div>

          {form.contractType === "FIXED" && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Duration <span className="text-danger">*</span></span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={inp("durationValue")}
                  value={form.durationValue}
                  onChange={(e) => setField("durationValue", e.target.value)}
                />
                {errors.durationValue && <p className="mt-1 text-xs text-danger">{errors.durationValue}</p>}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Unit</span>
                <select
                  className={inp("durationUnit")}
                  value={form.durationUnit}
                  onChange={(e) => setField("durationUnit", e.target.value as "MONTHS" | "YEARS")}
                >
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
              </label>

              {previewEnd && (
                <p className="sm:col-span-2 rounded-lg bg-brand-50 dark:bg-brand-900/20 px-3 py-2 text-xs text-brand-700 dark:text-brand-300">
                  Contract ends: <strong>{formatDate(previewEnd.toISOString())}</strong>
                </p>
              )}
            </>
          )}
        </div>

        {submitError && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger dark:text-red-400">{submitError}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !services}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add service"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Pause / resume service modal ─────────────────────────────────────────────

const SERVICE_PAUSE_REASONS = [
  { value: "NON_PAYMENT", label: "Non-payment" },
  { value: "CLIENT_REQUESTED", label: "Client requested" },
  { value: "SERVICE_ISSUE", label: "Service issue" },
  { value: "OTHER", label: "Other" },
];

interface ServiceStatusModalProps {
  sub: ClientService;
  onClose: () => void;
  onDone: (updated: ClientService) => void;
}

function ServiceStatusModal({ sub, onClose, onDone }: ServiceStatusModalProps) {
  const isPausing = sub.status === "ACTIVE";
  const targetStatus = isPausing ? "PAUSED" : "ACTIVE";

  const [reason, setReason] = useState("NON_PAYMENT");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await api.patch<ClientService>(
        `/client-services/${sub.id}/status`,
        { status: targetStatus, reason, notes: notes.trim() || undefined },
        getAccessToken()
      );
      onDone(updated);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isPausing ? `Pause ${sub.service.name}` : `Resume ${sub.service.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {isPausing && (
          <div className="mb-4">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Reason <span className="text-danger">*</span></span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT_CLS}>
                {SERVICE_PAUSE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">
            Notes <span className="text-xs">(optional)</span>
          </span>
          <textarea
            rows={3}
            className={`${INPUT_CLS} resize-none`}
            placeholder="Internal notes about why this service is being paused…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {submitError && (
          <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger dark:text-red-400">{submitError}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              isPausing ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {submitting ? "Saving…" : isPausing ? "Pause service" : "Resume service"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Posts section ────────────────────────────────────────────────────────────

interface AddPostForm {
  platform: string;
  postUrl: string;
  publishedAt: string;
  reach: string;
  likes: string;
  comments: string;
  shares: string;
}

const EMPTY_POST_FORM: AddPostForm = {
  platform: "Instagram",
  postUrl: "",
  publishedAt: "",
  reach: "0",
  likes: "0",
  comments: "0",
  shares: "0",
};

interface AddPostModalProps {
  clientServiceId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddPostModal({ clientServiceId, onClose, onAdded }: AddPostModalProps) {
  const { error: toastError, success } = useToast();
  const [form, setForm] = useState<AddPostForm>(EMPTY_POST_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AddPostForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Partial<Record<keyof AddPostForm, string>> = {};
    if (!form.publishedAt) e.publishedAt = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post(
        "/posts",
        {
          clientServiceId,
          platform: form.platform,
          ...(form.postUrl.trim() && { postUrl: form.postUrl.trim() }),
          publishedAt: form.publishedAt,
          reach: Number(form.reach) || 0,
          likes: Number(form.likes) || 0,
          comments: Number(form.comments) || 0,
          shares: Number(form.shares) || 0,
        },
        getAccessToken()
      );
      success("Post added");
      onAdded();
    } catch (err) {
      toastError("Failed to add post", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  function setField(key: keyof AddPostForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  return (
    <Modal title="Add post" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Platform</span>
            <select className={INPUT_CLS} value={form.platform} onChange={(e) => setField("platform", e.target.value)}>
              <option>Instagram</option>
              <option>Facebook</option>
              <option>LinkedIn</option>
              <option>Twitter</option>
              <option>YouTube</option>
              <option>Other</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">
              Published date <span className="text-danger">*</span>
            </span>
            <input
              type="date"
              className={`${INPUT_CLS} ${errors.publishedAt ? "border-danger" : ""}`}
              value={form.publishedAt}
              onChange={(e) => setField("publishedAt", e.target.value)}
            />
            {errors.publishedAt && <p className="mt-1 text-xs text-danger">{errors.publishedAt}</p>}
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Post URL (optional)</span>
            <input type="text" className={INPUT_CLS} placeholder="https://…" value={form.postUrl} onChange={(e) => setField("postUrl", e.target.value)} />
          </label>

          {(["reach", "likes", "comments", "shares"] as const).map((f) => (
            <label key={f} className="block text-sm">
              <span className="mb-1 block text-[var(--muted)] capitalize">{f}</span>
              <input type="number" min="0" className={INPUT_CLS} value={form[f]} onChange={(e) => setField(f, e.target.value)} />
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">{submitting ? "Adding…" : "Add post"}</button>
        </div>
      </form>
    </Modal>
  );
}

interface PostsSectionProps {
  clientServiceId: string;
  serviceName: string;
}

function PostsSection({ clientServiceId, serviceName }: PostsSectionProps) {
  const { error: toastError, success } = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Post[]>(`/posts?clientServiceId=${clientServiceId}`, getAccessToken());
      setPosts(data);
    } catch (err) {
      toastError("Failed to load posts", err instanceof Error ? err.message : undefined);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [clientServiceId, toastError]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handleDelete(postId: string) {
    try {
      await api.del(`/posts/${postId}`, getAccessToken());
      success("Post deleted");
      setPosts((prev) => prev?.filter((p) => p.id !== postId) ?? prev);
    } catch (err) {
      toastError("Failed to delete post", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Posts — {serviceName}</p>
        <button onClick={() => setShowAdd(true)} className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">+ Add post</button>
      </div>

      {loading ? (
        <div className="card overflow-hidden p-0"><div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>{["Platform", "Published", "Reach", "Likes", "Comments", "Shares", ""].map((h) => (<th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{h}</th>))}</tr>
            </thead>
            <tbody>{[0,1,2].map((i) => (<tr key={i} className="border-b border-[var(--border)] last:border-0">{[1,2,3,4,5,6,7].map((j) => (<td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-[var(--surface-2)]" /></td>))}</tr>))}</tbody>
          </table>
        </div></div>
      ) : !posts || posts.length === 0 ? (
        <div className="card py-10 text-center"><p className="text-sm text-[var(--muted)]">No posts yet. Use &ldquo;Add post&rdquo; to log the first one.</p></div>
      ) : (
        <div className="card overflow-hidden p-0"><div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Platform</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Published</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Reach</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Likes</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Comments</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Shares</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3"><PlatformBadge platform={post.platform} /></td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatDate(post.publishedAt)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(post.reach)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(post.likes)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(post.comments)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(post.shares)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(post.id)} className="text-[var(--muted)] hover:text-danger" title="Delete post">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {showAdd && (
        <AddPostModal clientServiceId={clientServiceId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); loadPosts(); }} />
      )}
    </section>
  );
}

// ─── Campaigns section ────────────────────────────────────────────────────────

const CAMPAIGN_OBJECTIVES = [
  { value: "LEAD_GENERATION",      label: "Lead Generation" },
  { value: "AWARENESS",            label: "Awareness" },
  { value: "REACH_AND_ENGAGEMENT", label: "Reach & Engagement" },
  { value: "APP_INSTALL",          label: "App Install" },
  { value: "SOCIAL_MEDIA_VIEWS",   label: "Social Media Views" },
  { value: "INFLUENCES",           label: "Influences" },
  { value: "OTHERS",               label: "Others" },
] as const;

interface AddCampaignForm {
  campaignName: string;
  adGroup: string;
  adSet: string;
  objective: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
}

const EMPTY_CAMPAIGN_FORM: AddCampaignForm = {
  campaignName: "",
  adGroup: "",
  adSet: "",
  objective: "",
  spend: "0",
  impressions: "0",
  clicks: "0",
  conversions: "0",
};

interface AddCampaignModalProps {
  clientServiceId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddCampaignModal({ clientServiceId, onClose, onAdded }: AddCampaignModalProps) {
  const { error: toastError, success } = useToast();
  const [form, setForm] = useState<AddCampaignForm>(EMPTY_CAMPAIGN_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AddCampaignForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Partial<Record<keyof AddCampaignForm, string>> = {};
    if (!form.campaignName.trim()) e.campaignName = "Required";
    if (!form.objective) e.objective = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post("/campaigns", {
        clientServiceId,
        campaignName: form.campaignName.trim(),
        adGroup: form.adGroup.trim() || undefined,
        adSet: form.adSet.trim() || undefined,
        objective: form.objective,
        spend: Number(form.spend) || 0,
        impressions: Math.floor(Number(form.impressions)) || 0,
        clicks: Math.floor(Number(form.clicks)) || 0,
        conversions: Math.floor(Number(form.conversions)) || 0,
      }, getAccessToken());
      success("Campaign added");
      onAdded();
    } catch (err) {
      toastError("Failed to add campaign", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  function setField(key: keyof AddCampaignForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  return (
    <Modal title="Add Campaign" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Campaign Name <span className="text-danger">*</span></span>
            <input type="text" className={`${INPUT_CLS} ${errors.campaignName ? "border-danger" : ""}`} value={form.campaignName} onChange={(e) => setField("campaignName", e.target.value)} placeholder="e.g. Summer Sale 2024" />
            {errors.campaignName && <p className="mt-1 text-xs text-danger">{errors.campaignName}</p>}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Ad Group</span>
            <input type="text" className={INPUT_CLS} value={form.adGroup} onChange={(e) => setField("adGroup", e.target.value)} placeholder="Optional" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Ad Set</span>
            <input type="text" className={INPUT_CLS} value={form.adSet} onChange={(e) => setField("adSet", e.target.value)} placeholder="Optional" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Objective <span className="text-danger">*</span></span>
            <select className={`${INPUT_CLS} ${errors.objective ? "border-danger" : ""}`} value={form.objective} onChange={(e) => setField("objective", e.target.value)}>
              <option value="">Select objective…</option>
              {CAMPAIGN_OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.objective && <p className="mt-1 text-xs text-danger">{errors.objective}</p>}
          </label>
          <label className="block text-sm"><span className="mb-1 block text-[var(--muted)]">Spend (₹)</span><input type="number" min="0" className={INPUT_CLS} value={form.spend} onChange={(e) => setField("spend", e.target.value)} /></label>
          <label className="block text-sm"><span className="mb-1 block text-[var(--muted)]">Impressions</span><input type="number" min="0" step="1" className={INPUT_CLS} value={form.impressions} onChange={(e) => setField("impressions", e.target.value)} /></label>
          <label className="block text-sm"><span className="mb-1 block text-[var(--muted)]">Clicks</span><input type="number" min="0" step="1" className={INPUT_CLS} value={form.clicks} onChange={(e) => setField("clicks", e.target.value)} /></label>
          <label className="block text-sm"><span className="mb-1 block text-[var(--muted)]">Conversions</span><input type="number" min="0" step="1" className={INPUT_CLS} value={form.conversions} onChange={(e) => setField("conversions", e.target.value)} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">{submitting ? "Adding…" : "Add Campaign"}</button>
        </div>
      </form>
    </Modal>
  );
}

interface CampaignsSectionProps {
  clientServiceId: string;
  serviceName: string;
}

function CampaignsSection({ clientServiceId, serviceName }: CampaignsSectionProps) {
  const { error: toastError, success } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Campaign[]>(`/campaigns?clientServiceId=${clientServiceId}`, getAccessToken());
      setCampaigns(data);
    } catch (err) {
      toastError("Failed to load campaigns", err instanceof Error ? err.message : undefined);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [clientServiceId, toastError]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  async function handleDelete(campaignId: string) {
    try {
      await api.del(`/campaigns/${campaignId}`, getAccessToken());
      success("Campaign deleted");
      setCampaigns((prev) => prev?.filter((c) => c.id !== campaignId) ?? prev);
    } catch (err) {
      toastError("Failed to delete campaign", err instanceof Error ? err.message : undefined);
    }
  }

  const objectiveLabel = (val: string) =>
    CAMPAIGN_OBJECTIVES.find((o) => o.value === val)?.label ?? val;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Campaigns — {serviceName}</p>
        <button onClick={() => setShowAdd(true)} className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">+ Add Campaign</button>
      </div>

      {loading ? (
        <div className="card overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"><tr>{["Campaign","Objective","Spend","Impressions","Clicks","Conversions",""].map((h) => (<th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{h}</th>))}</tr></thead><tbody>{[0,1,2].map((i) => (<tr key={i} className="border-b border-[var(--border)] last:border-0">{[1,2,3,4,5,6,7].map((j) => (<td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-[var(--surface-2)]" /></td>))}</tr>))}</tbody></table></div></div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="card py-10 text-center"><p className="text-sm text-[var(--muted)]">No campaigns yet. Click &ldquo;Add Campaign&rdquo; to log the first one.</p></div>
      ) : (
        <div className="card overflow-hidden p-0"><div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Campaign</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Objective</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Spend (₹)</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Impressions</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Clicks</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Conversions</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--ink)]">{c.campaignName}</p>
                    {(c.adGroup || c.adSet) && <p className="text-xs text-[var(--muted)]">{[c.adGroup, c.adSet].filter(Boolean).join(" · ")}</p>}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{objectiveLabel(c.objective)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(c.spend)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(c.impressions)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(c.clicks)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(c.conversions)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(c.id)} className="text-[var(--muted)] hover:text-danger" title="Delete campaign">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {showAdd && <AddCampaignModal clientServiceId={clientServiceId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); loadCampaigns(); }} />}
    </section>
  );
}

// ─── Leads section ────────────────────────────────────────────────────────────

interface AddLeadForm {
  month: string;
  count: string;
  revenueAttributed: string;
}

const EMPTY_LEAD_FORM: AddLeadForm = { month: "", count: "0", revenueAttributed: "0" };

interface AddLeadModalProps {
  clientId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddLeadModal({ clientId, onClose, onAdded }: AddLeadModalProps) {
  const { error: toastError, success } = useToast();
  const [form, setForm] = useState<AddLeadForm>(EMPTY_LEAD_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AddLeadForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Partial<Record<keyof AddLeadForm, string>> = {};
    if (!form.month) e.month = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post("/leads", {
        clientId,
        month: form.month,
        count: Math.floor(Number(form.count)) || 0,
        revenueAttributed: Number(form.revenueAttributed) || 0,
      }, getAccessToken());
      success("Lead entry added");
      onAdded();
    } catch (err) {
      toastError("Failed to add lead entry", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  function setField(key: keyof AddLeadForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  return (
    <Modal title="Add entry" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Month <span className="text-danger">*</span></span>
            <input type="month" className={`${INPUT_CLS} ${errors.month ? "border-danger" : ""}`} value={form.month} onChange={(e) => setField("month", e.target.value)} />
            {errors.month && <p className="mt-1 text-xs text-danger">{errors.month}</p>}
          </label>
          <label className="block text-sm"><span className="mb-1 block text-[var(--muted)]">Leads</span><input type="number" min="0" step="1" className={INPUT_CLS} value={form.count} onChange={(e) => setField("count", e.target.value)} /></label>
          <label className="block text-sm"><span className="mb-1 block text-[var(--muted)]">Revenue attributed (₹)</span><input type="number" min="0" className={INPUT_CLS} value={form.revenueAttributed} onChange={(e) => setField("revenueAttributed", e.target.value)} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">{submitting ? "Adding…" : "Add entry"}</button>
        </div>
      </form>
    </Modal>
  );
}

interface LeadsSectionProps {
  clientId: string;
}

function LeadsSection({ clientId }: LeadsSectionProps) {
  const { error: toastError, success } = useToast();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Lead[]>(`/leads?clientId=${clientId}`, getAccessToken());
      setLeads(data);
    } catch (err) {
      toastError("Failed to load leads", err instanceof Error ? err.message : undefined);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, toastError]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  async function handleDelete(leadId: string) {
    try {
      await api.del(`/leads/${leadId}`, getAccessToken());
      success("Lead entry deleted");
      setLeads((prev) => prev?.filter((l) => l.id !== leadId) ?? prev);
    } catch (err) {
      toastError("Failed to delete lead entry", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Lead pipeline</p>
        <button onClick={() => setShowAdd(true)} className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">+ Add entry</button>
      </div>

      {loading ? (
        <div className="card overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"><tr>{["Month","Leads","Revenue attributed (₹)",""].map((h) => (<th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{h}</th>))}</tr></thead><tbody>{[0,1,2].map((i) => (<tr key={i} className="border-b border-[var(--border)] last:border-0">{[1,2,3,4].map((j) => (<td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-[var(--surface-2)]" /></td>))}</tr>))}</tbody></table></div></div>
      ) : !leads || leads.length === 0 ? (
        <div className="card py-10 text-center"><p className="text-sm text-[var(--muted)]">No lead data yet. Use &ldquo;Add entry&rdquo; to log the first month.</p></div>
      ) : (
        <div className="card overflow-hidden p-0"><div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Month</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Leads</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Revenue attributed (₹)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">{formatMonth(lead.month)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatNumber(lead.count)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(lead.revenueAttributed)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(lead.id)} className="text-[var(--muted)] hover:text-danger" title="Delete entry">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {showAdd && <AddLeadModal clientId={clientId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); loadLeads(); }} />}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { error: toastError, success: toastSuccess } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [subscriptions, setSubscriptions] = useState<ClientService[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [clientStatusModal, setClientStatusModal] = useState<"SUSPENDED" | "ACTIVE" | "INACTIVE" | null>(null);
  const [serviceStatusSub, setServiceStatusSub] = useState<ClientService | null>(null);

  const [editingAgreement, setEditingAgreement] = useState(false);
  const [agreementText, setAgreementText] = useState("");
  const [savingAgreement, setSavingAgreement] = useState(false);

  async function saveAgreement() {
    setSavingAgreement(true);
    try {
      await api.patch(`/clients/${id}/agreement`, { agreementDetails: agreementText || undefined }, getAccessToken());
      setClient((prev) => prev ? { ...prev, agreementDetails: agreementText || null } : prev);
      setEditingAgreement(false);
      toastSuccess("Agreement details saved");
    } catch (err) {
      toastError("Failed to save agreement", err instanceof Error ? err.message : undefined);
    } finally {
      setSavingAgreement(false);
    }
  }

  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [downloadingReport, setDownloadingReport] = useState(false);

  async function downloadReport() {
    if (!client) return;
    setDownloadingReport(true);
    try {
      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/reports/${id}/pdf?month=${reportMonth}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${client.companyName}_Report_${reportMonth}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError("Report failed", err instanceof Error ? err.message : undefined);
    } finally {
      setDownloadingReport(false);
    }
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const token = getAccessToken();
      const [c, subs, invs] = await Promise.all([
        api.get<Client>(`/clients/${id}`, token),
        api.get<ClientService[]>(`/client-services?clientId=${id}`, token),
        api.get<Invoice[]>(`/invoices?clientId=${id}`, token),
      ]);
      setClient(c);
      setSubscriptions(subs);
      setInvoices(invs);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const reloadSubscriptions = useCallback(async () => {
    try {
      const subs = await api.get<ClientService[]>(`/client-services?clientId=${id}`, getAccessToken());
      setSubscriptions(subs);
    } catch {
      // silently retry on next full reload
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  if (pageError) return <p className="text-sm text-danger">{pageError}</p>;
  if (!client) return null;

  const isSuspended = client.status === "SUSPENDED";

  const smmSubs = (subscriptions ?? []).filter((s) => s.status === "ACTIVE" && s.service.category === "SMM");
  const adsSubs = (subscriptions ?? []).filter(
    (s) => s.status === "ACTIVE" && (s.service.category === "GOOGLE_ADS" || s.service.category === "META_ADS")
  );

  return (
    <div className="space-y-6">
      {/* Top nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/clients" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back to clients
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none focus:border-brand-500"
            />
            <button
              onClick={downloadReport}
              disabled={downloadingReport}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloadingReport ? "Generating…" : "Monthly report"}
            </button>
          </div>

          {/* Suspend / reactivate actions */}
          {client.status === "ACTIVE" && (
            <button
              onClick={() => setClientStatusModal("SUSPENDED")}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              Suspend
            </button>
          )}
          {client.status === "SUSPENDED" && (
            <button
              onClick={() => setClientStatusModal("ACTIVE")}
              className="rounded-lg border border-green-400 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              Reactivate
            </button>
          )}
          {client.status !== "INACTIVE" && (
            <button
              onClick={() => setClientStatusModal("INACTIVE")}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-danger"
            >
              Deactivate
            </button>
          )}

          <button
            onClick={() => setShowEdit(true)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]"
          >
            Edit client
          </button>
        </div>
      </div>

      {/* Suspended banner */}
      {isSuspended && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-amber-600" aria-hidden>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Account suspended</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Reason: {client.suspensionReason?.replace(/_/g, " ") ?? "—"}
              {client.suspensionNotes && <> — {client.suspensionNotes}</>}
              {client.suspendedAt && <> · Since {formatDate(client.suspendedAt)}</>}
            </p>
          </div>
        </div>
      )}

      {/* Client heading */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">{client.companyName}</h1>
        <Badge status={client.status} />
      </div>

      {/* Info card */}
      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Client info</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          <InfoRow label="Contact" value={client.contactPerson} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Phone" value={client.phone ?? "—"} />
          <InfoRow label="GSTIN" value={client.gstin ?? "—"} />
          <InfoRow label="Address" value={client.address ?? "—"} />
          <InfoRow label="Account manager" value={client.accountManager?.name ?? "—"} />
          <InfoRow label="Onboarded" value={formatDate(client.onboardedAt)} />
        </dl>
      </div>

      {/* Agreement Details */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Agreement Details</p>
          {!editingAgreement && (
            <button
              onClick={() => { setAgreementText(client.agreementDetails ?? ""); setEditingAgreement(true); }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {client.agreementDetails ? "Edit" : "Add"}
            </button>
          )}
        </div>
        {editingAgreement ? (
          <div className="space-y-3">
            <textarea
              value={agreementText}
              onChange={(e) => setAgreementText(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="e.g. MSA signed 12 Jun 2026, auto-renews annually. Retainer: ₹50,000/month."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-right text-xs text-[var(--muted)]">{agreementText.length}/1000</p>
            <div className="flex gap-2">
              <button
                onClick={saveAgreement}
                disabled={savingAgreement}
                className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {savingAgreement ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditingAgreement(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">
            {client.agreementDetails ?? <span className="text-[var(--muted)]">No agreement details added yet.</span>}
          </p>
        )}
      </div>

      {/* Services */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Services</p>
          <button
            onClick={() => setShowAddService(true)}
            className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
          >
            + Add service
          </button>
        </div>

        {!subscriptions || subscriptions.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-[var(--muted)]">No services added yet. Use &ldquo;Add service&rdquo; to create the first subscription.</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0"><div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Service</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Rate</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Billing</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Since</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Contract</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className={`border-b border-[var(--border)] last:border-0 transition-colors ${
                      sub.status === "PAUSED" ? "bg-amber-50/50 dark:bg-amber-900/10 opacity-75" : "hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{sub.service.name}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{sub.service.category}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(sub.rate)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {sub.billingCycle === "MONTHLY" ? "Monthly" : "One-time"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatDate(sub.startDate)}</td>
                    <td className="px-4 py-3 text-[var(--muted)] text-xs">
                      {contractLabel(sub)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge status={sub.status} />
                        {sub.status === "PAUSED" && sub.pauseReason && (
                          <span className="text-[10px] text-[var(--muted)]" title={sub.pauseNotes ?? undefined}>
                            {sub.pauseReason.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sub.status !== "ENDED" && (
                        <button
                          onClick={() => setServiceStatusSub(sub)}
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            sub.status === "ACTIVE"
                              ? "border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                              : "border border-green-400 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                          }`}
                        >
                          {sub.status === "ACTIVE" ? "Pause" : "Resume"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        )}
      </section>

      {/* Invoices */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Invoices</p>

        {!invoices || invoices.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-[var(--muted)]">No invoices yet.</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0"><div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Period</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-4 py-3"><Badge status={inv.status} /></td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatDate(inv.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        )}
      </section>

      {/* Posts — one section per active SMM subscription */}
      {smmSubs.map((sub) => (
        <PostsSection key={sub.id} clientServiceId={sub.id} serviceName={sub.service.name} />
      ))}

      {/* Campaigns — one section per active Ads subscription */}
      {adsSubs.map((sub) => (
        <CampaignsSection key={sub.id} clientServiceId={sub.id} serviceName={sub.service.name} />
      ))}

      {/* Leads — client-level pipeline */}
      <LeadsSection clientId={id} />

      {/* Modals */}
      {showEdit && client && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setClient((prev) => ({ ...prev, ...updated }));
            setShowEdit(false);
            toastSuccess("Client updated");
          }}
        />
      )}

      {showAddService && (
        <AddServiceModal
          clientId={id}
          onClose={() => setShowAddService(false)}
          onAdded={() => {
            setShowAddService(false);
            reloadSubscriptions();
          }}
        />
      )}

      {clientStatusModal && client && (
        <ClientStatusModal
          client={client}
          targetStatus={clientStatusModal}
          onClose={() => setClientStatusModal(null)}
          onDone={(updated) => {
            setClient((prev) => prev ? { ...prev, ...updated } : updated);
            setClientStatusModal(null);
            toastSuccess(
              clientStatusModal === "ACTIVE"
                ? "Account reactivated"
                : clientStatusModal === "SUSPENDED"
                ? "Account suspended"
                : "Account deactivated"
            );
          }}
        />
      )}

      {serviceStatusSub && (
        <ServiceStatusModal
          sub={serviceStatusSub}
          onClose={() => setServiceStatusSub(null)}
          onDone={(updated) => {
            setSubscriptions((prev) =>
              prev ? prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)) : prev
            );
            setServiceStatusSub(null);
            toastSuccess(updated.status === "PAUSED" ? "Service paused" : "Service resumed");
          }}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--ink)]">{value}</dd>
    </div>
  );
}
