"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordInput from "@/components/PasswordInput";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBase =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-coral-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (!token || !email) {
      setError("Invalid reset link — please request a new one");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { email, token, newPassword });
      setDone(true);
      // Redirect to login after 3 seconds
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl shadow-black/5 dark:shadow-black/30">
      {done ? (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="mb-2 font-display text-xl font-semibold text-[var(--ink)]">
            Password updated!
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Redirecting you to sign in…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="mb-2 font-display text-xl font-semibold text-[var(--ink)]">
            Set new password
          </h1>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Choose a strong password with at least 8 characters.
          </p>

          {(!token || !email) && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger dark:border-red-900/30 dark:bg-red-900/20">
              Invalid or missing reset link.{" "}
              <Link href="/forgot-password" className="font-semibold underline">
                Request a new one.
              </Link>
            </div>
          )}

          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--muted)]">New password</span>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Min. 8 characters"
              className={inputBase}
              autoComplete="new-password"
            />
          </label>

          <label className="mb-5 block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--muted)]">Confirm password</span>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              placeholder="Repeat password"
              className={inputBase}
              autoComplete="new-password"
            />
          </label>

          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger dark:border-red-900/30 dark:bg-red-900/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !token || !email}
            className="w-full rounded-xl bg-coral-500 py-3 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition-all hover:bg-coral-600 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] px-6 overflow-hidden">
      <div className="blob pointer-events-none absolute -top-24 -right-24 h-72 w-72 bg-coral-500 opacity-[0.08] dark:opacity-[0.05]" aria-hidden />
      <div className="blob pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 bg-[#2DBFA0] opacity-[0.07] dark:opacity-[0.04]" aria-hidden style={{ animationDelay: "-5s" }} />

      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="absolute left-5 top-5">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-coral-500 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to login
        </Link>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="Divyash Digital" className="mx-auto mb-0 h-20 w-auto object-contain drop-shadow-lg sm:h-24" />
          <p className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Divyash Digital
          </p>
        </div>

        <Suspense fallback={
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 animate-pulse">
            <div className="h-6 w-40 bg-[var(--border)] rounded mb-3 opacity-50" />
            <div className="h-4 w-full bg-[var(--border)] rounded opacity-30 mb-6" />
            <div className="h-11 w-full bg-[var(--border)] rounded-xl opacity-40 mb-4" />
            <div className="h-11 w-full bg-[var(--border)] rounded-xl opacity-40 mb-5" />
            <div className="h-11 w-full bg-coral-500/20 rounded-xl" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
