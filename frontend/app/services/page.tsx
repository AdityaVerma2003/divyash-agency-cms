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

const SERVICES = [
  {
    name: "Search Engine Optimisation",
    slug: "seo",
    tagline: "Rank higher. Get found first.",
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    accent: "#059669",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10" cy="10" r="6" /><path d="M15.5 15.5L20 20" strokeWidth="2" />
        <path d="M10 7v6M7 10h6" strokeWidth="1.5" />
      </svg>
    ),
    description: "We audit your entire digital footprint — technical health, content gaps, backlink profile, and competitor landscape — then build a 90-day execution plan tied to search intent, not vanity keywords.",
    deliverables: [
      "Full technical SEO audit",
      "Keyword strategy & content plan",
      "On-page optimisation",
      "Link building & authority building",
      "Monthly ranking reports",
    ],
    result: "Average client sees 3× organic traffic in 6 months",
  },
  {
    name: "Social Media Management",
    slug: "smm",
    tagline: "Content that builds real audiences.",
    color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    accent: "#0284C7",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
      </svg>
    ),
    description: "From content calendars to community management, we handle every touchpoint on Instagram, Facebook, LinkedIn, and X — so your brand stays consistent, engaging, and growing.",
    deliverables: [
      "Monthly content calendar",
      "Platform-native creatives & captions",
      "Scheduling & publishing",
      "Community management",
      "Monthly engagement reports",
    ],
    result: "89% average engagement rate improvement",
  },
  {
    name: "Google Ads",
    slug: "google-ads",
    tagline: "Intent-driven. Conversion-focused.",
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    accent: "#D97706",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    description: "We run Search, Display, Shopping, and YouTube campaigns with granular audience segmentation, negative keyword management, and full conversion tracking — so every rupee earns measurable returns.",
    deliverables: [
      "Account setup & restructure",
      "Search, Display & Shopping campaigns",
      "Conversion tracking setup",
      "A/B ad copy testing",
      "Weekly performance dashboard",
    ],
    result: "Average ROAS of 4.2× across managed accounts",
  },
  {
    name: "Meta Ads",
    slug: "meta-ads",
    tagline: "Reach. Leads. Sales — not just clicks.",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    accent: "#7C3AED",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
        <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
      </svg>
    ),
    description: "From brand awareness to lead generation funnels, we build Facebook and Instagram campaigns with precise custom audiences, lookalikes, and retargeting flows that move people from scroll to sale.",
    deliverables: [
      "Audience research & segmentation",
      "Creative strategy & ad production",
      "Lead gen & retargeting funnels",
      "Pixel setup & event tracking",
      "Bi-weekly optimisation & reporting",
    ],
    result: "45% average reduction in cost-per-lead",
  },
  {
    name: "Web Design & Development",
    slug: "web-design",
    tagline: "Fast. Mobile-first. Built to convert.",
    color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    accent: "#0891B2",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="15" rx="2" /><path d="M2 7h20M8 21h8M12 18v3" />
      </svg>
    ),
    description: "We design and build websites that reflect your brand, load in under 2 seconds, and are built with conversion rate optimisation baked in — not bolted on as an afterthought.",
    deliverables: [
      "UX wireframing & UI design",
      "Responsive development",
      "Core Web Vitals optimisation",
      "CMS setup (WordPress / custom)",
      "Post-launch support & maintenance",
    ],
    result: "Sub-2s load time on every project we deliver",
  },
  {
    name: "Graphic Design",
    slug: "graphic-design",
    tagline: "Visual identity that stops the scroll.",
    color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    accent: "#DB2777",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    description: "Logos, brand guides, social media templates, brochures, packaging, and presentation decks — we create the visual system that makes your brand instantly recognisable and consistently professional.",
    deliverables: [
      "Logo design & brand identity",
      "Social media creative templates",
      "Marketing collateral & print",
      "Presentation deck design",
      "Brand style guide",
    ],
    result: "100+ design projects delivered across all industries",
  },
];

function ServiceBlock({ svc, index }: { svc: typeof SERVICES[0]; index: number }) {
  const { ref, visible } = useReveal();
  const isEven = index % 2 === 0;
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${visible ? "visible" : ""} grid grid-cols-1 gap-8 py-16 md:grid-cols-2 md:py-20 border-b border-[var(--border)] last:border-0`}>

      {/* Content */}
      <div className={isEven ? "md:order-1" : "md:order-2"}>
        <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${svc.color}`}>
          {svc.icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">{svc.tagline}</p>
        <h2 className="font-display text-2xl font-bold text-[var(--ink)] md:text-3xl mb-4">{svc.name}</h2>
        <p className="text-[var(--muted)] leading-relaxed mb-6">{svc.description}</p>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">What's included</p>
          <ul className="space-y-2">
            {svc.deliverables.map((d) => (
              <li key={d} className="flex items-start gap-2.5 text-sm text-[var(--ink)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0 text-coral-500">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-coral-500" />
          <p className="text-xs font-semibold text-[var(--ink)]">{svc.result}</p>
        </div>
      </div>

      {/* Visual card */}
      <div className={`${isEven ? "md:order-2" : "md:order-1"} flex items-center justify-center`}>
        <div className="relative w-full max-w-xs">
          <div className="blob absolute inset-0 -m-6 opacity-[0.06]" style={{ backgroundColor: svc.accent }} />
          <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl shadow-black/5 dark:shadow-black/30 text-center">
            <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${svc.color}`}>
              {svc.icon}
            </div>
            <p className="font-display text-xl font-bold text-[var(--ink)] mb-1">{svc.name}</p>
            <p className="text-sm text-[var(--muted)] mb-6">{svc.tagline}</p>
            <Link href="/contact"
              className="block w-full rounded-full bg-coral-500 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
              Get started →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
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
            <Link href="/services" className="text-coral-500 font-semibold">Services</Link>
            <Link href="/work"     className="hover:text-coral-500 transition-colors">Our Work</Link>
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
        <div className="blob pointer-events-none absolute -top-24 -right-24 h-80 w-80 bg-coral-500 opacity-[0.07]" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 text-center">
          <p className="section-label mb-4">What we do</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--ink)] md:text-5xl mb-6">
            Every service. One outcome: <span className="text-coral-500">growth.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
            We offer six specialised digital marketing services — each designed to work independently
            or as part of a full-stack growth strategy tailored to your business.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        {SERVICES.map((svc, i) => (
          <ServiceBlock key={svc.slug} svc={svc} index={i} />
        ))}
      </section>

      {/* CTA */}
      <section className="bg-coral-500 py-16">
        <div className="mx-auto max-w-3xl px-5 text-center text-white">
          <h2 className="font-display text-3xl font-extrabold mb-4">Not sure where to start?</h2>
          <p className="opacity-85 mb-8">Book a free audit and we'll tell you exactly which services will move the needle for your business — no pitch, no pressure.</p>
          <Link href="/contact" className="inline-block rounded-full bg-white px-8 py-3.5 font-semibold text-coral-600 hover:bg-coral-50 transition-colors">
            Book your free audit →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1C1410] text-white/40 text-center py-8 text-xs">
        <p>© {new Date().getFullYear()} Divyash Digital · <Link href="/" className="hover:text-coral-400 transition-colors">Home</Link> · info@divyashdigital.co.in</p>
      </footer>
    </div>
  );
}
