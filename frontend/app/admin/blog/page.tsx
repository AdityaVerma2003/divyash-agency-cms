"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { BlogPost } from "@/types";

type StatusFilter = "" | "DRAFT" | "PUBLISHED";

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     bg: "bg-[var(--surface-2)]",          text: "text-[var(--muted)]",          dot: "bg-[var(--muted)]" },
  PUBLISHED: { label: "Published", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
};

function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminBlogPage() {
  const { success, error: toastError } = useToast();
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null);

  async function loadPosts() {
    try {
      const url = statusFilter ? `/admin/blog-posts?status=${statusFilter}` : "/admin/blog-posts";
      const data = await api.get<BlogPost[]>(url, getAccessToken());
      setPosts(data);
    } catch (err) {
      toastError("Could not load posts", err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => { loadPosts(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(post: BlogPost) {
    setDeleting(post.id);
    try {
      await api.del(`/admin/blog-posts/${post.id}`, getAccessToken());
      success("Post deleted", post.title);
      setConfirmDelete(null);
      loadPosts();
    } catch (err) {
      toastError("Delete failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Blog</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {posts ? `${posts.length} post${posts.length !== 1 ? "s" : ""}` : "Loading…"}
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New post
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-5">
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1 gap-1">
          {(["", "DRAFT", "PUBLISHED"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[var(--surface)] shadow-sm text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {s === "" ? "All" : s === "DRAFT" ? "Drafts" : "Published"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {!posts ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--border)] opacity-40" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm font-semibold text-[var(--ink)]">No posts yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Create your first blog post to get started.</p>
          <Link href="/admin/blog/new" className="btn btn-primary mt-4 inline-flex">+ New post</Link>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_160px_160px_100px] border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
            {["Title", "Status", "Author", "Date", ""].map((h) => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-[var(--border)]">
            {posts.map((post) => (
              <div key={post.id} className="group px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
                {/* Mobile layout */}
                <div className="sm:hidden flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/blog/${post.id}/edit`} className="font-semibold text-sm text-[var(--ink)] hover:text-coral-500 transition-colors leading-snug">
                      {post.title}
                    </Link>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="text-xs text-[var(--muted)] line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--muted)]">
                      {post.author?.name} · {post.publishedAt ? formatDate(post.publishedAt) : "Draft"}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/admin/blog/${post.id}/edit`} className="text-xs text-coral-500 hover:text-coral-600 font-medium">Edit</Link>
                      <button onClick={() => setConfirmDelete(post)} className="text-xs text-[var(--muted)] hover:text-danger">Delete</button>
                    </div>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[1fr_120px_160px_160px_100px] items-center gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/blog/${post.id}/edit`} className="font-semibold text-sm text-[var(--ink)] hover:text-coral-500 transition-colors truncate block">
                      {post.title}
                    </Link>
                    <p className="text-xs text-[var(--muted)] truncate mt-0.5">{post.excerpt}</p>
                  </div>
                  <StatusBadge status={post.status} />
                  <span className="text-sm text-[var(--muted)] truncate">{post.author?.name ?? "—"}</span>
                  <span className="text-sm text-[var(--muted)]">
                    {post.publishedAt ? formatDate(post.publishedAt) : <span className="italic text-xs">Draft</span>}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] hover:border-coral-500 hover:text-coral-500 transition-all"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setConfirmDelete(post)}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] hover:border-danger hover:text-danger transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="text-base font-bold text-[var(--ink)]">Delete post?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]">{confirmDelete.title}</span> will be permanently deleted and removed from the public blog.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!deleting}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
