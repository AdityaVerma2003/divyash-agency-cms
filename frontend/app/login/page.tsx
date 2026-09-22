"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, homePathForRole } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase =
    "w-full rounded-xl border bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500 motion-reduce:transition-none";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] px-6 overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="blob pointer-events-none absolute -top-24 -right-24 h-72 w-72 bg-coral-500 opacity-[0.08] dark:opacity-[0.05]"
        aria-hidden
      />
      <div
        className="blob pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 bg-[#2DBFA0] opacity-[0.07] dark:opacity-[0.04]"
        aria-hidden
        style={{ animationDelay: "-5s" }}
      />

      {/* Theme toggle */}
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      {/* Back link */}
      <div className="absolute left-5 top-5">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-coral-500 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </Link>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.webp"
            alt="Divyash Digital"
            className="mx-auto mb-4 h-16 w-16 object-contain drop-shadow-lg"
          />
          <p className="font-display text-lg font-bold text-[var(--ink)]">Divyash Digital</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Sign in to your portal</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl shadow-black/5 dark:shadow-black/30">
          <form onSubmit={handleSubmit} noValidate>
            <h1 className="mb-6 font-display text-xl font-semibold text-[var(--ink)]">Welcome back</h1>

            <label className="mb-4 block text-sm">
              <span className="mb-1.5 block font-medium text-[var(--muted)]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputBase} border-[var(--border)]`}
                placeholder="you@company.com"
              />
            </label>

            <label className="mb-6 block text-sm">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-medium text-[var(--muted)]">Password</span>
                <Link href="/forgot-password" className="text-xs text-coral-500 hover:text-coral-600 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                value={password}
                onChange={setPassword}
                className={`${inputBase} border-[var(--border)]`}
                autoComplete="current-password"
              />
            </label>

            {error && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger dark:border-red-900/30 dark:bg-red-900/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-coral-500 py-3 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition-all hover:bg-coral-600 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 motion-reduce:translate-y-0"
            >
              {submitting ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
