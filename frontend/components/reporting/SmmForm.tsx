"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { INPUT_CLS, Field, SubmitRow } from "./shared";

export default function SmmForm({ clientServiceId, onAdded }: { clientServiceId: string; onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    postType: "STATIC",
    platform: "META",
    platformOther: "",
    postUrl: "",
    postedAt: "",
    marketingType: "ORGANIC",
    followersGain: "",
    profileReach: "",
    postLikes: "",
    profileVisits: "",
    isPaidAd: false,
    paidAdSpend: "",
    paidFollowersGain: "",
    paidLikes: "",
    paidImpressions: "",
    paidLeadsGenerated: "",
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
          type: "smm",
          clientServiceId,
          postType: form.postType,
          platform: form.platform,
          platformOther: form.platform === "OTHER" ? form.platformOther : undefined,
          postUrl: form.postUrl || undefined,
          postedAt: form.postedAt,
          marketingType: form.marketingType,
          followersGain: form.followersGain ? Number(form.followersGain) : undefined,
          profileReach: form.profileReach ? Number(form.profileReach) : undefined,
          postLikes: form.postLikes ? Number(form.postLikes) : undefined,
          profileVisits: form.profileVisits ? Number(form.profileVisits) : undefined,
          isPaidAd: form.isPaidAd,
          paidAdSpend: form.isPaidAd && form.paidAdSpend ? Number(form.paidAdSpend) : undefined,
          paidFollowersGain: form.isPaidAd && form.paidFollowersGain ? Number(form.paidFollowersGain) : undefined,
          paidLikes: form.isPaidAd && form.paidLikes ? Number(form.paidLikes) : undefined,
          paidImpressions: form.isPaidAd && form.paidImpressions ? Number(form.paidImpressions) : undefined,
          paidLeadsGenerated: form.isPaidAd && form.paidLeadsGenerated ? Number(form.paidLeadsGenerated) : undefined,
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Post type">
          <select className={INPUT_CLS} value={form.postType} onChange={(e) => setField("postType", e.target.value)}>
            <option value="STATIC">Static</option>
            <option value="CAROUSEL">Carousel</option>
            <option value="REEL">Reel</option>
          </select>
        </Field>
        <Field label="Platform">
          <select className={INPUT_CLS} value={form.platform} onChange={(e) => setField("platform", e.target.value)}>
            <option value="META">Meta</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="X">X</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
      </div>
      {form.platform === "OTHER" && (
        <Field label="Platform (manual)">
          <input className={INPUT_CLS} value={form.platformOther} onChange={(e) => setField("platformOther", e.target.value)} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of posting">
          <input type="date" className={INPUT_CLS} value={form.postedAt} onChange={(e) => setField("postedAt", e.target.value)} required />
        </Field>
        <Field label="Type of marketing">
          <select className={INPUT_CLS} value={form.marketingType} onChange={(e) => setField("marketingType", e.target.value)}>
            <option value="ORGANIC">Organic</option>
            <option value="PAID">Paid</option>
          </select>
        </Field>
      </div>
      <Field label="Post URL (optional)">
        <input className={INPUT_CLS} value={form.postUrl} onChange={(e) => setField("postUrl", e.target.value)} placeholder="https://…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Followers gain (Meta/YT)">
          <input type="number" className={INPUT_CLS} value={form.followersGain} onChange={(e) => setField("followersGain", e.target.value)} />
        </Field>
        <Field label="Profile reach (Meta/YT)">
          <input type="number" className={INPUT_CLS} value={form.profileReach} onChange={(e) => setField("profileReach", e.target.value)} />
        </Field>
        <Field label="Post likes (Meta)">
          <input type="number" className={INPUT_CLS} value={form.postLikes} onChange={(e) => setField("postLikes", e.target.value)} />
        </Field>
        <Field label="Profile visits (Meta)">
          <input type="number" className={INPUT_CLS} value={form.profileVisits} onChange={(e) => setField("profileVisits", e.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isPaidAd} onChange={(e) => setField("isPaidAd", e.target.checked)} />
        <span className="text-[var(--muted)]">This post was boosted with Paid Ads</span>
      </label>

      {form.isPaidAd && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] p-3">
          <Field label="Ad spend (₹)">
            <input type="number" className={INPUT_CLS} value={form.paidAdSpend} onChange={(e) => setField("paidAdSpend", e.target.value)} />
          </Field>
          <Field label="Followers gain (paid)">
            <input type="number" className={INPUT_CLS} value={form.paidFollowersGain} onChange={(e) => setField("paidFollowersGain", e.target.value)} />
          </Field>
          <Field label="Likes (paid)">
            <input type="number" className={INPUT_CLS} value={form.paidLikes} onChange={(e) => setField("paidLikes", e.target.value)} />
          </Field>
          <Field label="Impressions (paid)">
            <input type="number" className={INPUT_CLS} value={form.paidImpressions} onChange={(e) => setField("paidImpressions", e.target.value)} />
          </Field>
          <Field label="Leads generated (paid)">
            <input type="number" className={INPUT_CLS} value={form.paidLeadsGenerated} onChange={(e) => setField("paidLeadsGenerated", e.target.value)} />
          </Field>
        </div>
      )}

      <SubmitRow submitting={submitting} error={error} />
    </form>
  );
}
