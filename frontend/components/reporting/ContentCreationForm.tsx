"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { INPUT_CLS, Field, SubmitRow } from "./shared";

export default function ContentCreationForm({ clientServiceId, onAdded }: { clientServiceId: string; onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contentType: "CONTENT_SHOOT",
    contentTypeOther: "",
    executionDate: "",
    submissionDate: "",
    notes: "",
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
          type: "contentCreation",
          clientServiceId,
          contentType: form.contentType,
          contentTypeOther: form.contentType === "OTHER" ? form.contentTypeOther : undefined,
          executionDate: form.executionDate,
          submissionDate: form.submissionDate || undefined,
          notes: form.notes || undefined,
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
      <Field label="Type">
        <select className={INPUT_CLS} value={form.contentType} onChange={(e) => setField("contentType", e.target.value)}>
          <option value="CONTENT_SHOOT">Content Shoot</option>
          <option value="COPYWRITING">Copywriting</option>
          <option value="SCRIPT_WRITING">Script Writing</option>
          <option value="OTHER">Other</option>
        </select>
      </Field>
      {form.contentType === "OTHER" && (
        <Field label="Type (manual)">
          <input className={INPUT_CLS} value={form.contentTypeOther} onChange={(e) => setField("contentTypeOther", e.target.value)} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of execution">
          <input type="date" className={INPUT_CLS} value={form.executionDate} onChange={(e) => setField("executionDate", e.target.value)} required />
        </Field>
        <Field label="Date of submission">
          <input type="date" className={INPUT_CLS} value={form.submissionDate} onChange={(e) => setField("submissionDate", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea className={`${INPUT_CLS} resize-none`} rows={2} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
      </Field>

      <SubmitRow submitting={submitting} error={error} />
    </form>
  );
}
