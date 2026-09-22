"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const SERVICES = [
  "SEO (Search Engine Optimisation)",
  "Social Media Marketing",
  "Google Ads",
  "Meta Ads (Facebook & Instagram)",
  "Web Design & Development",
  "Graphic Design",
  "Google My Business (GMB)",
  "E-Commerce Solution",
  "Full Digital Marketing Package",
  "Not sure — I need advice",
];

function DoodleRocket() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", message: "" });
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  function toggleService(s: string) {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    if (errors.services) setErrors((p) => ({ ...p, services: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Required";
    else if (form.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number";
    if (services.length === 0) e.services = "Please select at least one service";
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
          company: form.company.trim() || undefined,
          service: services.join(", "),
          message: form.message.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setApiError("Something went wrong. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="Divyash Digital" className="h-8 w-8 object-contain flex-shrink-0" />
            <span className="font-display font-bold text-lg text-[var(--ink)]">Divyash Digital</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--muted)]">
            <Link href="/services" className="hover:text-coral-500 transition-colors">Services</Link>
            <Link href="/work"     className="hover:text-coral-500 transition-colors">Our Work</Link>
            <Link href="/blog"     className="hover:text-coral-500 transition-colors">Blog</Link>
            <Link href="/contact"  className="text-coral-500 font-semibold">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors px-3 py-1.5">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        {/* Blob accents */}
        <div className="blob pointer-events-none absolute -top-24 -right-24 h-80 w-80 bg-coral-500 opacity-[0.08]" aria-hidden />
        <div className="blob pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 bg-[#2DBFA0] opacity-[0.07]" aria-hidden style={{ animationDelay: "-4s" }} />

        <div className="mx-auto max-w-6xl px-5">
          <p className="section-label mb-4">Get in touch</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--ink)] md:text-5xl mb-4">
            Don't hesitate to <span className="text-coral-500">contact us.</span>
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            At Divyash Digital, we empower businesses with cutting-edge digital marketing solutions
            tailored for growth. Whether you're looking to enhance your online presence or scale your
            business, we're here to help.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">

          {/* Form */}
          <div>
            {submitted ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-16 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h2 className="font-display text-2xl font-bold text-[var(--ink)] mb-2">Message sent!</h2>
                <p className="text-[var(--muted)]">We'll get back to you within 24 hours (Mon–Sat, 10am–6pm IST).</p>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
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

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-[var(--muted)]">Email address *</span>
                    <input type="email" required placeholder="you@company.com" {...field("email")}
                      className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500 ${errors.email ? "border-red-400" : "border-[var(--border)]"}`} />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-[var(--muted)]">Website / Company</span>
                    <input type="text" placeholder="yourcompany.com" {...field("company")}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500" />
                  </label>
                </div>

                <div className="text-sm">
                  <span className={`mb-2 block font-medium ${errors.services ? "text-red-500" : "text-[var(--muted)]"}`}>
                    Services you&apos;re interested in * <span className="text-[10px] font-normal">(select all that apply)</span>
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SERVICES.map((s) => {
                      const checked = services.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleService(s)}
                          className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all ${
                            checked
                              ? "border-coral-500 bg-coral-50 text-coral-700 dark:bg-coral-900/20 dark:text-coral-300"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:border-coral-500/50"
                          }`}
                        >
                          <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-coral-500 bg-coral-500" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                            {checked && (
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="2 6 5 9 10 3" />
                              </svg>
                            )}
                          </span>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  {errors.services && <p className="mt-1.5 text-xs text-red-500">{errors.services}</p>}
                </div>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-[var(--muted)]">Tell us about your business</span>
                  <textarea rows={4} placeholder="What does your business do? What's your main marketing challenge?" {...field("message")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500 resize-none" />
                </label>

                {apiError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{apiError}</p>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full rounded-full bg-coral-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition-all hover:bg-coral-600 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 motion-reduce:translate-y-0">
                  {submitting ? "Sending…" : "Book free audit →"}
                </button>

                <p className="text-center text-xs text-[var(--muted)]">
                  We'll respond within 24 hours · Mon–Sat, 10am–6pm IST
                </p>
              </form>
            )}
          </div>

          {/* Sidebar — contact info */}
          <div className="space-y-5 lg:self-start lg:sticky lg:top-24">

            {/* Direct contacts */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="section-label mb-5">Direct contact</p>

              <a href="tel:+918810376026"
                className="flex items-center gap-4 rounded-xl p-3 hover:bg-[var(--surface-2)] transition-colors group mb-2">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-coral-100 text-coral-500 dark:bg-coral-900/30">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)] mb-0.5">Call us</p>
                  <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-coral-500 transition-colors">+91 88103 76026</p>
                </div>
              </a>

              <a href="tel:+919266452049"
                className="flex items-center gap-4 rounded-xl p-3 hover:bg-[var(--surface-2)] transition-colors group mb-2">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-coral-100 text-coral-500 dark:bg-coral-900/30">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)] mb-0.5">Customer care</p>
                  <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-coral-500 transition-colors">+91 92664 52049</p>
                </div>
              </a>

              <a href="mailto:info@divyashdigital.co.in"
                className="flex items-center gap-4 rounded-xl p-3 hover:bg-[var(--surface-2)] transition-colors group">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2DBFA0]/10 text-[#2DBFA0]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)] mb-0.5">Email</p>
                  <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-coral-500 transition-colors">info@divyashdigital.co.in</p>
                </div>
              </a>
            </div>

            {/* Hours */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B7CF7]/10 text-[#5B7CF7]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Business hours</p>
                  <p className="text-sm font-semibold text-[var(--ink)]">Mon – Sat, 10 am – 6 pm IST</p>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-4">Follow us</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Instagram", href: "https://www.instagram.com/divyashdigital/", color: "bg-pink-100 text-pink-600 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400" },
                  { name: "LinkedIn", href: "https://www.linkedin.com/company/divyash-digital/", color: "bg-sky-100 text-sky-600 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-400" },
                  { name: "YouTube", href: "https://www.youtube.com/@divyashdigital", color: "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" },
                  { name: "Pinterest", href: "https://in.pinterest.com/divyashdigitalagency/", color: "bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400" },
                ].map((social) => (
                  <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer"
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${social.color}`}>
                    {social.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Rocket CTA card */}
            <div className="relative overflow-hidden rounded-2xl bg-coral-500 p-6 text-white">
              <div className="blob pointer-events-none absolute -right-6 -top-6 h-20 w-20 bg-white opacity-10" aria-hidden />
              <div className="text-white/60 mb-3"><DoodleRocket /></div>
              <p className="font-display text-lg font-bold mb-1">Free digital audit</p>
              <p className="text-sm opacity-80 mb-4">We'll review your SEO, ads, and website — and tell you exactly where the growth opportunity is.</p>
              <p className="text-xs opacity-60">No commitment. No agency pitch. Just insights.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#1C1410] text-white/40 text-center py-8 text-xs">
        <p>© {new Date().getFullYear()} Divyash Digital · <Link href="/" className="hover:text-coral-400 transition-colors">Home</Link> · info@divyashdigital.co.in</p>
      </footer>
    </div>
  );
}
