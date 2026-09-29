"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

interface TocEntry {
  id: string;
  label: string;
}

function slugify(text: string, seen: Set<string>) {
  let base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "section";
  let id = base;
  let n = 2;
  while (seen.has(id)) id = `${base}-${n++}`;
  seen.add(id);
  return id;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  author?: { id: string; name: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    fetch(`${API}/blog-posts/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setPost(d); });
  }, [slug]);

  // Build a table of contents from the post's own <h2> headings, once the
  // rich-text HTML has rendered — CMS content has no pre-known section list
  // like the static legal pages do, so this has to walk the actual DOM.
  useEffect(() => {
    if (!post) return;
    const container = contentRef.current;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll("h2"));
    const seen = new Set<string>();
    const entries: TocEntry[] = headings.map((h) => {
      const id = h.id || slugify(h.textContent ?? "", seen);
      h.id = id;
      return { id, label: h.textContent ?? "" };
    });
    setToc(entries);
    setActiveId(entries[0]?.id ?? "");

    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (obsEntries) => {
        const visible = obsEntries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [post]);

  // Set page title and meta description from post data
  useEffect(() => {
    if (!post) return;
    const pageTitle = post.metaTitle || post.title;
    const pageDesc  = post.metaDescription || post.excerpt;
    document.title = `${pageTitle} | Divyash Digital`;
    let meta = document.querySelector<HTMLMetaElement>("meta[name='description']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = pageDesc;
  }, [post]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ background: "var(--page-bg)" }}>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Post not found</h1>
        <p className="mt-2 text-[var(--muted)]">This post may have been removed or the URL is incorrect.</p>
        <Link href="/blog" className="mt-5 text-sm font-semibold text-coral-500 hover:text-coral-600">← Back to blog</Link>
      </div>
    );
  }

  const hasToc = toc.length > 0;

  const indexList = (
    <ul className="space-y-1">
      {toc.map(({ id, label }, i) => {
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
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      <Nav />

      <main className="mx-auto max-w-6xl px-5 pt-28 pb-12">
        {/* Back */}
        <Link href="/blog" className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-coral-500 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to blog
        </Link>

        {!post ? (
          /* Loading skeleton */
          <div className="mx-auto max-w-3xl animate-pulse space-y-4">
            <div className="h-6 rounded bg-[var(--border)] w-1/4" />
            <div className="h-8 rounded bg-[var(--border)] w-3/4" />
            <div className="h-4 rounded bg-[var(--border)] w-1/2" />
            <div className="aspect-[16/9] rounded-2xl bg-[var(--surface-2)]" />
            <div className="space-y-2 pt-4">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-3 rounded bg-[var(--border)]" />)}
            </div>
          </div>
        ) : (
          <article>
            <div className="mx-auto max-w-3xl">
              {/* Category pill */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral-100 bg-coral-50 dark:border-coral-500/20 dark:bg-coral-500/10 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-coral-600 dark:text-coral-400">Divyash Blog</span>
              </div>

              {/* Title */}
              <h1 className="font-display text-2xl font-extrabold leading-tight text-[var(--ink)] sm:text-3xl md:text-4xl">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                {post.author && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-coral-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {post.author.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="font-medium">{post.author.name}</span>
                  </div>
                )}
                {post.publishedAt && (
                  <>
                    <span>·</span>
                    <span>{formatDate(post.publishedAt)}</span>
                  </>
                )}
              </div>

              {/* Cover image */}
              {post.coverImageUrl && (
                <div className="my-8 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="w-full object-cover"
                    style={{ maxHeight: "400px" }}
                  />
                </div>
              )}

              {/* Excerpt */}
              <p className="mt-6 text-base leading-relaxed text-[var(--muted)] border-l-4 border-coral-500 pl-4">
                {post.excerpt}
              </p>
            </div>

            {/* Index (when the post has its own <h2> sections) + content */}
            <div className={hasToc ? "mt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12" : "mx-auto mt-8 max-w-3xl"}>
              {hasToc && (
                <aside className="mb-8 lg:mb-0">
                  <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:hidden">
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
              )}

              <div className={hasToc ? "min-w-0 mx-auto max-w-3xl lg:mx-0 lg:max-w-none" : "min-w-0"}>
                <div
                  ref={contentRef}
                  className="rich-content prose-like"
                  dangerouslySetInnerHTML={{ __html: post.contentMarkdown }}
                />

                {/* CTA */}
                <div className="mt-12 rounded-2xl bg-gradient-to-br from-coral-50 to-brand-50 dark:from-coral-900/20 dark:to-brand-900/20 border border-coral-100 dark:border-coral-500/20 p-6 text-center">
                  <p className="text-base font-bold text-[var(--ink)]">Ready to grow your business?</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Get a free audit from Delhi&apos;s digital marketing team.</p>
                  <Link href="/contact" className="mt-4 inline-flex rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 transition-colors">
                    Get your free audit →
                  </Link>
                </div>
              </div>
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
