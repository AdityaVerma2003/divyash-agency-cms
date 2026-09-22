"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { Client, ClientService, Invoice } from "@/types";

interface LineItem {
  description: string;
  amount: string;
  clientServiceId?: string;
}

const BLANK_ITEM: LineItem = { description: "", amount: "" };

interface FormErrors {
  clientId?: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  items?: string;
  itemRows?: Record<number, { description?: string; amount?: string }>;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { success, error: toastError, warning } = useToast();

  const [clients, setClients] = useState<Client[] | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [items, setItems] = useState<LineItem[]>([{ ...BLANK_ITEM }]);

  const [loadingServices, setLoadingServices] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<Client[]>("/clients", getAccessToken())
      .then(setClients)
      .catch((err: Error) => setClientsError(err.message));
  }, []);

  async function handleClientChange(id: string) {
    setClientId(id);
    if (errors.clientId) setErrors((prev) => ({ ...prev, clientId: undefined }));
    if (!id) {
      setItems([{ ...BLANK_ITEM }]);
      return;
    }
    setLoadingServices(true);
    try {
      const subs = await api.get<ClientService[]>(
        `/client-services?clientId=${id}`,
        getAccessToken()
      );
      const active = subs.filter((s) => s.status === "ACTIVE");
      if (active.length > 0) {
        setItems(
          active.map((s) => ({
            description: s.service.name,
            amount: String(Number(s.rate)),
            clientServiceId: s.id,
          }))
        );
      } else {
        setItems([{ ...BLANK_ITEM }]);
      }
    } catch {
      setItems([{ ...BLANK_ITEM }]);
    } finally {
      setLoadingServices(false);
    }
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    if (errors.itemRows?.[index]?.[field as "description" | "amount"]) {
      setErrors((prev) => {
        const rows = { ...(prev.itemRows ?? {}) };
        if (rows[index]) rows[index] = { ...rows[index], [field]: undefined };
        return { ...prev, itemRows: rows };
      });
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { ...BLANK_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Live totals
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const tax = Number(taxAmount) || 0;
  const total = subtotal + tax;

  function validate(): boolean {
    const e: FormErrors = {};
    if (!clientId) e.clientId = "Select a client";
    if (!periodStart) e.periodStart = "Required";
    if (!periodEnd) {
      e.periodEnd = "Required";
    } else if (periodStart && periodEnd < periodStart) {
      e.periodEnd = "End date must be on or after start date";
      warning("Invalid date range", "Period end must be on or after period start.");
    }
    if (!dueDate) {
      e.dueDate = "Required";
    } else if (periodStart && dueDate < periodStart) {
      e.dueDate = "Due date cannot be before period start";
      warning("Invalid due date", "Due date must be on or after period start.");
    }

    const rowErrors: Record<number, { description?: string; amount?: string }> = {};
    items.forEach((item, i) => {
      const rowE: { description?: string; amount?: string } = {};
      if (!item.description.trim()) rowE.description = "Required";
      if (!item.amount || Number(item.amount) <= 0) rowE.amount = "Enter a positive amount";
      if (Object.keys(rowE).length > 0) rowErrors[i] = rowE;
    });
    if (Object.keys(rowErrors).length > 0) e.itemRows = rowErrors;
    if (items.length === 0) e.items = "Add at least one line item";

    setErrors(e);
    return (
      !e.clientId &&
      !e.periodStart &&
      !e.periodEnd &&
      !e.dueDate &&
      !e.items &&
      Object.keys(rowErrors).length === 0
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      warning("Fix errors before submitting", "Please review the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        clientId,
        periodStart,
        periodEnd,
        dueDate,
        taxAmount: Number(taxAmount) || 0,
        items: items.map((item) => ({
          description: item.description.trim(),
          amount: Number(item.amount),
          ...(item.clientServiceId ? { clientServiceId: item.clientServiceId } : {}),
        })),
      };
      const created = await api.post<Invoice>("/invoices", payload, getAccessToken());
      success("Invoice created", "Redirecting to invoice details…");
      router.push(`/admin/invoices/${created.id}`);
    } catch (err) {
      toastError("Could not create invoice", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase =
    "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500";
  const inp = (hasError: boolean) =>
    `${inputBase} ${hasError ? "border-danger" : "border-[var(--border)]"}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/invoices" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
            ← Back to invoices
          </Link>
          <h1 className="mt-1 text-lg font-medium text-[var(--ink)]">New invoice</h1>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 space-y-6">
          {/* Client & dates */}
          <div className="card space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Client & period
            </p>

            {clientsError && (
              <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger dark:text-red-400">{clientsError}</p>
            )}

            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">
                Client <span className="text-danger">*</span>
              </span>
              <select
                className={inp(!!errors.clientId)}
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={!clients}
              >
                <option value="">Select a client…</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="mt-1 text-xs text-danger">{errors.clientId}</p>
              )}
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">
                  Period start <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  className={inp(!!errors.periodStart)}
                  value={periodStart}
                  onChange={(e) => {
                    setPeriodStart(e.target.value);
                    if (errors.periodStart) setErrors((prev) => ({ ...prev, periodStart: undefined }));
                  }}
                />
                {errors.periodStart && (
                  <p className="mt-1 text-xs text-danger">{errors.periodStart}</p>
                )}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">
                  Period end <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  className={inp(!!errors.periodEnd)}
                  value={periodEnd}
                  onChange={(e) => {
                    setPeriodEnd(e.target.value);
                    if (errors.periodEnd) setErrors((prev) => ({ ...prev, periodEnd: undefined }));
                  }}
                />
                {errors.periodEnd && (
                  <p className="mt-1 text-xs text-danger">{errors.periodEnd}</p>
                )}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">
                  Due date <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  className={inp(!!errors.dueDate)}
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs text-danger">{errors.dueDate}</p>
                )}
              </label>
            </div>
          </div>

          {/* Line items */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Line items
              </p>
              {loadingServices && (
                <span className="text-xs text-[var(--muted)]">Loading services…</span>
              )}
            </div>

            {errors.items && <p className="text-xs text-danger">{errors.items}</p>}

            <div className="overflow-x-auto">
            <div className="space-y-3 min-w-[360px]">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_140px_32px] gap-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span>Description</span>
                <span>Amount (₹)</span>
                <span />
              </div>

              {items.map((item, i) => {
                const rowErr = errors.itemRows?.[i];
                return (
                  <div key={i} className="grid grid-cols-[1fr_140px_32px] gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Description"
                        className={inp(!!rowErr?.description)}
                        value={item.description}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                      />
                      {rowErr?.description && (
                        <p className="mt-1 text-xs text-danger">{rowErr.description}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0"
                        className={inp(!!rowErr?.amount)}
                        value={item.amount}
                        onChange={(e) => updateItem(i, "amount", e.target.value)}
                      />
                      {rowErr?.amount && (
                        <p className="mt-1 text-xs text-danger">{rowErr.amount}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      className="mt-0.5 flex h-9 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-danger disabled:opacity-30"
                      aria-label="Remove line item"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="text-sm text-coral-500 hover:text-coral-600"
            >
              + Add line item
            </button>

            {/* Tax */}
            <div className="border-t border-[var(--border)] pt-4">
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Tax amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${inputBase} border-[var(--border)] max-w-[200px]`}
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/admin/invoices"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create invoice"}
            </button>
          </div>
        </form>

        {/* Live preview */}
        <aside className="w-full lg:w-64">
          <div className="card sticky top-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Preview
            </p>
            <div className="space-y-2">
              <PreviewRow label="Subtotal" value={formatCurrency(subtotal)} />
              <PreviewRow label="Tax" value={formatCurrency(tax)} />
              <div className="border-t border-[var(--border)] pt-2">
                <PreviewRow label="Total" value={formatCurrency(total)} bold />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-medium text-[var(--ink)]" : "text-[var(--muted)]"}>{label}</span>
      <span className={bold ? "font-medium text-[var(--ink)]" : "text-[var(--muted)]"}>{value}</span>
    </div>
  );
}
