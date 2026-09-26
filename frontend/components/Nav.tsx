"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { label: "Team", href: "/team" },
  { label: "Services", href: "/services" },
  { label: "Our Work", href: "/work" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

function WhatsAppFAB() {
  return (
    <a
      href="https://wa.me/918810376026"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-5 z-50 group"
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping group-hover:opacity-0" aria-hidden />
      {/* Circle button */}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/40 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[#25D366]/50">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      </span>
      {/* Tooltip */}
      <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#111318] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        Chat with us
      </span>
    </a>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled || open ? "bg-[var(--surface)]/95 shadow-sm backdrop-blur-md border-b border-[var(--border)]" : "bg-transparent"
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/divyash-logo.jpeg" alt="Divyash Digital" className="h-10 w-auto object-contain flex-shrink-0 rounded-lg sm:h-12 md:h-14 lg:h-16" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--muted)]">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`transition-colors hover:text-coral-500 ${isActive(href) ? "text-coral-500 font-semibold" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors px-3 py-1.5">
            Sign in
          </Link>
          <Link href="/contact" className="rounded-full bg-coral-500 px-5 py-2 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
            Free Audit
          </Link>
        </div>

        {/* Mobile top bar */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Link
            href="/contact"
            className="rounded-full bg-coral-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-coral-600 transition-colors"
          >
            Free Audit
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 space-y-4">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block text-sm font-medium transition-colors hover:text-coral-500 ${isActive(href) ? "text-coral-500 font-semibold" : "text-[var(--muted)]"}`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[var(--border)] space-y-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="block rounded-full bg-coral-500 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-coral-600 transition-colors"
            >
              Free Audit
            </Link>
          </div>
        </div>
      )}
    </header>

    <WhatsAppFAB />
    </>
  );
}
