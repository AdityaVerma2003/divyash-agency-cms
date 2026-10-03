"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const OPEN_ROLES = [
  "SEO Executive",
  "Social Media Manager",
  "Performance Marketing / Ads Specialist",
  "Web Developer",
  "Graphic Designer",
  "Content Writer",
  "Client Servicing / Account Manager",
  "Other",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CareersPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((p) => ({ ...p, [key]: e.target.value }));
        if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
      },
    };
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^\d+\s\-()]/g, "");
    setForm((p) => ({ ...p, phone: val }));
    if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Required";
    else if (form.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number";
    if (!form.role) e.role = "Please select a role";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          service: `Careers — ${form.role}`,
          message: form.message.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setApiError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <Nav />

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        <div className="blob pointer-events-none absolute -top-24 -right-24 h-80 w-80 bg-coral-500 opacity-[0.08]" aria-hidden />
        <div className="blob pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 bg-[#2DBFA0] opacity-[0.07]" aria-hidden style={{ animationDelay: "-4s" }} />

        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="section-label mb-4">Careers</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--ink)] md:text-5xl mb-4">
            Join the <span className="text-coral-500">Divyash team.</span>
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            We're always looking for curious, driven people who love digital marketing. Tell us a
            little about yourself and the role you're interested in — we'll get back to you soon.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-2xl px-5 pb-24">
        {submitted ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-[var(--ink)] mb-2">Application received!</h2>
            <p className="text-[var(--muted)]">Thanks for your interest — we'll review your details and get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--muted)]">Full name *</span>
                <input type="text" required placeholder="Your name" {...field("name")}
                  className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500 ${errors.name ? "border-red-400" : "border-[var(--border)]"}`} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[var(--muted)]">Phone number *</span>
                <input type="tel" required placeholder="+91 98765 43210"
                  value={form.phone} onChange={handlePhoneChange}
                  className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500 ${errors.phone ? "border-red-400" : "border-[var(--border)]"}`} />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--muted)]">Email address *</span>
              <input type="email" required placeholder="you@example.com" {...field("email")}
                className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500 ${errors.email ? "border-red-400" : "border-[var(--border)]"}`} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--muted)]">Role you're looking for *</span>
              <select required {...field("role")}
                className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-coral-500 ${errors.role ? "border-red-400" : "border-[var(--border)]"}`}>
                <option value="">Select a role</option>
                {OPEN_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--muted)]">Tell us about yourself</span>
              <textarea rows={4} placeholder="A bit about your experience, portfolio link, or anything else you'd like us to know" {...field("message")}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500 resize-none" />
            </label>

            {apiError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{apiError}</p>
            )}

            <button type="submit" disabled={submitting}
              className="w-full rounded-full bg-coral-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition-all hover:bg-coral-600 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 motion-reduce:translate-y-0">
              {submitting ? "Submitting…" : "Get a call back →"}
            </button>

            <p className="text-center text-xs text-[var(--muted)]">
              We'll get back to you soon · Mon–Sat, 10am–6pm IST
            </p>
          </form>
        )}
      </section>

      <Footer />
    </div>
  );
}
