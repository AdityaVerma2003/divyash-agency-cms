"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

/* ── Scroll reveal hook ─────────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ── Count-up hook ──────────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const begin = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - begin) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCount(Math.round(ease * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return { ref, count };
}

/* ── Digital Marketing Doodles ──────────────────────────────────────────────── */
function DoodleChart({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,28 9,20 15,24 22,12 28,6" />
      <polyline points="24,6 28,6 28,10" />
      <line x1="2" y1="30" x2="32" y2="30" strokeWidth="1.5" />
    </svg>
  );
}

function DoodleTarget({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="15" cy="15" r="13" />
      <circle cx="15" cy="15" r="8" />
      <circle cx="15" cy="15" r="3" fill="currentColor" stroke="none" />
      <line x1="15" y1="0" x2="15" y2="4" />
      <line x1="15" y1="26" x2="15" y2="30" />
      <line x1="0" y1="15" x2="4" y2="15" />
      <line x1="26" y1="15" x2="30" y2="15" />
    </svg>
  );
}

function DoodleLightning({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function DoodleHashtag({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function DoodleBarChart({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="16" width="6" height="12" rx="1.5" />
      <rect x="12" y="9" width="6" height="19" rx="1.5" />
      <rect x="22" y="2" width="6" height="26" rx="1.5" />
      <line x1="0" y1="29" x2="30" y2="29" strokeWidth="1.5" />
    </svg>
  );
}

function DoodleStar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DoodleCursor({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l14 9-7 1-4 7-3-17z" />
      <circle cx="18" cy="18" r="3" strokeDasharray="2 1.5" />
    </svg>
  );
}

function DoodleMagnifier({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="10" cy="10" r="7" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
      <line x1="8" y1="10" x2="12" y2="10" strokeWidth="1.5" />
      <line x1="10" y1="8" x2="10" y2="12" strokeWidth="1.5" />
    </svg>
  );
}

function DoodleRocket({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function DoodleAt({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.92 8.45" />
    </svg>
  );
}

function DoodleMegaphone({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9v18L3 11z" />
      <path d="M11 13v8" />
      <line x1="19" y1="4" x2="19" y2="20" />
    </svg>
  );
}

function DoodleDollar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

/* ── Service Icons ──────────────────────────────────────────────────────────── */
function IconSEO() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="10" cy="10" r="6" />
      <path d="M15.5 15.5L20 20" strokeWidth="2" />
      <path d="M10 7v6M7 10h6" strokeWidth="1.5" />
    </svg>
  );
}
function IconSMM() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
    </svg>
  );
}
function IconAds() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
function IconMeta() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  );
}
function IconWeb() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="15" rx="2" /><path d="M2 7h20M8 21h8M12 18v3" />
    </svg>
  );
}
function IconDesign() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Data ────────────────────────────────────────────────────────────────────── */
const SERVICES = [
  { icon: <IconSEO />, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", name: "Search Engine Optimisation", desc: "Rank higher and get found by customers actively searching for what you offer." },
  { icon: <IconSMM />, color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400", name: "Social Media Management", desc: "Content that builds real audiences and drives engagement beyond the vanity metrics." },
  { icon: <IconAds />, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", name: "Google Ads", desc: "Intent-driven campaigns with tight audience targeting and full conversion tracking." },
  { icon: <IconMeta />, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", name: "Meta Ads", desc: "Facebook and Instagram campaigns engineered for reach, leads, and sales — not clicks." },
  { icon: <IconWeb />, color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400", name: "Web Design & Development", desc: "Fast, mobile-first websites that reflect your brand and convert visitors into customers." },
  { icon: <IconDesign />, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400", name: "Graphic Design", desc: "Visual identity, social creatives, and print assets that make your brand unforgettable." },
];

const WHY = [
  { num: "01", title: "Results, not reports", desc: "Every campaign is tied to a revenue or lead outcome you agreed on up front. No surprise KPI shuffles." },
  { num: "02", title: "Dedicated account team", desc: "One consistent team who knows your business — no rotating freelancers, no call-centre hand-offs." },
  { num: "03", title: "Transparent 28-day reports", desc: "On the 28th of every month you get a plain-English breakdown of what happened and what's next." },
];

const PROCESS = [
  { step: "01", title: "Audit", desc: "We map your digital presence, competitors, and quick wins." },
  { step: "02", title: "Strategy", desc: "A custom growth plan aligned to your revenue goals." },
  { step: "03", title: "Execute", desc: "Campaigns go live across your chosen channels." },
  { step: "04", title: "Grow", desc: "Monitor, optimise, and report — then raise the bar." },
];

/* ── Hero Dashboard Mockup ──────────────────────────────────────────────────── */
function HeroDashboardMockup() {
  return (
    <div className="w-[200px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl shadow-black/15 dark:shadow-black/60">
      <div className="flex items-center gap-2 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="" className="h-5 w-5 object-contain flex-shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold text-[var(--ink)]">Growth Overview</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] text-[var(--muted)]">Live</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="rounded-lg bg-[var(--surface-2)] p-2 mb-3">
        <svg viewBox="0 0 160 48" className="w-full h-10" aria-hidden>
          <defs>
            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points="0,44 22,38 44,42 70,28 90,24 115,14 138,8 158,3 158,48 0,48"
            fill="url(#heroGrad)"
          />
          <polyline
            points="0,44 22,38 44,42 70,28 90,24 115,14 138,8 158,3"
            fill="none"
            stroke="#6366F1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="158" cy="3" r="3" fill="#6366F1" />
          <circle cx="158" cy="3" r="6" fill="#6366F1" opacity="0.2" />
        </svg>
        <p className="text-[9px] text-[var(--muted)] mt-0.5">Organic growth — last 8 mo.</p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-[var(--surface-2)] px-2.5 py-2">
          <p className="text-[9px] text-[var(--muted)]">Avg. ROAS</p>
          <p className="text-sm font-extrabold text-[var(--ink)] font-display leading-tight">4.2×</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-2)] px-2.5 py-2">
          <p className="text-[9px] text-[var(--muted)]">Growth</p>
          <p className="text-sm font-extrabold text-[#2DBFA0] font-display leading-tight">↑ 48%</p>
        </div>
      </div>

      {/* Client avatar row */}
      <div className="mt-3 flex items-center gap-1.5">
        {["#6366F1","#2DBFA0","#5B7CF7","#F87DA3"].map((c, i) => (
          <div key={i} className="h-5 w-5 rounded-full flex items-center justify-center border-2 border-[var(--surface)] -ml-1 first:ml-0" style={{ backgroundColor: c }}>
            <span className="text-[7px] font-bold text-white">{String.fromCharCode(65 + i)}</span>
          </div>
        ))}
        <span className="ml-1 text-[9px] text-[var(--muted)]">+147 clients</span>
      </div>
    </div>
  );
}

/* ── Nav ────────────────────────────────────────────────────────────────────── */
function Nav({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[var(--surface)]/90 shadow-sm backdrop-blur-md border-b border-[var(--border)]" : "bg-transparent"
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="Divyash Digital" className="h-8 w-8 object-contain flex-shrink-0" />
          <span className="font-display font-bold text-lg text-[var(--ink)]">Divyash Digital</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--muted)]">
          <Link href="/services" className="hover:text-coral-500 transition-colors">Services</Link>
          <Link href="/work"     className="hover:text-coral-500 transition-colors">Our Work</Link>
          <Link href="/blog"     className="hover:text-coral-500 transition-colors">Blog</Link>
          <Link href="/contact"  className="hover:text-coral-500 transition-colors">Contact</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors px-3 py-1.5">
            Sign in
          </Link>
          <Link href="/contact" className="rounded-full bg-coral-500 px-5 py-2 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
            Free audit →
          </Link>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)]">
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 space-y-4">
          {[
            { label: "Services", href: "/services" },
            { label: "Our Work", href: "/work" },
            { label: "Blog", href: "/blog" },
            { label: "Contact", href: "/contact" },
          ].map(({ label, href }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="block text-sm font-medium text-[var(--muted)] hover:text-coral-500">
              {label}
            </Link>
          ))}
          <Link href="/login" className="block text-sm font-medium text-[var(--muted)]" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link href="/contact" onClick={() => setOpen(false)}
            className="block rounded-full bg-coral-500 px-5 py-2.5 text-center text-sm font-semibold text-white">
            Free audit →
          </Link>
        </div>
      )}
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Background blobs */}
      <div className="blob pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] bg-coral-500 opacity-[0.08] dark:opacity-[0.06]" aria-hidden />
      <div className="blob pointer-events-none absolute -bottom-16 -left-24 h-[320px] w-[320px] bg-[#2DBFA0] opacity-[0.08] dark:opacity-[0.05]" aria-hidden style={{ animationDelay: "-4s" }} />

      {/* Faint dot-grid on hero right */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <svg className="absolute right-0 top-0 h-full w-1/2 opacity-[0.025] text-[var(--ink)]">
          <defs>
            <pattern id="heroDotsPattern" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroDotsPattern)" />
        </svg>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-2">
        {/* Left — copy */}
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-coral-100 bg-coral-50 dark:border-coral-500/20 dark:bg-coral-500/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-coral-500 animate-pulse" />
            <span className="text-xs font-semibold text-coral-600 dark:text-coral-400 uppercase tracking-wide">
              Delhi's Digital Growth Partner
            </span>
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--ink)] sm:text-5xl md:text-[3.5rem]">
            Grow Your Business{" "}
            <span className="text-coral-500">with Data-Driven</span>{" "}
            Marketing
          </h1>

          <p className="mt-6 text-base leading-relaxed text-[var(--muted)] md:text-lg">
            Measurable results for Delhi businesses serious about growth. SEO, Ads, Social
            Media and Web Design — all under one roof, all tied to revenue.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact"
              className="rounded-full bg-coral-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600 transition-all hover:-translate-y-0.5 motion-reduce:translate-y-0">
              Start growing →
            </Link>
            <Link href="/services"
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-7 py-3 text-sm font-semibold text-[var(--ink)] hover:border-coral-500 transition-colors">
              Our services
            </Link>
          </div>

          <p className="mt-8 text-xs text-[var(--muted)]">
            Trusted by <strong className="text-[var(--ink)]">150+</strong> businesses across India
          </p>
        </div>

        {/* Right — animated composition */}
        <div className="relative mx-auto h-[360px] w-full max-w-sm sm:h-[480px] lg:max-w-none">

          {/* Central coral glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="h-56 w-56 rounded-full bg-coral-500 opacity-[0.10] dark:opacity-[0.07] blur-3xl" />
          </div>

          {/* ── Doodles ── (all aria-hidden, pointer-events-none) */}

          {/* Chart (top-left) */}
          <div className="pointer-events-none absolute left-6 top-8 animate-float-slow text-[#2DBFA0] opacity-50" aria-hidden>
            <DoodleChart size={34} />
          </div>

          {/* Target (top, right-of-center) */}
          <div className="pointer-events-none absolute left-[45%] top-5 animate-float text-coral-500 opacity-40" aria-hidden style={{ animationDelay: "-1s" }}>
            <DoodleTarget size={26} />
          </div>

          {/* Rocket (top-right) */}
          <div className="pointer-events-none absolute right-5 top-10 animate-float-slow text-[#2DBFA0] opacity-45" aria-hidden style={{ animationDelay: "-0.5s" }}>
            <DoodleRocket size={30} />
          </div>

          {/* Megaphone (mid-left below card) */}
          <div className="pointer-events-none absolute left-4 top-[55%] animate-float-slower text-[#5B7CF7] opacity-40" aria-hidden style={{ animationDelay: "-3s" }}>
            <DoodleMegaphone size={26} />
          </div>

          {/* Lightning (right-mid) */}
          <div className="pointer-events-none absolute right-4 top-[38%] animate-float text-[#F87DA3] opacity-45" aria-hidden style={{ animationDelay: "-2s" }}>
            <DoodleLightning size={24} />
          </div>

          {/* Hashtag (left, lower) */}
          <div className="pointer-events-none absolute left-10 bottom-[28%] animate-float-slow text-[#5B7CF7] opacity-35" aria-hidden style={{ animationDelay: "-4s" }}>
            <DoodleHashtag size={22} />
          </div>

          {/* BarChart (right-lower) */}
          <div className="pointer-events-none absolute right-10 bottom-[22%] animate-float-slower text-coral-500 opacity-40" aria-hidden style={{ animationDelay: "-2.5s" }}>
            <DoodleBarChart size={26} />
          </div>

          {/* Star (bottom-left) */}
          <div className="pointer-events-none absolute left-6 bottom-12 animate-float text-[#2DBFA0] opacity-50" aria-hidden style={{ animationDelay: "-1.5s" }}>
            <DoodleStar size={24} />
          </div>

          {/* Cursor (bottom-right) */}
          <div className="pointer-events-none absolute right-14 bottom-10 animate-float-slow text-[#5B7CF7] opacity-40" aria-hidden style={{ animationDelay: "-3.5s" }}>
            <DoodleCursor size={22} />
          </div>

          {/* At symbol (top, far left) */}
          <div className="pointer-events-none absolute left-[30%] top-10 animate-float-slower text-[#F87DA3] opacity-35" aria-hidden style={{ animationDelay: "-1.2s" }}>
            <DoodleAt size={20} />
          </div>

          {/* Magnifier (center-bottom area) */}
          <div className="pointer-events-none absolute left-[38%] bottom-8 animate-float text-coral-500 opacity-30" aria-hidden style={{ animationDelay: "-2.8s" }}>
            <DoodleMagnifier size={22} />
          </div>

          {/* Dollar (right, below top card) */}
          <div className="pointer-events-none absolute right-[12%] top-[28%] animate-float-slow text-[#F87DA3] opacity-30" aria-hidden style={{ animationDelay: "-0.8s" }}>
            <DoodleDollar size={18} />
          </div>

          {/* Geometric shapes */}
          {/* Mint triangle */}
          <div className="pointer-events-none absolute right-[18%] top-4 h-9 w-9 bg-[#2DBFA0] opacity-70 animate-float" aria-hidden
            style={{ clipPath: "polygon(50% 0%,0% 100%,100% 100%)", animationDelay: "-2s" }} />
          {/* Rose circle */}
          <div className="pointer-events-none absolute bottom-[35%] left-3 h-7 w-7 rounded-full bg-[#F87DA3] opacity-65 animate-float-slow" aria-hidden />
          {/* Sky square */}
          <div className="pointer-events-none absolute top-[32%] left-7 h-6 w-6 rotate-45 bg-[#5B7CF7] opacity-60 animate-float-slower" aria-hidden />
          {/* Coral dot */}
          <div className="pointer-events-none absolute bottom-[18%] right-[20%] h-5 w-5 rounded-full bg-coral-500 opacity-55 animate-float" aria-hidden style={{ animationDelay: "-1s" }} />
          {/* Mint small square */}
          <div className="pointer-events-none absolute top-8 left-[55%] h-4 w-4 rotate-12 bg-[#2DBFA0] opacity-45 animate-float-slow" aria-hidden />

          {/* ── Metric Cards ── */}

          {/* Card 1 — Organic Traffic */}
          <div className="animate-float absolute right-0 top-10 rounded-2xl bg-[var(--surface)] p-4 shadow-xl dark:shadow-black/50 border border-[var(--border)] min-w-[148px]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2 w-2 rounded-full bg-[#2DBFA0]" />
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">Organic Traffic</p>
            </div>
            <p className="font-display text-xl font-extrabold text-[#2DBFA0]">↑ 234%</p>
            <p className="text-[9px] text-[var(--muted)] mt-0.5">vs last quarter</p>
          </div>

          {/* Card 2 — Conversions */}
          <div className="animate-float-slow absolute left-0 top-[38%] -translate-y-1/2 rounded-2xl bg-[var(--surface)] p-4 shadow-xl dark:shadow-black/50 border border-[var(--border)] min-w-[148px]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2 w-2 rounded-full bg-coral-500" />
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">Conversions</p>
            </div>
            <p className="font-display text-xl font-extrabold text-coral-500">↑ 89%</p>
            <p className="text-[9px] text-[var(--muted)] mt-0.5">month-over-month</p>
          </div>

          {/* Card 3 — Ad CTR */}
          <div className="animate-float-slower absolute bottom-8 right-4 rounded-2xl bg-[var(--surface)] p-4 shadow-xl dark:shadow-black/50 border border-[var(--border)] min-w-[138px]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2 w-2 rounded-full bg-[#5B7CF7]" />
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">Ad CTR</p>
            </div>
            <p className="font-display text-xl font-extrabold text-[#5B7CF7]">↑ 4.8%</p>
            <p className="text-[9px] text-[var(--muted)] mt-0.5">industry avg: 1.9%</p>
          </div>

          {/* Card 4 — New Leads */}
          <div className="animate-float absolute left-[22%] bottom-12 rounded-2xl bg-[var(--surface)] p-3 shadow-lg dark:shadow-black/40 border border-[var(--border)] min-w-[118px]" style={{ animationDelay: "-1.8s" }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-[#F87DA3]" />
              <p className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wide">New Leads</p>
            </div>
            <p className="font-display text-lg font-extrabold text-[#F87DA3]">+1,240</p>
          </div>

          {/* ── Central Dashboard Mockup ── */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <HeroDashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Services ───────────────────────────────────────────────────────────────── */
function ServicesSection() {
  const { ref, visible } = useReveal();
  return (
    <section id="services" className="relative py-20 md:py-28 bg-[var(--surface-2)] overflow-hidden">
      {/* Background doodles */}
      <div className="pointer-events-none absolute top-8 right-8 text-coral-500 opacity-[0.04]" aria-hidden><DoodleChart size={80} /></div>
      <div className="pointer-events-none absolute bottom-8 left-8 text-[#2DBFA0] opacity-[0.04]" aria-hidden><DoodleTarget size={64} /></div>
      <div className="pointer-events-none absolute top-1/2 right-1/4 text-[#5B7CF7] opacity-[0.03]" aria-hidden><DoodleMagnifier size={72} /></div>

      <div className="mx-auto max-w-6xl px-5">
        <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${visible ? "visible" : ""} text-center mb-14`}>
          <p className="section-label mb-3">What we do</p>
          <h2 className="font-display text-3xl font-bold text-[var(--ink)] md:text-4xl">
            Six services. One growth partner.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[var(--muted)]">
            Everything your business needs to win online — strategy, execution, and reporting, all joined up.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((svc, i) => (
            <ServiceCard key={svc.name} svc={svc} delay={`reveal-delay-${i + 1}`} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/services" className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm font-semibold text-[var(--ink)] hover:border-coral-500 hover:text-coral-500 transition-colors">
            Explore all services →
          </Link>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ svc, delay }: { svc: typeof SERVICES[0]; delay: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} group rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 motion-reduce:translate-y-0`}>
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${svc.color} transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:translate-y-0`}>
        {svc.icon}
      </div>
      <h3 className="mb-2 font-display text-base font-semibold text-[var(--ink)]">{svc.name}</h3>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{svc.desc}</p>
    </div>
  );
}

/* ── Stats ──────────────────────────────────────────────────────────────────── */
function StatsSection() {
  const { ref: r1, count: c1 } = useCountUp(150);
  const { ref: r2, count: c2 } = useCountUp(50);
  const { ref: r3, count: c3 } = useCountUp(100);
  const { ref: r4, count: c4 } = useCountUp(6);

  const stats = [
    { ref: r1, count: c1, suffix: "+", label: "Projects delivered", note: "across 6 service areas" },
    { ref: r2, count: c2, suffix: "%", label: "Average growth rate", note: "across active clients" },
    { ref: r3, count: c3, suffix: "+", label: "Design projects", note: "logos, creatives, UI/UX" },
    { ref: r4, count: c4, suffix: "", label: "Core services", note: "under one roof" },
  ];

  return (
    <section className="relative bg-coral-500 py-16 overflow-hidden">
      {/* Doodles in coral bg */}
      <div className="pointer-events-none absolute top-4 left-8 text-white opacity-[0.06]" aria-hidden><DoodleBarChart size={64} /></div>
      <div className="pointer-events-none absolute bottom-4 right-8 text-white opacity-[0.06]" aria-hidden><DoodleRocket size={56} /></div>
      <div className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 text-white opacity-[0.04]" aria-hidden><DoodleTarget size={72} /></div>

      <div className="mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center text-white">
              <p className="font-display text-4xl font-extrabold md:text-5xl">
                <span ref={s.ref}>{s.count}</span>{s.suffix}
              </p>
              <p className="mt-2 text-sm font-semibold opacity-90">{s.label}</p>
              <p className="mt-0.5 text-xs opacity-60">{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Why Us ─────────────────────────────────────────────────────────────────── */
function WhyCard({ w, delay }: { w: typeof WHY[0]; delay: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${delay} ${visible ? "visible" : ""}`}>
      <span className="font-display text-4xl font-extrabold text-coral-500 opacity-20 select-none">{w.num}</span>
      <h3 className="mt-2 font-display text-xl font-semibold text-[var(--ink)]">{w.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{w.desc}</p>
    </div>
  );
}

function WhySection() {
  const { ref, visible } = useReveal();
  return (
    <section id="why" className="relative py-20 md:py-28 overflow-hidden">
      {/* Background doodles */}
      <div className="pointer-events-none absolute top-12 right-4 text-[#F87DA3] opacity-[0.05]" aria-hidden><DoodleStar size={80} /></div>
      <div className="pointer-events-none absolute bottom-12 left-4 text-[#5B7CF7] opacity-[0.04]" aria-hidden><DoodleLightning size={64} /></div>

      <div className="mx-auto max-w-6xl px-5">
        <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${visible ? "visible" : ""} mb-14 text-center`}>
          <p className="section-label mb-3">Why choose us</p>
          <h2 className="font-display text-3xl font-bold text-[var(--ink)] md:text-4xl">
            Built for businesses that<br className="hidden sm:block" /> measure everything
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {WHY.map((w, i) => (
            <WhyCard key={w.num} w={w} delay={`reveal-delay-${i + 1}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Process ────────────────────────────────────────────────────────────────── */
function ProcessStep({ p, delay }: { p: typeof PROCESS[0]; delay: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${delay} ${visible ? "visible" : ""} text-center`}>
      <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-coral-500 bg-[var(--surface)] text-coral-500">
        <span className="font-display text-sm font-bold">{p.step}</span>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-coral-500 opacity-20 animate-ping" />
      </div>
      <h3 className="mb-1 font-display text-lg font-semibold text-[var(--ink)]">{p.title}</h3>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{p.desc}</p>
    </div>
  );
}

function ProcessSection() {
  const { ref, visible } = useReveal();
  return (
    <section id="process" className="relative py-20 md:py-28 bg-[var(--surface-2)] overflow-hidden">
      {/* Background doodles */}
      <div className="pointer-events-none absolute top-8 left-1/2 text-coral-500 opacity-[0.04]" aria-hidden><DoodleHashtag size={68} /></div>
      <div className="pointer-events-none absolute bottom-8 right-8 text-[#2DBFA0] opacity-[0.04]" aria-hidden><DoodleCursor size={60} /></div>

      <div className="mx-auto max-w-6xl px-5">
        <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${visible ? "visible" : ""} mb-14 text-center`}>
          <p className="section-label mb-3">How it works</p>
          <h2 className="font-display text-3xl font-bold text-[var(--ink)] md:text-4xl">
            Our 4-step approach
          </h2>
        </div>
        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-coral-300 to-transparent opacity-50 md:block" aria-hidden />
          {PROCESS.map((p, i) => (
            <ProcessStep key={p.step} p={p} delay={`reveal-delay-${i + 1}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Work Teaser ────────────────────────────────────────────────────────────── */
function WorkTeaserSection() {
  const { ref, visible } = useReveal();
  const items = [
    { title: "ROAS: 4.2×", sub: "E-commerce brand — Google Ads", color: "bg-coral-500" },
    { title: "SEO: ↑ 234%", sub: "B2B SaaS — Organic traffic", color: "bg-[#2DBFA0]" },
    { title: "Leads: +1,240", sub: "Real estate — Meta Ads", color: "bg-[#5B7CF7]" },
  ];
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${visible ? "visible" : ""} mb-12 flex items-end justify-between gap-4`}>
          <div>
            <p className="section-label mb-3">Our work</p>
            <h2 className="font-display text-3xl font-bold text-[var(--ink)] md:text-4xl">
              Numbers that speak
            </h2>
          </div>
          <Link href="/work" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-coral-500 hover:text-coral-600 transition-colors">
            View all case studies →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {items.map((item, i) => (
            <WorkCard key={i} item={item} delay={`reveal-delay-${i + 1}`} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/work" className="text-sm font-semibold text-coral-500">View all case studies →</Link>
        </div>
      </div>
    </section>
  );
}

function WorkCard({ item, delay }: { item: { title: string; sub: string; color: string }; delay: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 motion-reduce:translate-y-0`}>
      <div className={`mb-4 inline-flex h-10 w-10 rounded-xl ${item.color} items-center justify-center`}>
        <DoodleBarChart size={20} />
      </div>
      <p className="font-display text-2xl font-extrabold text-[var(--ink)]">{item.title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{item.sub}</p>
    </div>
  );
}

/* ── Blog teaser ────────────────────────────────────────────────────────────── */
interface BlogTeaser {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string | null;
  category?: string | null;
  publishedAt: string;
  author?: { name: string };
}

const BLOG_TOPICS = ["All", "SEO", "Social Media", "Google Ads", "Meta Ads", "Web Design", "Graphic Design", "Case Study", "News & Updates"];

function BlogTeaserCard({ post, animClass }: { post: BlogTeaser; animClass: string }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 motion-reduce:translate-y-0 ${animClass}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--surface-2)]">
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[var(--muted)] opacity-20" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {post.category && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--surface)]/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold text-coral-500">
            {post.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs text-[var(--muted)]">
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : ""}
          {post.author?.name && <span className="ml-1.5 font-medium">· {post.author.name}</span>}
        </p>
        <h3 className="mb-2 text-sm font-bold leading-snug text-[var(--ink)] group-hover:text-coral-500 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-xs leading-relaxed text-[var(--muted)] line-clamp-3 flex-1">{post.excerpt}</p>
        <span className="mt-3 text-xs font-semibold text-coral-500 group-hover:text-coral-600 transition-colors">
          Read more →
        </span>
      </div>
    </Link>
  );
}

function BlogSection() {
  const [allPosts, setAllPosts]     = useState<BlogTeaser[]>([]);
  const [activeTopic, setActiveTopic] = useState("All");
  const [loaded, setLoaded]         = useState(false);
  const { ref, visible }            = useReveal();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/blog-posts?limit=100`)
      .then((r) => r.json())
      .then((d: { posts: BlogTeaser[] }) => { setAllPosts(d.posts ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  // Client-side topic filter
  const filtered = activeTopic === "All"
    ? allPosts
    : allPosts.filter((p) => p.category === activeTopic);

  // Only show topics that actually have posts (plus "All")
  const availableTopics = BLOG_TOPICS.filter(
    (t) => t === "All" || allPosts.some((p) => p.category === t)
  );

  return (
    <section className="py-20 md:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-5">
        {/* Header */}
        <div className={`mb-10 flex flex-wrap items-end justify-between gap-4 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div>
            <p className="section-label mb-3">From our blog</p>
            <h2 className="font-display text-2xl font-extrabold text-[var(--ink)] md:text-3xl">
              Latest insights &amp; case studies
            </h2>
          </div>
          <Link href="/blog" className="text-sm font-semibold text-coral-500 hover:text-coral-600 transition-colors whitespace-nowrap">
            View all posts →
          </Link>
        </div>

        {/* Topic filter tabs — only shown when there are posts */}
        {loaded && allPosts.length > 0 && availableTopics.length > 1 && (
          <div className={`mb-8 flex flex-wrap gap-2 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {availableTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => setActiveTopic(topic)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeTopic === topic
                    ? "bg-coral-500 text-white shadow-sm shadow-coral-500/30"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-coral-500 hover:text-coral-500"
                }`}
              >
                {topic}
                {topic !== "All" && (
                  <span className={`ml-1.5 text-[10px] ${activeTopic === topic ? "opacity-70" : "opacity-50"}`}>
                    {allPosts.filter((p) => p.category === topic).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Posts grid */}
        {!loaded ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="aspect-[16/9] bg-[var(--surface-2)]" />
                <div className="p-5 space-y-2">
                  <div className="h-3 rounded bg-[var(--border)] w-1/3" />
                  <div className="h-4 rounded bg-[var(--border)] w-3/4" />
                  <div className="h-3 rounded bg-[var(--border)]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`rounded-2xl border border-dashed border-[var(--border)] py-16 text-center transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {allPosts.length === 0 ? (
              <>
                <p className="text-base font-semibold text-[var(--ink)]">New posts coming soon</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Check back shortly for insights from our team.</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-[var(--ink)]">No {activeTopic} posts yet</p>
                <button onClick={() => setActiveTopic("All")} className="mt-2 text-sm font-semibold text-coral-500 hover:text-coral-600">
                  View all topics →
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post, i) => (
              <BlogTeaserCard
                key={post.id}
                post={post}
                animClass={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              />
            ))}
          </div>
        )}

        {/* View all CTA below grid on mobile */}
        {loaded && filtered.length > 0 && (
          <div className="mt-10 text-center">
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm font-semibold text-[var(--ink)] hover:border-coral-500 hover:text-coral-500 transition-colors">
              {activeTopic === "All" ? "Browse all posts →" : `All ${activeTopic} posts →`}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── CTA ────────────────────────────────────────────────────────────────────── */
function CtaSection() {
  const { ref, visible } = useReveal();
  return (
    <section className="py-20 md:py-28 bg-[var(--surface-2)]">
      <div className="mx-auto max-w-6xl px-5">
        <div ref={ref as React.RefObject<HTMLDivElement>}
          className={`reveal ${visible ? "visible" : ""} relative overflow-hidden rounded-3xl bg-coral-500 px-8 py-16 text-center text-white md:px-16`}>
          {/* Blobs */}
          <div className="blob pointer-events-none absolute -left-16 -top-16 h-52 w-52 bg-white opacity-[0.07]" aria-hidden />
          <div className="blob pointer-events-none absolute -bottom-16 -right-16 h-52 w-52 bg-coral-700 opacity-40" aria-hidden style={{ animationDelay: "-5s" }} />

          {/* Doodles in CTA */}
          <div className="pointer-events-none absolute right-8 top-6 text-white opacity-[0.12]" aria-hidden><DoodleRocket size={48} /></div>
          <div className="pointer-events-none absolute left-8 bottom-6 text-white opacity-[0.10]" aria-hidden><DoodleTarget size={44} /></div>
          <div className="pointer-events-none absolute left-1/4 top-4 text-white opacity-[0.07]" aria-hidden><DoodleStar size={36} /></div>
          <div className="pointer-events-none absolute right-1/4 bottom-4 text-white opacity-[0.07]" aria-hidden><DoodleLightning size={32} /></div>

          <p className="section-label mb-4 text-white/70">Ready to grow?</p>
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">
            Let's build something remarkable together
          </h2>
          <p className="mx-auto mt-4 max-w-lg opacity-85 leading-relaxed">
            Get a free digital audit — we'll review your current presence and tell you exactly where
            the growth is hiding.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href="tel:+918810376026"
              className="rounded-full bg-white px-8 py-3.5 font-semibold text-coral-600 shadow-xl hover:bg-coral-50 transition-colors">
              Call +91 88103 76026
            </a>
            <Link href="/contact"
              className="rounded-full border-2 border-white/60 px-8 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors">
              Get free audit →
            </Link>
          </div>

          <p className="mt-6 text-xs opacity-60">Delhi-based · Mon – Sat, 10 am – 6 pm IST</p>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#1C1410] text-white/70">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.webp" alt="" className="h-7 w-7 object-contain flex-shrink-0" aria-hidden />
              <span className="font-display font-bold text-base text-white">Divyash Digital</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Delhi's growth partner for businesses that want measurable results — not just deliverables.
            </p>
            <p className="mt-4 text-xs">info@divyashdigital.co.in · +91 88103 76026</p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Services</p>
            <ul className="space-y-2 text-sm">
              {["SEO", "Social Media", "Google Ads", "Meta Ads", "Web Design", "Graphic Design"].map((s) => (
                <li key={s}><Link href="/services" className="hover:text-coral-400 transition-colors">{s}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Company</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/work"    className="hover:text-coral-400 transition-colors">Our Work</Link></li>
              <li><Link href="/blog"    className="hover:text-coral-400 transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-coral-400 transition-colors">Contact</Link></li>
              <li><Link href="/login"   className="hover:text-coral-400 transition-colors">Client Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© {new Date().getFullYear()} Divyash Digital. All rights reserved.</p>
          <p>Delhi, India</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <Nav open={menuOpen} setOpen={setMenuOpen} />
      <Hero />
      <ServicesSection />
      <StatsSection />
      <WhySection />
      <ProcessSection />
      <WorkTeaserSection />
      <BlogSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
