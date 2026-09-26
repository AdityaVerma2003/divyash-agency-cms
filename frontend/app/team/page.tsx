"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface TeamMember {
  id: string;
  name: string;
  designation: string | null;
  photoUrl: string | null;
  socialLinks: string | null;
  role: string;
}

interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

function parseSocials(raw: string | null): SocialLinks {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function Avatar({ member, large }: { member: TeamMember; large?: boolean }) {
  const size = large ? "h-24 w-24 text-2xl" : "h-16 w-16 text-lg";
  if (member.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.photoUrl}
        alt={member.name}
        className={`${size} rounded-2xl object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${size} rounded-2xl bg-coral-100 dark:bg-coral-900/30 flex items-center justify-center font-bold text-coral-600 dark:text-coral-400 flex-shrink-0`}>
      {member.name.charAt(0).toUpperCase()}
    </div>
  );
}

function SocialIcon({ href, type }: { href: string; type: string }) {
  const icons: Record<string, JSX.Element> = {
    instagram: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    ),
    linkedin: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    twitter: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    youtube: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
      </svg>
    ),
    website: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  };
  const icon = icons[type];
  if (!icon) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] hover:text-coral-500 hover:bg-coral-50 dark:hover:bg-coral-900/20 transition-colors">
      {icon}
    </a>
  );
}

function LeaderCard({ member }: { member: TeamMember }) {
  const { ref, visible } = useReveal();
  const socials = parseSocials(member.socialLinks);
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${visible ? "visible" : ""} flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm`}
    >
      <Avatar member={member} large />
      <div className="flex-1 min-w-0">
        <p className="font-display text-xl font-extrabold text-[var(--ink)]">{member.name}</p>
        {member.designation && (
          <p className="mt-1 text-sm font-semibold text-coral-500">{member.designation}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(socials).map(([type, url]) =>
            url ? <SocialIcon key={type} href={url} type={type} /> : null
          )}
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member, delay }: { member: TeamMember; delay: string }) {
  const { ref, visible } = useReveal();
  const socials = parseSocials(member.socialLinks);
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${delay} ${visible ? "visible" : ""} flex flex-col items-center text-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5`}
    >
      <Avatar member={member} />
      <div>
        <p className="font-display text-sm font-bold text-[var(--ink)]">{member.name}</p>
        {member.designation && (
          <p className="mt-0.5 text-xs font-medium text-coral-500">{member.designation}</p>
        )}
      </div>
      {Object.values(socials).some(Boolean) && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {Object.entries(socials).map(([type, url]) =>
            url ? <SocialIcon key={type} href={url} type={type} /> : null
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/team`)
      .then((r) => r.json())
      .then((data: TeamMember[]) => { setMembers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const leaders = members.filter((m) => m.role === "SUPER_ADMIN");
  const rest = members.filter((m) => m.role !== "SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <Nav />

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        <div className="blob pointer-events-none absolute -top-24 -right-24 h-80 w-80 bg-coral-500 opacity-[0.07]" aria-hidden />
        <div className="blob pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 bg-[#2DBFA0] opacity-[0.06]" aria-hidden style={{ animationDelay: "-3s" }} />

        <div className="mx-auto max-w-6xl px-5 text-center">
          <p className="section-label mb-4">Meet the team</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--ink)] md:text-5xl mb-4">
            The people behind <span className="text-coral-500">your growth.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
            We&apos;re a dedicated team of digital marketers, strategists, and creatives
            passionate about helping Indian businesses scale online.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 space-y-16">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-[var(--surface-2)]" />
                <div className="h-3 rounded bg-[var(--border)] w-2/3" />
                <div className="h-2.5 rounded bg-[var(--border)] w-1/2" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] text-sm">Team profiles coming soon.</p>
          </div>
        ) : (
          <>
            {/* Leadership */}
            {leaders.length > 0 && (
              <div>
                <p className="section-label mb-6">Leadership</p>
                <div className="grid gap-5 md:grid-cols-2">
                  {leaders.map((m) => <LeaderCard key={m.id} member={m} />)}
                </div>
              </div>
            )}

            {/* Rest of team */}
            {rest.length > 0 && (
              <div>
                <p className="section-label mb-6">Our team</p>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {rest.map((m, i) => (
                    <MemberCard key={m.id} member={m} delay={`reveal-delay-${(i % 6) + 1}`} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
