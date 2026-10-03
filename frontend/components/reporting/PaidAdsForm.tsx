"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { INPUT_CLS, Field, SubmitRow } from "./shared";

export default function PaidAdsForm({ clientServiceId, onAdded }: { clientServiceId: string; onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    campaignName: "",
    adGroup: "",
    adSet: "",
    objective: "LEAD_GEN",
    setupDate: "",
    dailyBudget: "",
    month: "",
    spend: "0",
    reach: "",
    impressions: "",
    clicks: "",
    conversions: "",
    leads: "",
    leadsConverted: "",
    profileVisits: "",
    addToCart: "",
    revenueGeneratedPct: "",
    cpl: "",
    cpc: "",
    cpv: "",
    targetedCountries: "",
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const targetedCountries = form.targetedCountries
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      await api.post(
        "/admin/service-reports",
        {
          type: "paidAds",
          clientServiceId,
          campaignName: form.campaignName,
          adGroup: form.adGroup || undefined,
          adSet: form.adSet || undefined,
          objective: form.objective,
          setupDate: form.setupDate,
          dailyBudget: Number(form.dailyBudget),
          month: form.month,
          spend: Number(form.spend) || 0,
          reach: form.reach ? Number(form.reach) : undefined,
          impressions: form.impressions ? Number(form.impressions) : undefined,
          clicks: form.clicks ? Number(form.clicks) : undefined,
          conversions: form.conversions ? Number(form.conversions) : undefined,
          leads: form.leads ? Number(form.leads) : undefined,
          leadsConverted: form.leadsConverted ? Number(form.leadsConverted) : undefined,
          profileVisits: form.profileVisits ? Number(form.profileVisits) : undefined,
          addToCart: form.addToCart ? Number(form.addToCart) : undefined,
          revenueGeneratedPct: form.revenueGeneratedPct ? Number(form.revenueGeneratedPct) : undefined,
          cpl: form.cpl ? Number(form.cpl) : undefined,
          cpc: form.cpc ? Number(form.cpc) : undefined,
          cpv: form.cpv ? Number(form.cpv) : undefined,
          targetedCountries: targetedCountries.length > 0 ? targetedCountries : undefined,
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

  const obj = form.objective;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Campaign name">
          <input className={INPUT_CLS} value={form.campaignName} onChange={(e) => setField("campaignName", e.target.value)} required />
        </Field>
        <Field label="Ad group">
          <input className={INPUT_CLS} value={form.adGroup} onChange={(e) => setField("adGroup", e.target.value)} />
        </Field>
        <Field label="Ad set">
          <input className={INPUT_CLS} value={form.adSet} onChange={(e) => setField("adSet", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date of setup">
          <input type="date" className={INPUT_CLS} value={form.setupDate} onChange={(e) => setField("setupDate", e.target.value)} required />
        </Field>
        <Field label="Daily budget (₹)">
          <input type="number" className={INPUT_CLS} value={form.dailyBudget} onChange={(e) => setField("dailyBudget", e.target.value)} required />
        </Field>
        <Field label="Reporting month">
          <input type="month" className={INPUT_CLS} value={form.month} onChange={(e) => setField("month", e.target.value)} required />
        </Field>
      </div>
      <Field label="Objective">
        <select className={INPUT_CLS} value={form.objective} onChange={(e) => setField("objective", e.target.value)}>
          <option value="LEAD_GEN">Lead Generation</option>
          <option value="AWARENESS">Awareness</option>
          <option value="SALES">Sales</option>
          <option value="TRAFFIC">Traffic</option>
          <option value="PROMOTION">Promotion</option>
        </select>
      </Field>
      <Field label="Month total ad spend (₹)">
        <input type="number" className={INPUT_CLS} value={form.spend} onChange={(e) => setField("spend", e.target.value)} />
      </Field>

      <div className="grid grid-cols-3 gap-3 rounded-lg border border-[var(--border)] p-3">
        {obj === "LEAD_GEN" && (
          <>
            <Field label="Leads received"><input type="number" className={INPUT_CLS} value={form.leads} onChange={(e) => setField("leads", e.target.value)} /></Field>
            <Field label="Leads converted"><input type="number" className={INPUT_CLS} value={form.leadsConverted} onChange={(e) => setField("leadsConverted", e.target.value)} /></Field>
            <Field label="Revenue generated (%)"><input type="number" className={INPUT_CLS} value={form.revenueGeneratedPct} onChange={(e) => setField("revenueGeneratedPct", e.target.value)} /></Field>
            <Field label="CPL (₹)"><input type="number" className={INPUT_CLS} value={form.cpl} onChange={(e) => setField("cpl", e.target.value)} /></Field>
          </>
        )}
        {obj === "AWARENESS" && (
          <>
            <Field label="Total reach"><input type="number" className={INPUT_CLS} value={form.reach} onChange={(e) => setField("reach", e.target.value)} /></Field>
            <Field label="Impressions"><input type="number" className={INPUT_CLS} value={form.impressions} onChange={(e) => setField("impressions", e.target.value)} /></Field>
            <Field label="Profile visits"><input type="number" className={INPUT_CLS} value={form.profileVisits} onChange={(e) => setField("profileVisits", e.target.value)} /></Field>
            <Field label="CPV (₹)"><input type="number" className={INPUT_CLS} value={form.cpv} onChange={(e) => setField("cpv", e.target.value)} /></Field>
          </>
        )}
        {obj === "SALES" && (
          <>
            <Field label="Clicks"><input type="number" className={INPUT_CLS} value={form.clicks} onChange={(e) => setField("clicks", e.target.value)} /></Field>
            <Field label="Visits"><input type="number" className={INPUT_CLS} value={form.profileVisits} onChange={(e) => setField("profileVisits", e.target.value)} /></Field>
            <Field label="Add to cart"><input type="number" className={INPUT_CLS} value={form.addToCart} onChange={(e) => setField("addToCart", e.target.value)} /></Field>
            <Field label="Revenue generated (%)"><input type="number" className={INPUT_CLS} value={form.revenueGeneratedPct} onChange={(e) => setField("revenueGeneratedPct", e.target.value)} /></Field>
          </>
        )}
        {obj === "TRAFFIC" && (
          <>
            <Field label="Profile/website traffic"><input type="number" className={INPUT_CLS} value={form.profileVisits} onChange={(e) => setField("profileVisits", e.target.value)} /></Field>
            <Field label="CPC (₹)"><input type="number" className={INPUT_CLS} value={form.cpc} onChange={(e) => setField("cpc", e.target.value)} /></Field>
          </>
        )}
        {obj === "PROMOTION" && (
          <>
            <Field label="Link clicks"><input type="number" className={INPUT_CLS} value={form.clicks} onChange={(e) => setField("clicks", e.target.value)} /></Field>
            <Field label="CPC (₹)"><input type="number" className={INPUT_CLS} value={form.cpc} onChange={(e) => setField("cpc", e.target.value)} /></Field>
            <Field label="Conversions"><input type="number" className={INPUT_CLS} value={form.conversions} onChange={(e) => setField("conversions", e.target.value)} /></Field>
          </>
        )}
      </div>

      <Field label="Targeted countries (comma-separated)">
        <input className={INPUT_CLS} value={form.targetedCountries} onChange={(e) => setField("targetedCountries", e.target.value)} placeholder="India, UAE, USA" />
      </Field>

      <SubmitRow submitting={submitting} error={error} />
    </form>
  );
}
