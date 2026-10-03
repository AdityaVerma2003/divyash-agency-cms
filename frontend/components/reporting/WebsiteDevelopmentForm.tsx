"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { INPUT_CLS, Field, SubmitRow } from "./shared";

export default function WebsiteDevelopmentForm({ clientServiceId, onAdded }: { clientServiceId: string; onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    websiteType: "BRAND",
    websiteTypeOther: "",
    pageCount: "",
    platformLanguage: "",
    adminCredentialNote: "",
    seoEnhanced: false,
    domainPlatform: "",
    hosting: "DD_SHARED",
    websiteLink: "",
    maintenanceAgreed: false,
    executionDate: "",
    submissionDate: "",
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        "/admin/service-reports",
        {
          type: "websiteDevelopment",
          clientServiceId,
          websiteType: form.websiteType,
          websiteTypeOther: form.websiteType === "OTHER" ? form.websiteTypeOther : undefined,
          pageCount: form.pageCount ? Number(form.pageCount) : undefined,
          platformLanguage: form.platformLanguage || undefined,
          adminCredentialNote: form.adminCredentialNote || undefined,
          seoEnhanced: form.seoEnhanced,
          domainPlatform: form.domainPlatform || undefined,
          hosting: form.hosting,
          websiteLink: form.websiteLink || undefined,
          maintenanceAgreed: form.maintenanceAgreed,
          executionDate: form.executionDate || undefined,
          submissionDate: form.submissionDate || undefined,
        },
        getAccessToken()
      );
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Type of website">
        <select className={INPUT_CLS} value={form.websiteType} onChange={(e) => setField("websiteType", e.target.value)}>
          <option value="INFOGRAPHIC">Infographic</option>
          <option value="BRAND">Brand</option>
          <option value="ECOMMERCE">E-Commerce</option>
          <option value="CUSTOM_CODED">Custom Coded</option>
          <option value="LANDING_PAGE_ONLY">Landing Page Only</option>
          <option value="OTHER">Other</option>
        </select>
      </Field>
      {form.websiteType === "OTHER" && (
        <Field label="Type (manual)">
          <input className={INPUT_CLS} value={form.websiteTypeOther} onChange={(e) => setField("websiteTypeOther", e.target.value)} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="No. of pages">
          <input type="number" className={INPUT_CLS} value={form.pageCount} onChange={(e) => setField("pageCount", e.target.value)} />
        </Field>
        <Field label="Platform / language used">
          <input className={INPUT_CLS} value={form.platformLanguage} onChange={(e) => setField("platformLanguage", e.target.value)} />
        </Field>
      </div>
      <Field label="Admin credentials (internal note — never shown to the client)">
        <textarea className={`${INPUT_CLS} resize-none`} rows={2} value={form.adminCredentialNote} onChange={(e) => setField("adminCredentialNote", e.target.value)} placeholder="Username / password" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Domain platform">
          <input className={INPUT_CLS} value={form.domainPlatform} onChange={(e) => setField("domainPlatform", e.target.value)} placeholder="GoDaddy, Namecheap…" />
        </Field>
        <Field label="Hosting">
          <select className={INPUT_CLS} value={form.hosting} onChange={(e) => setField("hosting", e.target.value)}>
            <option value="DD_SHARED">Divyash shared</option>
            <option value="CLIENT_OWN">Client's own</option>
          </select>
        </Field>
      </div>
      <Field label="Website link">
        <input className={INPUT_CLS} value={form.websiteLink} onChange={(e) => setField("websiteLink", e.target.value)} placeholder="https://…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of execution">
          <input type="date" className={INPUT_CLS} value={form.executionDate} onChange={(e) => setField("executionDate", e.target.value)} />
        </Field>
        <Field label="Date of submission">
          <input type="date" className={INPUT_CLS} value={form.submissionDate} onChange={(e) => setField("submissionDate", e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.seoEnhanced} onChange={(e) => setField("seoEnhanced", e.target.checked)} />
          <span className="text-[var(--muted)]">SEO enhanced</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.maintenanceAgreed} onChange={(e) => setField("maintenanceAgreed", e.target.checked)} />
          <span className="text-[var(--muted)]">Maintenance agreed</span>
        </label>
      </div>

      <SubmitRow submitting={submitting} error={error} />
    </form>
  );
}
