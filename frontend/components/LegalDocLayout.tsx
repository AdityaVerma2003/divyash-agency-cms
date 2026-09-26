"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export interface LegalSection {
  id: string;
  label: string;
}

interface LegalDocLayoutProps {
  title: string;
  lastUpdated: string;
  intro?: React.ReactNode;
  sections: LegalSection[];
  children: React.ReactNode;
}

/**
 * Shared shell for legal documents (privacy policy, terms, refund policy…).
 * Renders a hero, a sticky scroll-spying index, and the document body.
 */
export default function LegalDocLayout({
  title,
  lastUpdated,
  intro,
  sections,
  children,
}: LegalDocLayoutProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  // Highlight whichever section is currently nearest the top of the viewport
  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const indexList = (
    <ul className="space-y-1">
      {sections.map(({ id, label }, i) => {
        const active = activeId === id;
        return (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active ? "location" : undefined}
              className={`group flex items-start gap-3 rounded-lg border-l-2 py-2.5 pl-3 pr-2 text-[15px] leading-snug transition-all ${
                active
                  ? "border-coral-500 bg-coral-500/10 font-semibold text-coral-500"
                  : "border-transparent text-[var(--muted)] hover:border-coral-500/40 hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              }`}
            >
              <span
                className={`mt-0.5 flex-shrink-0 text-xs font-bold tabular-nums transition-colors ${
                  active ? "text-coral-500" : "text-[var(--muted)]/50 group-hover:text-coral-500"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">{label}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className={`mt-0.5 flex-shrink-0 transition-all ${
                  active
                    ? "text-coral-500 opacity-100"
                    : "opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
                }`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="bg-[var(--page-bg)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 md:pt-36 md:pb-14">
        <div className="blob pointer-events-none absolute -top-24 -left-24 h-72 w-72 bg-[#2DBFA0] opacity-[0.07]" aria-hidden />
        <div className="blob pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 bg-coral-500 opacity-[0.06]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5">
          <p className="section-label mb-3">Legal</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--ink)] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-[var(--muted)]">Last updated: {lastUpdated}</p>
          {intro && (
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-[var(--muted)]">
              {intro}
            </div>
          )}
        </div>
      </section>

      {/* Index + body */}
      <div className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
        <div className="lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-14">

          {/* Index — collapsible on mobile, sticky rail on desktop */}
          <aside className="mb-10 lg:mb-0">
            <details
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
                On this page
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="transition-transform group-open:rotate-180">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-4">{indexList}</div>
            </details>

            <nav className="hidden lg:block lg:sticky lg:top-28">
              <p className="mb-4 pl-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                On this page
              </p>
              <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">{indexList}</div>
            </nav>
          </aside>

          {/* Document body */}
          <div className="min-w-0 space-y-14">{children}</div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

/* ── Reusable building blocks for legal document bodies ─────────────────── */

export function LegalSectionBlock({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] md:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--muted)]">
        {children}
      </div>
    </section>
  );
}

export function LegalSubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 font-display text-lg font-semibold text-[var(--ink)]">{children}</h3>;
}

export function LegalTerm({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p>
      <strong className="font-semibold text-[var(--ink)]">{term}</strong> {children}
    </p>
  );
}

export function LegalBullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc marker:text-coral-500">
          {item}
        </li>
      ))}
    </ul>
  );
}
