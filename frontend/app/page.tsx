"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";
import {
  CLIENT_LOGOS_ROW_1,
  CLIENT_LOGOS_ROW_2,
  clientLogoSrc,
  type ClientLogo,
} from "@/lib/clients";

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
  { num: "01", title: "Real results, not reports.", desc: "Every campaign is tied to a revenue or lead outcome you agreed on up front. We measure what moves your business — not just what looks good in a deck.", accent: "#6366F1" },
  { num: "02", title: "Dedicated management team.", desc: "One consistent team who knows your brand, your market, and your goals — no rotating freelancers, no hand-offs, no starting over every quarter.", accent: "#2DBFA0" },
  { num: "03", title: "Transparent report & strategies.", desc: "Weekly updates and monthly plain-English reports tell you exactly what happened, why, and what we're doing next — no jargon, no surprises.", accent: "#F5883C" },
];

const PROCESS = [
  { step: "01", title: "Audit",    desc: "We map your digital presence, competitors, and quick wins.", accent: "#6366F1" },
  { step: "02", title: "Strategy", desc: "A custom growth plan aligned to your revenue goals.",         accent: "#2DBFA0" },
  { step: "03", title: "Execute",  desc: "Campaigns go live across your chosen channels.",              accent: "#F5883C" },
  { step: "04", title: "Grow",     desc: "Monitor, optimise, and report — then raise the bar.",         accent: "#5B7CF7" },
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
              #1 Digital Growth Partner
            </span>
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--ink)] sm:text-5xl md:text-[3.5rem]">
            Grow Your Business{" "}
            <span className="text-coral-500">with Data-Driven</span>{" "}
            Marketing
          </h1>

          <p className="mt-6 text-base leading-relaxed text-[var(--muted)] md:text-lg">
            Measurable results for businesses serious about growth. SEO, Ads, Social
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
            Trusted by <strong className="text-[var(--ink)]">180+</strong> businesses across India
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
  const { ref: r1, count: c1 } = useCountUp(180);
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
const WHY_ICONS = [DoodleBarChart, DoodleTarget, DoodleMagnifier];

function WhyCard({ w, index, delay }: { w: typeof WHY[0]; index: number; delay: string }) {
  const { ref, visible } = useReveal();
  const Icon = WHY_ICONS[index];
  const isLast = index === WHY.length - 1;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} group relative`}
    >
      {/* Connector to the next reason (desktop only) */}
      {!isLast && (
        <div
          className="pointer-events-none absolute -right-4 top-8 z-10 hidden translate-x-1/2 text-[var(--muted)] opacity-25 transition-opacity duration-500 group-hover:opacity-50 md:block"
          aria-hidden
        >
          <DoodleConnector down={index % 2 === 1} />
        </div>
      )}

      {/* Icon medallion */}
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
        <svg
          className="absolute inset-0 h-full w-full animate-spin-slow opacity-30 transition-opacity duration-300 group-hover:opacity-70"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden
        >
          <circle cx="32" cy="32" r="30" stroke={w.accent} strokeWidth="1.5" strokeDasharray="4 7" strokeLinecap="round" />
        </svg>
        <div
          className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[var(--surface)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg motion-reduce:group-hover:scale-100"
          style={{ borderColor: w.accent, color: w.accent }}
        >
          <span className="transition-transform duration-500 group-hover:rotate-[10deg]">
            <Icon size={19} />
          </span>
        </div>
        <span
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full font-display text-[10px] font-bold text-white shadow-sm"
          style={{ backgroundColor: w.accent }}
        >
          {w.num}
        </span>
      </div>

      <h3 className="font-display text-xl font-semibold text-[var(--ink)]">{w.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{w.desc}</p>

      {/* Underline that grows on hover */}
      <span
        className="mt-4 block h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-12"
        style={{ backgroundColor: w.accent }}
        aria-hidden
      />
    </div>
  );
}

function WhySection() {
  const { ref, visible } = useReveal();
  return (
    <section id="why" className="relative py-20 md:py-28 overflow-hidden">
      {/* Floating background doodles */}
      <div className="pointer-events-none absolute left-[10%] top-10 text-[#F87DA3] opacity-[0.06] animate-float" aria-hidden><DoodleStar size={70} /></div>
      <div className="pointer-events-none absolute right-[8%] top-20 text-[#5B7CF7] opacity-[0.05] animate-float-slower" aria-hidden><DoodleLightning size={56} /></div>
      <div className="pointer-events-none absolute bottom-14 left-[6%] text-coral-500 opacity-[0.06] animate-float-slow" aria-hidden><DoodleDollar size={40} /></div>
      <div className="pointer-events-none absolute bottom-20 right-[16%] text-[#2DBFA0] opacity-[0.05] animate-float" aria-hidden><DoodleMegaphone size={46} /></div>

      <div className="relative mx-auto max-w-6xl px-5">
        <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${visible ? "visible" : ""} mb-16 text-center`}>
          <p className="section-label mb-3">Why choose us</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
            Marketing Strategies Built For Businesses<br className="hidden sm:block" /> That Measures Everything.
          </h2>

          {/* Hand-drawn underline that draws itself in on reveal */}
          <svg className="mx-auto mt-3 h-3 w-48 text-coral-500" viewBox="0 0 200 12" fill="none" aria-hidden>
            <path
              d="M3 8C40 2 80 2 100 6s60 4 97-2"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="260"
              className={visible ? "animate-draw" : ""}
              style={visible ? undefined : { strokeDashoffset: 260 }}
            />
          </svg>
        </div>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
          {WHY.map((w, i) => (
            <WhyCard key={w.num} w={w} index={i} delay={`reveal-delay-${i + 1}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Process ────────────────────────────────────────────────────────────────── */
/* Hand-drawn connector between steps — curves up or down for a sketched feel */
function DoodleConnector({ down = false }: { down?: boolean }) {
  return (
    <svg width="110" height="48" viewBox="0 0 110 48" fill="none" aria-hidden>
      <path
        d={down ? "M4 16 C 30 44, 74 44, 100 24" : "M4 32 C 30 4, 74 4, 100 24"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 6"
      />
      <path
        d="M92 17 L 101 24 L 92 31"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STEP_ICONS = [DoodleMagnifier, DoodleTarget, DoodleRocket, DoodleChart];

function ProcessStep({ p, index, delay }: { p: typeof PROCESS[0]; index: number; delay: string }) {
  const { ref, visible } = useReveal();
  const Icon = STEP_ICONS[index];
  const isLast = index === PROCESS.length - 1;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} group relative text-center`}
    >
      {/* Connector to the next step (desktop only) */}
      {!isLast && (
        <div
          className="pointer-events-none absolute -right-4 top-4 z-10 hidden translate-x-1/2 text-[var(--muted)] opacity-30 transition-opacity duration-500 group-hover:opacity-60 md:block"
          aria-hidden
        >
          <DoodleConnector down={index % 2 === 1} />
        </div>
      )}

      {/* Icon medallion */}
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
        {/* Rotating dashed orbit */}
        <svg
          className="absolute inset-0 h-full w-full animate-spin-slow opacity-40 transition-opacity duration-300 group-hover:opacity-80"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden
        >
          <circle
            cx="40" cy="40" r="37"
            stroke={p.accent}
            strokeWidth="1.5"
            strokeDasharray="4 7"
            strokeLinecap="round"
          />
        </svg>

        {/* Solid disc */}
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[var(--surface)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg motion-reduce:group-hover:scale-100"
          style={{ borderColor: p.accent, color: p.accent }}
        >
          <span className="transition-transform duration-500 group-hover:rotate-[10deg]">
            <Icon size={24} />
          </span>
        </div>

        {/* Step number badge */}
        <span
          className="absolute -right-0.5 -top-0.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-[11px] font-bold text-white shadow-sm"
          style={{ backgroundColor: p.accent }}
        >
          {p.step}
        </span>
      </div>

      <h3 className="mb-1.5 font-display text-lg font-semibold text-[var(--ink)]">{p.title}</h3>
      <p className="mx-auto max-w-[240px] text-sm leading-relaxed text-[var(--muted)]">{p.desc}</p>

      {/* Underline that grows on hover */}
      <span
        className="mx-auto mt-4 block h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-12"
        style={{ backgroundColor: p.accent }}
        aria-hidden
      />
    </div>
  );
}

function ProcessSection() {
  const { ref, visible } = useReveal();
  return (
    <section id="process" className="relative py-20 md:py-28 bg-[var(--surface-2)] overflow-hidden">
      {/* Floating background doodles */}
      <div className="pointer-events-none absolute left-[8%] top-12 text-coral-500 opacity-[0.06] animate-float-slow" aria-hidden><DoodleHashtag size={54} /></div>
      <div className="pointer-events-none absolute right-[10%] top-24 text-[#F5883C] opacity-[0.07] animate-float" aria-hidden><DoodleStar size={38} /></div>
      <div className="pointer-events-none absolute bottom-16 left-[14%] text-[#5B7CF7] opacity-[0.06] animate-float-slower" aria-hidden><DoodleLightning size={44} /></div>
      <div className="pointer-events-none absolute bottom-10 right-8 text-[#2DBFA0] opacity-[0.06] animate-float-slow" aria-hidden><DoodleCursor size={60} /></div>
      <div className="pointer-events-none absolute right-[28%] bottom-24 text-coral-500 opacity-[0.05] animate-float" aria-hidden><DoodleAt size={34} /></div>

      <div className="relative mx-auto max-w-6xl px-5">
        <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${visible ? "visible" : ""} mb-16 text-center`}>
          <p className="section-label mb-3">How it works</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
            Our 4-step approach
          </h2>

          {/* Hand-drawn underline that draws itself in on reveal */}
          <svg
            className="mx-auto mt-3 h-3 w-48 text-coral-500"
            viewBox="0 0 200 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 8C40 2 80 2 100 6s60 4 97-2"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="260"
              className={visible ? "animate-draw" : ""}
              style={visible ? undefined : { strokeDashoffset: 260 }}
            />
          </svg>

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[var(--muted)]">
            No black boxes. Every engagement runs through the same four stages, so
            you always know where things stand.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {PROCESS.map((p, i) => (
            <ProcessStep key={p.step} p={p} index={i} delay={`reveal-delay-${i + 1}`} />
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
    {
      metric: "4.2×",
      label: "Return on ad spend",
      sub: "E-commerce brand — Google Ads",
      detail: "₹18L ad spend turned into ₹76L in tracked revenue.",
      period: "6 months",
      color: "bg-coral-500",
    },
    {
      metric: "↑ 234%",
      label: "Organic traffic",
      sub: "B2B SaaS — SEO & content",
      detail: "12K → 40K monthly sessions with 60+ page-one keywords.",
      period: "9 months",
      color: "bg-[#2DBFA0]",
    },
    {
      metric: "+1,240",
      label: "Qualified leads",
      sub: "Real estate — Meta Ads",
      detail: "₹340 average cost per lead at a 31% qualification rate.",
      period: "4 months",
      color: "bg-[#5B7CF7]",
    },
  ];

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Floating background doodles */}
      <div className="pointer-events-none absolute left-[6%] top-14 text-coral-500 opacity-[0.06] animate-float-slow" aria-hidden><DoodleChart size={50} /></div>
      <div className="pointer-events-none absolute right-[9%] top-10 text-[#2DBFA0] opacity-[0.06] animate-float" aria-hidden><DoodleTarget size={44} /></div>
      <div className="pointer-events-none absolute bottom-12 left-[16%] text-[#5B7CF7] opacity-[0.05] animate-float" aria-hidden><DoodleStar size={36} /></div>
      <div className="pointer-events-none absolute bottom-16 right-[6%] text-[#F5883C] opacity-[0.06] animate-float-slower" aria-hidden><DoodleRocket size={48} /></div>

      <div className="relative mx-auto max-w-6xl px-5">

        {/* Header */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`reveal ${visible ? "visible" : ""} mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between`}
        >
          <div className="max-w-xl">
            <p className="section-label mb-3">Our work</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
              Numbers that speak
            </h2>

            {/* Hand-drawn underline that draws itself in on reveal */}
            <svg className="mt-3 h-3 w-48 text-coral-500" viewBox="0 0 200 12" fill="none" aria-hidden>
              <path
                d="M3 8C40 2 80 2 100 6s60 4 97-2"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="260"
                className={visible ? "animate-draw" : ""}
                style={visible ? undefined : { strokeDashoffset: 260 }}
              />
            </svg>

            <p className="mt-5 text-base leading-relaxed text-[var(--muted)]">
              We report on revenue, pipeline and cost per acquisition — not impressions.
              Here are three recent engagements and what they actually moved.
            </p>
          </div>

          <Link
            href="/work"
            className="group inline-flex flex-shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-coral-500 transition-colors hover:text-coral-600 md:self-auto md:pb-1"
          >
            View all case studies
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* Result cards */}
        <div className="relative grid grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {items.map((item, i) => (
            <WorkCard key={i} item={item} index={i} isLast={i === items.length - 1} delay={`reveal-delay-${i + 1}`} />
          ))}
        </div>

      </div>
    </section>
  );
}

/* ── Trusted by / client logo marquee ───────────────────────────────────────── */

function ClientLogoItem({ logo }: { logo: ClientLogo }) {
  return (
    <div className="flex h-20 w-36 flex-shrink-0 items-center justify-center px-4 sm:h-24 sm:w-44">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clientLogoSrc(logo.file)}
        alt={logo.name}
        title={logo.name}
        loading="lazy"
        className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100"
      />
    </div>
  );
}

function LogoMarquee({ logos, reverse = false }: { logos: ClientLogo[]; reverse?: boolean }) {
  return (
    <div className="group relative flex overflow-hidden">
      {/* Track is duplicated so the -50% keyframe lands on an identical frame */}
      <div
        className={`flex w-max ${reverse ? "animate-marquee-slow" : "animate-marquee"} group-hover:[animation-play-state:paused]`}
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {[...logos, ...logos].map((logo, i) => (
          <ClientLogoItem key={`${logo.name}-${i}`} logo={logo} />
        ))}
      </div>
    </div>
  );
}

function TrustedBySection() {
  const { ref, visible } = useReveal();
  return (
    <section className="overflow-hidden py-20 md:py-28">
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`reveal ${visible ? "visible" : ""} mx-auto mb-14 max-w-3xl px-5 text-center md:mb-16`}
      >
        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[var(--ink)] md:text-4xl">
          Trusted by businesses
          <br />
          <span className="font-semibold">big</span>{" "}
          <span className="text-4xl font-extrabold md:text-5xl">and</span>{" "}
          <span className="text-2xl font-medium md:text-3xl">small,</span>{" "}
          <span className="text-coral-500">everywhere!</span>
        </h2>
      </div>

      {/* Edge fade so logos dissolve rather than clip at the viewport edges */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--page-bg)] to-transparent md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--page-bg)] to-transparent md:w-32" />

        <div className="space-y-6 md:space-y-8">
          <LogoMarquee logos={CLIENT_LOGOS_ROW_1} />
          <LogoMarquee logos={CLIENT_LOGOS_ROW_2} reverse />
        </div>
      </div>
    </section>
  );
}

interface WorkItem {
  metric: string;
  label: string;
  sub: string;
  detail: string;
  period: string;
  color: string;
}

function WorkCard({ item, index, isLast, delay }: { item: WorkItem; index: number; isLast: boolean; delay: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} group relative flex flex-col overflow-visible rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 transition-all hover:-translate-y-1 hover:border-coral-500/30 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 motion-reduce:translate-y-0`}
    >
      {/* Connector to the next result (large screens only, where all 3 sit in one row) */}
      {!isLast && (
        <div
          className="pointer-events-none absolute -right-4 top-8 z-10 hidden translate-x-1/2 text-[var(--muted)] opacity-25 transition-opacity duration-500 group-hover:opacity-50 lg:block"
          aria-hidden
        >
          <DoodleConnector down={index % 2 === 1} />
        </div>
      )}

      {/* Icon + timeframe */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full animate-spin-slow opacity-30 transition-opacity duration-300 group-hover:opacity-60" viewBox="0 0 48 48" fill="none" aria-hidden>
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" className={item.color.replace("bg-", "text-")} />
          </svg>
          <div className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.color} transition-transform duration-500 group-hover:rotate-[10deg]`}>
            <DoodleBarChart size={18} />
          </div>
        </div>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
          {item.period}
        </span>
      </div>

      {/* Headline metric */}
      <p className="font-display text-3xl font-extrabold leading-none tracking-tight text-[var(--ink)]">
        {item.metric}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{item.label}</p>

      {/* Supporting detail */}
      <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">{item.detail}</p>

      {/* Footer */}
      <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs font-medium text-[var(--muted)]">
        {item.sub}
      </p>
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

          <p className="mt-6 text-xs opacity-60"> Mon – Sat, 10 am – 6 pm IST</p>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────────── */

/* ── Page ────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <Nav />
      <Hero />
      <ServicesSection />
      <StatsSection />
      <WhySection />
      <ProcessSection />
      <WorkTeaserSection />
      <TrustedBySection />
      <BlogSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
