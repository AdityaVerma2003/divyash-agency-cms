"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { INPUT_CLS, Field, SubmitRow } from "./shared";

const EMPTY_COUNTRY = { country: "", visits: "" };

export default function SeoForm({ clientServiceId, onAdded }: { clientServiceId: string; onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    entryDate: "",
    backlinksCreated: "0",
    directorySubmissions: "0",
    articleSubmissions: "0",
    imageSubmissions: "0",
    profileCreations: "0",
    approvedLinks: "0",
    keywordRanking: "",
    serpRanking: "",
    trafficGain: "0",
  });
  const [countries, setCountries] = useState([{ ...EMPTY_COUNTRY }, { ...EMPTY_COUNTRY }, { ...EMPTY_COUNTRY }, { ...EMPTY_COUNTRY }, { ...EMPTY_COUNTRY }]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const countryTraffic = countries
        .filter((c) => c.country.trim())
        .map((c) => ({ country: c.country.trim(), visits: Number(c.visits) || 0 }));

      await api.post(
        "/admin/service-reports",
        {
          type: "seo",
          clientServiceId,
          entryDate: form.entryDate,
          backlinksCreated: Number(form.backlinksCreated),
          directorySubmissions: Number(form.directorySubmissions),
          articleSubmissions: Number(form.articleSubmissions),
          imageSubmissions: Number(form.imageSubmissions),
          profileCreations: Number(form.profileCreations),
          approvedLinks: Number(form.approvedLinks),
          keywordRanking: form.keywordRanking || undefined,
          serpRanking: form.serpRanking || undefined,
          trafficGain: Number(form.trafficGain),
          countryTraffic: countryTraffic.length > 0 ? countryTraffic : undefined,
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
      <Field label="Date">
        <input type="date" className={INPUT_CLS} value={form.entryDate} onChange={(e) => setField("entryDate", e.target.value)} required />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Backlinks created">
          <input type="number" className={INPUT_CLS} value={form.backlinksCreated} onChange={(e) => setField("backlinksCreated", e.target.value)} />
        </Field>
        <Field label="Directory submissions">
          <input type="number" className={INPUT_CLS} value={form.directorySubmissions} onChange={(e) => setField("directorySubmissions", e.target.value)} />
        </Field>
        <Field label="Article submissions">
          <input type="number" className={INPUT_CLS} value={form.articleSubmissions} onChange={(e) => setField("articleSubmissions", e.target.value)} />
        </Field>
        <Field label="Image submissions">
          <input type="number" className={INPUT_CLS} value={form.imageSubmissions} onChange={(e) => setField("imageSubmissions", e.target.value)} />
        </Field>
        <Field label="Profile creations">
          <input type="number" className={INPUT_CLS} value={form.profileCreations} onChange={(e) => setField("profileCreations", e.target.value)} />
        </Field>
        <Field label="Approved links">
          <input type="number" className={INPUT_CLS} value={form.approvedLinks} onChange={(e) => setField("approvedLinks", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Keyword ranking">
          <input className={INPUT_CLS} value={form.keywordRanking} onChange={(e) => setField("keywordRanking", e.target.value)} placeholder="keyword — rank" />
        </Field>
        <Field label="SERP ranking">
          <input className={INPUT_CLS} value={form.serpRanking} onChange={(e) => setField("serpRanking", e.target.value)} />
        </Field>
      </div>
      <Field label="Traffic gain">
        <input type="number" className={INPUT_CLS} value={form.trafficGain} onChange={(e) => setField("trafficGain", e.target.value)} />
      </Field>

      <div>
        <span className="mb-1 block text-sm text-[var(--muted)]">Traffic by country (at least 5)</span>
        <div className="space-y-2">
          {countries.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px] gap-2">
              <input
                className={INPUT_CLS}
                placeholder={`Country ${i + 1}`}
                value={c.country}
                onChange={(e) => setCountries((cs) => cs.map((row, idx) => (idx === i ? { ...row, country: e.target.value } : row)))}
              />
              <input
                type="number"
                className={INPUT_CLS}
                placeholder="Visits"
                value={c.visits}
                onChange={(e) => setCountries((cs) => cs.map((row, idx) => (idx === i ? { ...row, visits: e.target.value } : row)))}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCountries((cs) => [...cs, { ...EMPTY_COUNTRY }])}
          className="mt-2 text-xs font-medium text-coral-600 hover:underline"
        >
          + Add country
        </button>
      </div>

      <SubmitRow submitting={submitting} error={error} />
    </form>
  );
}
