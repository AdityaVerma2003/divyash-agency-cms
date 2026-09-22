"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const LIMIT = 9;

const TOPICS = ["All", "SEO", "Social Media", "Google Ads", "Meta Ads", "Web Design", "Graphic Design", "Case Study", "News & Updates"];

interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string | null;
  category?: string | null;
  publishedAt: string;
  author?: { id: string; name: string };
}

interface PageResponse {
  posts: PostSummary[];
  total: number;
  page: number;
  pages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function BlogCard({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:-translate-y-0.5 motion-reduce:translate-y-0"
    >
      {/* Cover */}
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[var(--muted)] opacity-30" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {/* Subtle brand gradient overlay on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {post.category && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--surface)]/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold text-coral-500">
            {post.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs text-[var(--muted)]">
          {post.author?.name && <span className="font-medium">{post.author.name} · </span>}
          {formatDate(post.publishedAt)}
        </p>
        <h2 className="mb-2 text-base font-bold leading-snug text-[var(--ink)] group-hover:text-coral-500 transition-colors line-clamp-2">
          {post.title}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--muted)] line-clamp-3 flex-1">{post.excerpt}</p>
        <span className="mt-4 text-xs font-semibold text-coral-500 group-hover:text-coral-600 transition-colors">
          Read more →
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="mb-6 text-[var(--muted)] opacity-25">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[var(--ink)]">New posts coming soon</h2>
      <p className="mt-2 max-w-xs text-sm text-[var(--muted)] leading-relaxed">
        The team is working on fresh content about digital marketing, SEO, and growth strategies for Delhi businesses.
      </p>
      <Link href="/contact" className="mt-6 rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
        Contact us →
      </Link>
    </div>
  );
}

export default function BlogPage() {
  const [page, setPage]           = useState(1);
  const [activeTopic, setActiveTopic] = useState("All");
  const [data, setData]           = useState<PageResponse | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    const catParam = activeTopic !== "All" ? `&category=${encodeURIComponent(activeTopic)}` : "";
    fetch(`${API}/blog-posts?limit=${LIMIT}&page=${page}${catParam}`)
      .then((r) => r.json())
      .then((d: PageResponse) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, activeTopic]);

  function changeTopic(t: string) {
    setActiveTopic(t);
    setPage(1);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Divyash Digital" className="h-7 w-7 object-contain" />
            <span className="font-display font-bold text-[var(--ink)]">Divyash Digital</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/contact" className="hidden sm:inline-flex rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
              Free audit →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral-100 bg-coral-50 dark:border-coral-500/20 dark:bg-coral-500/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-coral-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wide text-coral-600 dark:text-coral-400">
              Divyash Digital Blog
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--ink)] sm:text-4xl">
            Insights on Growth &amp; Digital Marketing
          </h1>
          <p className="mt-3 text-base text-[var(--muted)] max-w-xl mx-auto">
            Practical strategies for Delhi businesses serious about growing online — SEO, ads, social media, and more.
          </p>
        </div>

        {/* Topic filter tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => changeTopic(topic)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTopic === topic
                  ? "bg-coral-500 text-white shadow-sm shadow-coral-500/30"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-coral-500 hover:text-coral-500"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="aspect-[16/9] bg-[var(--surface-2)]" />
                <div className="p-5 space-y-2">
                  <div className="h-3 rounded bg-[var(--border)] w-1/3" />
                  <div className="h-4 rounded bg-[var(--border)] w-3/4" />
                  <div className="h-3 rounded bg-[var(--border)]" />
                  <div className="h-3 rounded bg-[var(--border)] w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.posts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.posts.map((post) => <BlogCard key={post.id} post={post} />)}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-[var(--muted)]">
                  Page {data.page} of {data.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page >= data.pages}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Simple footer */}
      <footer className="mt-16 border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
          <span className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} Divyash Digital</span>
          <div className="flex gap-5 text-sm text-[var(--muted)]">
            <Link href="/" className="hover:text-coral-500 transition-colors">Home</Link>
            <Link href="/services" className="hover:text-coral-500 transition-colors">Services</Link>
            <Link href="/contact" className="hover:text-coral-500 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
