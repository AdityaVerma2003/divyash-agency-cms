"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

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

  useEffect(() => {
    fetch(`${API}/blog-posts/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setPost(d); });
  }, [slug]);

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

      <main className="mx-auto max-w-3xl px-5 py-12">
        {/* Back */}
        <Link href="/blog" className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-coral-500 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to blog
        </Link>

        {!post ? (
          /* Loading skeleton */
          <div className="animate-pulse space-y-4">
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

            {/* Content */}
            <div
              className="rich-content prose-like mt-8"
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
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
          <span className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} Divyash Digital</span>
          <div className="flex gap-5 text-sm text-[var(--muted)]">
            <Link href="/" className="hover:text-coral-500 transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-coral-500 transition-colors">Blog</Link>
            <Link href="/contact" className="hover:text-coral-500 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
