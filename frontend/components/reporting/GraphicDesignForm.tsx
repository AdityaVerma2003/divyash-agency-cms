"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { INPUT_CLS, Field, SubmitRow } from "./shared";

export default function GraphicDesignForm({ clientServiceId, onAdded }: { clientServiceId: string; onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    designType: "SOCIAL_MEDIA_POST",
    designTypeOther: "",
    itemCount: "1",
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
          type: "graphicDesigning",
          clientServiceId,
          designType: form.designType,
          designTypeOther: form.designType === "OTHER" ? form.designTypeOther : undefined,
          itemCount: Number(form.itemCount) || 1,
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
        <select className={INPUT_CLS} value={form.designType} onChange={(e) => setField("designType", e.target.value)}>
          <option value="VIDEO_EDITING">Video Editing</option>
          <option value="BRANDING">Branding</option>
          <option value="SOCIAL_MEDIA_POST">Social Media Post</option>
          <option value="AUDIO_BOOSTING">Audio Boosting</option>
          <option value="LONG_VIDEO_EDITING">Long Video Editing</option>
          <option value="THREE_D_ANIMATION">3D Animation</option>
          <option value="LOGO_DESIGN">Logo Design</option>
          <option value="OTHER">Other</option>
        </select>
      </Field>
      {form.designType === "OTHER" && (
        <Field label="Type (manual)">
          <input className={INPUT_CLS} value={form.designTypeOther} onChange={(e) => setField("designTypeOther", e.target.value)} />
        </Field>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Field label="No. of items">
          <input type="number" min="1" className={INPUT_CLS} value={form.itemCount} onChange={(e) => setField("itemCount", e.target.value)} />
        </Field>
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
