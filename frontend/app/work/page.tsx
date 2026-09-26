"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";
import { clientLogoSrc } from "@/lib/clients";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface CaseStudy {
  id: string;
  clientId: string;
  clientName: string;
  title?: string | null;
  pdfUrl: string;
}

interface PortfolioItem {
  name: string;
  /** 1–2 line description of the client's niche/business */
  intro: string;
  category: string;
  color: string;
  accent: string;
  /** File in public/clients/ — falls back to an initial avatar when absent */
  logo?: string;
}

const PORTFOLIO: PortfolioItem[] = [
  { name: "Pet Paradise", logo: "18.webp", intro: "Pet care and adoption services for loving homes.", category: "Branding & SMM", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", accent: "#F59E0B" },
  { name: "Retail Store", intro: "A neighbourhood retail store serving everyday essentials.", category: "Web Design & SEO", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", accent: "#0284C7" },
  { name: "The Springdale School", logo: "36.webp", intro: "A Varanasi school built on the motto \"Love, Peace, Joy.\"", category: "GMB & SEO", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", accent: "#059669" },
  { name: "Grocery Store", intro: "A local grocery store stocking daily household needs.", category: "Social Media", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", accent: "#DB2777" },
  { name: "SD Dental Care", logo: "33.webp", intro: "Dental clinic offering general and cosmetic dentistry.", category: "App & Web Design", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", accent: "#0891B2" },
  { name: "Vedaanta Clinic", logo: "4.webp", intro: "Advanced dental & medical care under one roof.", category: "GMB & Meta Ads", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", accent: "#7C3AED" },
  { name: "F — Fashion World", logo: "55.webp", intro: "Fashion retail brand curating everyday and occasion wear.", category: "E-Commerce & Ads", color: "bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400", accent: "#6366F1" },
  { name: "Precious Skincare", logo: "22.svg", intro: "Skincare brand built around the idea that skin tells your story.", category: "Meta Ads & SMM", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", accent: "#F87DA3" },
  { name: "MindSparkz", logo: "19.webp", intro: "Early-learning programs focused on nurturing young minds.", category: "Web Design & GMB", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", accent: "#4F46E5" },
  { name: "Stone Gateway", logo: "46.webp", intro: "Building materials trading company sourcing stone at scale.", category: "Google Ads & SEO", color: "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-500", accent: "#78716C" },
  { name: "Neetu Singh & Associates", logo: "1.webp", intro: "A legal practice offering counsel across civil and corporate law.", category: "Branding & Web", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", accent: "#0D9488" },
  { name: "Shyam Multi-Speciality Clinic", logo: "39.svg", intro: "Multi-speciality clinic offering a range of medical consultations.", category: "GMB & Meta Ads", color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400", accent: "#A21CAF" },
  { name: "The Adore Gem", logo: "35.svg", intro: "Handmade accessories and jewellery for everyday elegance.", category: "Social Media & Ads", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", accent: "#EA580C" },
  { name: "Ink Play Foundation", logo: "15.webp", intro: "A foundation using art and play to support children's growth.", category: "Web Design & SEO", color: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-600", accent: "#65A30D" },
  { name: "Hyper Market", intro: "A hypermarket chain offering groceries and household goods.", category: "E-Commerce & GMB", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500", accent: "#CA8A04" },
  { name: "R&D Dental", logo: "26.webp", intro: "Family dental care with a focus on comfort and precision.", category: "Meta Ads & SMM", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", accent: "#7C3AED" },
  { name: "Startup Counter", logo: "14.svg", intro: "A consultancy helping startups and small businesses grow faster.", category: "Full Digital Stack", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", accent: "#0284C7" },
  { name: "Shri Ram Banarsee Saree", logo: "47.webp", intro: "Traditional Banarasi saree house rooted in Varanasi craftsmanship.", category: "Google Ads & SEO", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400", accent: "#DB2777" },
  { name: "Logo Designs", intro: "Freelance identity design for brands starting out.", category: "Graphic Design", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", accent: "#059669" },
  { name: "GMB Listings", intro: "Multi-location business helping customers find them locally.", category: "Local SEO & GMB", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", accent: "#F59E0B" },
  { name: "E-Commerce Store", intro: "An online store scaling direct-to-consumer sales.", category: "Web & Performance", color: "bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400", accent: "#6366F1" },
  { name: "Delhi Cantonment Board", logo: "11.webp", intro: "Civic body overseeing municipal services for the cantonment area.", category: "Branding & Web", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", accent: "#7C3AED" },
  { name: "Thinkers Log", logo: "2.webp", intro: "A journal of ideas and dissent from Bengal.", category: "Content & SEO", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", accent: "#0891B2" },
];

const STATS = [
  { value: "180+", label: "Projects delivered" },
  { value: "23+", label: "Industries served" },
  { value: "4.2×", label: "Average ROAS" },
  { value: "234%", label: "Avg. organic growth" },
];

function PortfolioCard({ item, delay, caseStudy }: {
  item: typeof PORTFOLIO[0];
  delay: string;
  caseStudy?: CaseStudy;
}) {
  const { ref, visible } = useReveal();
  // "Branding & SMM" -> ["Branding", "SMM"] — rendered as individual service tags
  const services = item.category.split("&").map((s) => s.trim()).filter(Boolean);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 motion-reduce:translate-y-0 flex flex-col gap-4`}
    >
      {/* Accent blob */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08] transition-opacity group-hover:opacity-[0.14]"
        style={{ backgroundColor: item.accent }} />

      {/* Logo + name, side by side */}
      <div className="relative flex items-center gap-3">
        {item.logo ? (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clientLogoSrc(item.logo)}
              alt={item.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
          </div>
        ) : (
          <div className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-bold ${item.color}`}>
            {item.name.charAt(0)}
          </div>
        )}
        <p className="font-display text-base font-semibold leading-snug text-[var(--ink)]">{item.name}</p>
      </div>

      {/* Niche intro */}
      <p className="relative -mt-1 text-sm leading-relaxed text-[var(--muted)]">{item.intro}</p>

      {/* Services taken, as individual tags */}
      <div className="relative flex flex-wrap gap-1.5">
        {services.map((service) => (
          <span key={service} className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.color}`}>
            {service}
          </span>
        ))}
      </div>

      {/* Download case study */}
      {caseStudy ? (
        <a
          href={caseStudy.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="relative mt-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-coral-500 hover:text-coral-500 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Case Study
        </a>
      ) : (
        <span className="relative mt-auto inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] opacity-50 cursor-default select-none">
          Case study coming soon
        </span>
      )}
    </div>
  );
}

export default function WorkPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);

  useEffect(() => {
    setHeroVisible(true);
    fetch(`${API}/public/case-studies`)
      .then((r) => r.json())
      .then((data: CaseStudy[]) => setCaseStudies(data))
      .catch(() => setCaseStudies([]));
  }, []);

  function findCaseStudy(name: string): CaseStudy | undefined {
    const lower = name.toLowerCase();
    return caseStudies.find(
      (cs) => cs.clientName.toLowerCase().includes(lower) || lower.includes(cs.clientName.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <Nav />

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        <div className="blob pointer-events-none absolute -top-24 -left-24 h-72 w-72 bg-[#2DBFA0] opacity-[0.07]" aria-hidden />
        <div className="blob pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 bg-coral-500 opacity-[0.06]" aria-hidden />

        <div className={`mx-auto max-w-6xl px-5 text-center transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <p className="section-label mb-4">Our work</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--ink)] md:text-5xl mb-6">
            180+ Projects Delivered. 23+ Industries.<br className="hidden sm:block" />
            <span className="text-coral-500"> Real Results.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
            From local clinics and schools to e-commerce brands and marketing academies — we&apos;ve
            partnered with businesses across 23+ industries to drive measurable digital growth. Download
            a case study below to see exactly how we did it.
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
            Brands we&apos;ve grown
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {PORTFOLIO.map((item, i) => (
            <PortfolioCard
              key={item.name}
              item={item}
              delay={`reveal-delay-${(i % 6) + 1}`}
              caseStudy={findCaseStudy(item.name)}
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
            Book a free audit and let&apos;s talk about where your business can grow.
          </p>
          <Link href="/contact"
            className="inline-block rounded-full bg-coral-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600 transition-colors">
            Get your free audit →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
