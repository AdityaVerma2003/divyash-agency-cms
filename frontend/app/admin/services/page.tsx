"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { Service, ClientService } from "@/types";

type ServiceCategory =
  | "SEO" | "SMM" | "GOOGLE_ADS" | "META_ADS"
  | "WEB_DESIGN" | "GRAPHIC_DESIGN" | "CONTENT";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  SEO: "SEO",
  SMM: "Social Media",
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  WEB_DESIGN: "Web Design",
  GRAPHIC_DESIGN: "Graphic Design",
  CONTENT: "Content",
};

const CATEGORY_CONFIG: Record<ServiceCategory, { bg: string; text: string; dot: string }> = {
  SEO:           { bg: "bg-emerald-50 dark:bg-emerald-900/20",   text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  SMM:           { bg: "bg-coral-50 dark:bg-coral-900/20",       text: "text-coral-600 dark:text-coral-400",     dot: "bg-coral-500" },
  GOOGLE_ADS:    { bg: "bg-amber-50 dark:bg-amber-900/20",       text: "text-amber-700 dark:text-amber-400",     dot: "bg-amber-500" },
  META_ADS:      { bg: "bg-purple-50 dark:bg-purple-900/20",     text: "text-purple-700 dark:text-purple-400",   dot: "bg-purple-500" },
  WEB_DESIGN:    { bg: "bg-cyan-50 dark:bg-cyan-900/20",         text: "text-cyan-700 dark:text-cyan-400",       dot: "bg-cyan-500" },
  GRAPHIC_DESIGN:{ bg: "bg-pink-50 dark:bg-pink-900/20",         text: "text-pink-700 dark:text-pink-400",       dot: "bg-pink-500" },
  CONTENT:       { bg: "bg-[var(--surface-2)]",                  text: "text-[var(--muted)]",                    dot: "bg-[var(--muted)]" },
};

const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  SEO: "🔍", SMM: "📱", GOOGLE_ADS: "📊", META_ADS: "🎯",
  WEB_DESIGN: "💻", GRAPHIC_DESIGN: "🎨", CONTENT: "✍️",
};

function CategoryPill({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category as ServiceCategory] ?? CATEGORY_CONFIG.CONTENT;
  const label = CATEGORY_LABELS[category as ServiceCategory] ?? category;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  );
}

interface ServiceForm { name: string; category: ServiceCategory | ""; description: string; }
const EMPTY_FORM: ServiceForm = { name: "", category: "", description: "" };
interface ServiceFormErrors { name?: string; category?: string; }

interface ServiceModalProps {
  existing?: Service;
  onClose: () => void;
  onSaved: (service: Service) => void;
}

function ServiceModal({ existing, onClose, onSaved }: ServiceModalProps) {
  const isEdit = !!existing;
  const { success, error: toastError, warning } = useToast();

  const [form, setForm] = useState<ServiceForm>(
    existing
      ? { name: existing.name, category: existing.category as ServiceCategory, description: existing.description ?? "" }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: ServiceFormErrors = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.category) e.category = "Select a category";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      warning("Please fix the errors", "Required fields are highlighted below.");
    }
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category,
      };
      if (form.description.trim()) payload.description = form.description.trim();

      let saved: Service;
      if (isEdit) {
        saved = await api.patch<Service>(`/services/${existing!.id}`, payload, getAccessToken());
        success("Service updated", `"${saved.name}" has been saved.`);
      } else {
        saved = await api.post<Service>("/services", payload, getAccessToken());
        success("Service created", `"${saved.name}" has been added to the catalog.`);
      }
      onSaved(saved);
    } catch (err) {
      toastError(
        isEdit ? "Could not update service" : "Could not create service",
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function field(key: keyof ServiceForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
        if (errors[key as keyof ServiceFormErrors]) {
          setErrors((prev) => ({ ...prev, [key]: undefined }));
        }
      },
    };
  }

  const inp = (hasError?: boolean) =>
    `w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 ${
      hasError ? "border-danger" : "border-[var(--border)]"
    }`;

  return (
    <Modal title={isEdit ? "Edit service" : "New service"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Name <span className="text-danger">*</span></span>
            <input type="text" className={inp(!!errors.name)} {...field("name")} placeholder="e.g. SEO Basic Plan" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Category <span className="text-danger">*</span></span>
            <select className={inp(!!errors.category)} {...field("category")}>
              <option value="">Select a category…</option>
              {(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-danger">{errors.category}</p>}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Description</span>
            <textarea
              rows={3}
              className={`${inp()} resize-none`}
              {...field("description")}
              placeholder="Optional — describe what this service includes"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-60">
            {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create service"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminServicesPage() {
  const { error: toastError } = useToast();
  const [services, setServices] = useState<Service[] | null>(null);
  const [activeCountMap, setActiveCountMap] = useState<Record<string, number>>({});
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    Promise.all([
      api.get<Service[]>("/services", token),
      api.get<ClientService[]>("/client-services", token).catch(() => [] as ClientService[]),
    ]).then(([svcs, subs]) => {
      setServices(svcs);
      const map: Record<string, number> = {};
      subs.forEach((cs) => {
        if (cs.status === "ACTIVE") map[cs.serviceId] = (map[cs.serviceId] ?? 0) + 1;
      });
      setActiveCountMap(map);
    }).catch((err: Error) => {
      toastError("Could not load services", err.message);
      setServices([]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaved(saved: Service) {
    setServices((prev) => {
      if (!prev) return [saved];
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next;
      }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setShowNew(false);
    setEditTarget(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Services</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {services ? `${services.length} service${services.length !== 1 ? "s" : ""} in catalog` : "Loading…"}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New service
        </button>
      </div>

      {/* Table */}
      {!services ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)] text-2xl">🎯</div>
          <p className="text-sm font-semibold text-[var(--ink)]">No services yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Add your first service to the catalog.</p>
          <button onClick={() => setShowNew(true)} className="btn btn-primary mt-4">+ New service</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/20">
          {/* ── Mobile card list (< md) ── */}
          <div className="divide-y divide-[var(--border)] md:hidden">
            {services.map((svc) => {
              const activeCount = activeCountMap[svc.id] ?? 0;
              const cfg = CATEGORY_CONFIG[svc.category as ServiceCategory] ?? CATEGORY_CONFIG.CONTENT;
              return (
                <div key={svc.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center text-base ${cfg.bg}`}>
                      {CATEGORY_ICONS[svc.category as ServiceCategory] ?? "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-[var(--ink)] leading-tight">{svc.name}</span>
                        <CategoryPill category={svc.category} />
                      </div>
                      {svc.description && (
                        <p className="text-xs text-[var(--muted)] line-clamp-2 mb-2">{svc.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {activeCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {activeCount} active
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">No active subscriptions</span>
                        )}
                        <button onClick={() => setEditTarget(svc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] hover:border-coral-500 hover:text-coral-500 transition-all">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop grid table (≥ md) ── */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_150px_2fr_120px_90px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
              {["Service", "Category", "Description", "Active subs", ""].map((h) => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {services.map((svc) => {
                const activeCount = activeCountMap[svc.id] ?? 0;
                const cfg = CATEGORY_CONFIG[svc.category as ServiceCategory] ?? CATEGORY_CONFIG.CONTENT;
                return (
                  <div key={svc.id} className="group grid grid-cols-[2fr_150px_2fr_120px_90px] items-center px-5 py-4 transition-colors hover:bg-[var(--surface-2)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center text-base ${cfg.bg}`}>
                        {CATEGORY_ICONS[svc.category as ServiceCategory] ?? "📋"}
                      </div>
                      <span className="font-semibold text-[var(--ink)] truncate">{svc.name}</span>
                    </div>
                    <CategoryPill category={svc.category} />
                    <span className="text-sm text-[var(--muted)] line-clamp-2 pr-4">
                      {svc.description ?? <span className="italic opacity-50">No description</span>}
                    </span>
                    <div>
                      {activeCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {activeCount} active
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">—</span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => setEditTarget(svc)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-all hover:border-coral-500 hover:text-coral-500 hover:bg-coral-500/5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showNew && <ServiceModal onClose={() => setShowNew(false)} onSaved={handleSaved} />}
      {editTarget && (
        <ServiceModal existing={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
