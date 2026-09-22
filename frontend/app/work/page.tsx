"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const PORTFOLIO = [
  { name: "Pet Brand", category: "Branding & SMM", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", accent: "#F59E0B" },
  { name: "Retail Store", category: "Web Design & SEO", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", accent: "#0284C7" },
  { name: "Varanasi School", category: "GMB & SEO", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", accent: "#059669" },
  { name: "Grocery Store", category: "Social Media", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", accent: "#DB2777" },
  { name: "Dental App", category: "App & Web Design", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", accent: "#0891B2" },
  { name: "Dental Clinic", category: "GMB & Meta Ads", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", accent: "#7C3AED" },
  { name: "Clothing Store", category: "E-Commerce & Ads", color: "bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400", accent: "#6366F1" },
  { name: "Skincare Brand", category: "Meta Ads & SMM", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", accent: "#F87DA3" },
  { name: "Tutoring Academy", category: "Web Design & GMB", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", accent: "#4F46E5" },
  { name: "Stone Dealer", category: "Google Ads & SEO", color: "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-500", accent: "#78716C" },
  { name: "CA Firm", category: "Branding & Web", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", accent: "#0D9488" },
  { name: "Gynaecologist", category: "GMB & Meta Ads", color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400", accent: "#A21CAF" },
  { name: "Accessories Brand", category: "Social Media & Ads", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", accent: "#EA580C" },
  { name: "NGO Delhi", category: "Web Design & SEO", color: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-600", accent: "#65A30D" },
  { name: "Hyper Market", category: "E-Commerce & GMB", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500", accent: "#CA8A04" },
  { name: "Dentist Academy", category: "Meta Ads & SMM", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", accent: "#7C3AED" },
  { name: "Marketing Academy", category: "Full Digital Stack", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", accent: "#0284C7" },
  { name: "Clothing Brand", category: "Google Ads & SEO", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", accent: "#DB2777" },
  { name: "Logo Designs", category: "Graphic Design", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", accent: "#059669" },
  { name: "GMB Listings", category: "Local SEO & GMB", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", accent: "#F59E0B" },
  { name: "E-Commerce Store", category: "Web & Performance", color: "bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400", accent: "#6366F1" },
  { name: "DCB Project", category: "Branding & Web", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", accent: "#7C3AED" },
  { name: "Bengal Journals", category: "Content & SEO", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", accent: "#0891B2" },
];

const STATS = [
  { value: "150+", label: "Projects delivered" },
  { value: "23+", label: "Industries served" },
  { value: "4.2×", label: "Average ROAS" },
  { value: "234%", label: "Avg. organic growth" },
];

function PortfolioCard({ item, delay }: { item: typeof PORTFOLIO[0]; delay: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 motion-reduce:translate-y-0 cursor-pointer`}>
      {/* Accent corner blob */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08] transition-opacity group-hover:opacity-[0.14]"
        style={{ backgroundColor: item.accent }} />

      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${item.color}`}>
        {item.name.charAt(0)}
      </div>
      <p className="font-display text-base font-semibold text-[var(--ink)] mb-1">{item.name}</p>
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.color}`}>
        {item.category}
      </span>
    </div>
  );
}

export default function WorkPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setHeroVisible(true);
  }, []);

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
            <Link href="/work"     className="text-coral-500 font-semibold">Our Work</Link>
            <Link href="/blog"     className="hover:text-coral-500 transition-colors">Blog</Link>
            <Link href="/contact"  className="hover:text-coral-500 transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/contact" className="rounded-full bg-coral-500 px-5 py-2 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
              Free audit →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        <div className="blob pointer-events-none absolute -top-24 -left-24 h-72 w-72 bg-[#2DBFA0] opacity-[0.07]" aria-hidden />
        <div className="blob pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 bg-coral-500 opacity-[0.06]" aria-hidden />

        <div className={`mx-auto max-w-6xl px-5 text-center transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <p className="section-label mb-4">Our work</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--ink)] md:text-5xl mb-6">
            150+ projects. Every industry.<br className="hidden sm:block" />
            <span className="text-coral-500"> Real results.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
            From local dental clinics to e-commerce brands, NGOs to marketing academies — we've
            helped businesses across 23+ industries grow their digital presence.
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-coral-500 py-10">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center text-white">
                <p className="font-display text-3xl font-extrabold md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm font-medium opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio grid */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="mb-10">
          <p className="section-label mb-3">Portfolio</p>
          <h2 className="font-display text-2xl font-bold text-[var(--ink)] md:text-3xl">
            Brands we've grown
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {PORTFOLIO.map((item, i) => (
            <PortfolioCard
              key={item.name}
              item={item}
              delay={`reveal-delay-${(i % 6) + 1}`}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-[var(--surface-2)]">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="section-label mb-4">Your brand, next</p>
          <h2 className="font-display text-3xl font-bold text-[var(--ink)] mb-4">
            Ready to join the list?
          </h2>
          <p className="text-[var(--muted)] mb-8 leading-relaxed">
            Book a free audit and let's talk about where your business can grow.
          </p>
          <Link href="/contact"
            className="inline-block rounded-full bg-coral-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600 transition-colors">
            Get your free audit →
          </Link>
        </div>
      </section>

      <footer className="bg-[#1C1410] text-white/40 text-center py-8 text-xs">
        <p>© {new Date().getFullYear()} Divyash Digital · <Link href="/" className="hover:text-coral-400 transition-colors">Home</Link> · info@divyashdigital.co.in</p>
      </footer>
    </div>
  );
}
