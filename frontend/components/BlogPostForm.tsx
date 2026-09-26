"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import RichEditor from "@/components/RichEditor";
import type { BlogPost } from "@/types";

function slugify(t: string) {
  return t.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface Props {
  initialPost?: BlogPost;
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

export default function BlogPostForm({ initialPost }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const isEdit = !!initialPost;

  const [title, setTitle]                   = useState(initialPost?.title ?? "");
  const [slug, setSlug]                     = useState(initialPost?.slug ?? "");
  const [excerpt, setExcerpt]               = useState(initialPost?.excerpt ?? "");
  const [content, setContent]               = useState(initialPost?.contentMarkdown ?? "");
  const [category, setCategory]             = useState(initialPost?.category ?? "");
  const [coverUrl, setCoverUrl]             = useState(initialPost?.coverImageUrl ?? "");
  const [metaTitle, setMetaTitle]           = useState(initialPost?.metaTitle ?? "");
  const [metaDesc, setMetaDesc]             = useState(initialPost?.metaDescription ?? "");
  const [primaryKeyword, setPrimaryKeyword] = useState(initialPost?.primaryKeyword ?? "");
  const [keywords, setKeywords]             = useState(initialPost?.keywords ?? "");
  const [faqPairs, setFaqPairs]             = useState<{ q: string; a: string }[]>(() => {
    if (!initialPost?.faqSchema) return [];
    try {
      const parsed = JSON.parse(initialPost.faqSchema) as { name?: string; acceptedAnswer?: { text?: string } }[];
      return parsed.map((item) => ({ q: item.name ?? "", a: item.acceptedAnswer?.text ?? "" }));
    } catch {
      return [];
    }
  });
  const [slugManual, setSlugManual] = useState(!!initialPost);
  const [seoOpen, setSeoOpen]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [postId, setPostId]         = useState<string | null>(initialPost?.id ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  function faqToJson() {
    const filled = faqPairs.filter((p) => p.q.trim() && p.a.trim());
    if (!filled.length) return undefined;
    return JSON.stringify(filled.map((p) => ({
      "@type": "Question",
      name: p.q.trim(),
      acceptedAnswer: { "@type": "Answer", text: p.a.trim() },
    })));
  }

  function addFaqPair() { setFaqPairs((prev) => [...prev, { q: "", a: "" }]); }
  function removeFaqPair(i: number) { setFaqPairs((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateFaqPair(i: number, field: "q" | "a", val: string) {
    setFaqPairs((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  }

  // Auto-fill slug from title when creating
  useEffect(() => {
    if (!slugManual) setSlug(slugify(title));
  }, [title, slugManual]);

  const buildPayload = useCallback(() => ({
    title,
    slug,
    excerpt,
    contentMarkdown: content,
    ...(category && { category }),
    ...(coverUrl && { coverImageUrl: coverUrl }),
    ...(metaTitle && { metaTitle }),
    ...(metaDesc && { metaDescription: metaDesc }),
    ...(primaryKeyword && { primaryKeyword }),
    ...(keywords && { keywords }),
    ...(faqToJson() && { faqSchema: faqToJson() }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [title, slug, excerpt, content, category, coverUrl, metaTitle, metaDesc, primaryKeyword, keywords, faqPairs]);

  async function saveDraft() {
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      toastError("Missing fields", "Title, excerpt, and content are required.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit || postId) {
        const id = postId ?? initialPost!.id;
        await api.patch(`/admin/blog-posts/${id}`, buildPayload(), getAccessToken());
        success("Draft saved", title);
      } else {
        const created = await api.post<BlogPost>(
          "/admin/blog-posts",
          { ...buildPayload(), status: "DRAFT" },
          getAccessToken()
        );
        setPostId(created.id);
        setSlug(created.slug);
        setSlugManual(true);
        success("Draft created", created.title);
        router.replace(`/admin/blog/${created.id}/edit`);
      }
    } catch (err) {
      toastError("Save failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      toastError("Missing fields", "Title, excerpt, and content are required.");
      return;
    }
    setSaving(true);
    try {
      let id = postId ?? initialPost?.id;
      if (!id) {
        const created = await api.post<BlogPost>("/admin/blog-posts", buildPayload(), getAccessToken());
        id = created.id;
        setPostId(id);
        setSlugManual(true);
      }
      await api.patch(`/admin/blog-posts/${id}`, { ...buildPayload(), status: "PUBLISHED" }, getAccessToken());
      success("Published", title);
      router.push("/admin/blog");
    } catch (err) {
      toastError("Publish failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(file: File) {
    const id = postId ?? initialPost?.id;
    if (!id) {
      // Save draft first so we have an id
      if (!title.trim()) { toastError("Save first", "Enter a title and save a draft before uploading a cover."); return; }
      setSaving(true);
      try {
        const created = await api.post<BlogPost>("/admin/blog-posts", buildPayload(), getAccessToken());
        setPostId(created.id);
        setSlug(created.slug);
        setSlugManual(true);
        router.replace(`/admin/blog/${created.id}/edit`);
        await doUpload(created.id, file);
      } finally {
        setSaving(false);
      }
      return;
    }
    await doUpload(id, file);
  }

  async function doUpload(id: string, file: File) {
    setUploading(true);
    try {
      const token = getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const form = new FormData();
      form.append("cover", file);
      const res = await fetch(`${apiBase}/admin/blog-posts/${id}/cover-image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { coverImageUrl } = await res.json() as { coverImageUrl: string };
      setCoverUrl(coverImageUrl);
      success("Cover uploaded", "");
    } catch (err) {
      toastError("Upload failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.push("/admin/blog")} className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
          ← Back to blog
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={publish}
            disabled={saving}
            className="btn btn-primary disabled:opacity-60"
          >
            {saving ? "Publishing…" : initialPost?.status === "PUBLISHED" ? "Update & publish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Status pill (edit mode) */}
      {initialPost && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            initialPost.status === "PUBLISHED"
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
              : "bg-[var(--surface-2)] text-[var(--muted)]"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${initialPost.status === "PUBLISHED" ? "bg-emerald-500" : "bg-[var(--muted)]"}`} />
            {initialPost.status === "PUBLISHED" ? "Published" : "Draft"}
          </span>
          {initialPost.publishedAt && (
            <span className="text-xs text-[var(--muted)]">
              {new Date(initialPost.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Left — main content */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Title *</label>
            <input
              type="text"
              placeholder="Enter post title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${inputCls} text-base font-semibold`}
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted)] whitespace-nowrap">/blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugManual(true); }}
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Excerpt *</label>
            <textarea
              rows={2}
              placeholder="A short summary shown in post listings and meta description…"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-right text-xs text-[var(--muted)]">{excerpt.length}/500</p>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Topic / Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              <option value="">— Uncategorised —</option>
              {["SEO", "Social Media", "Google Ads", "Meta Ads", "Web Design", "Graphic Design", "Case Study", "News & Updates"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Rich content editor */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Content *</label>
            <RichEditor
              initialContent={content}
              onChange={setContent}
              placeholder="Start writing your post…"
            />
          </div>

          {/* SEO section */}
          <div className="rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setSeoOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--ink)]"
            >
              SEO settings
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" aria-hidden
                className={`transition-transform ${seoOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {seoOpen && (
              <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Meta title (≤70 chars)</label>
                  <input type="text" maxLength={70} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} placeholder={title || "Falls back to post title"} />
                  <p className="mt-1 text-right text-xs text-[var(--muted)]">{metaTitle.length}/70</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Meta description (≤160 chars)</label>
                  <textarea rows={2} maxLength={160} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className={`${inputCls} resize-none`} placeholder={excerpt || "Falls back to excerpt"} />
                  <p className="mt-1 text-right text-xs text-[var(--muted)]">{metaDesc.length}/160</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Primary Keyword (for SEO)</label>
                  <input type="text" value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} className={inputCls} placeholder="e.g. digital marketing agency Delhi" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Secondary Keywords (comma-separated)</label>
                  <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputCls} placeholder="e.g. seo services, social media marketing" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs text-[var(--muted)]">FAQ Schema (Q&amp;A pairs)</label>
                    <button type="button" onClick={addFaqPair} className="text-xs font-medium text-brand-600 hover:text-brand-700">+ Add FAQ</button>
                  </div>
                  {faqPairs.length === 0 && (
                    <p className="text-xs text-[var(--muted)] italic">No FAQ pairs yet — click &quot;+ Add FAQ&quot; to add one.</p>
                  )}
                  <div className="space-y-3">
                    {faqPairs.map((pair, i) => (
                      <div key={i} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <input
                            type="text"
                            value={pair.q}
                            onChange={(e) => updateFaqPair(i, "q", e.target.value)}
                            placeholder="Question"
                            className={`${inputCls} flex-1`}
                          />
                          <button type="button" onClick={() => removeFaqPair(i)} className="mt-0.5 text-xs text-danger hover:text-red-700">✕</button>
                        </div>
                        <textarea
                          rows={2}
                          value={pair.a}
                          onChange={(e) => updateFaqPair(i, "a", e.target.value)}
                          placeholder="Answer"
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — cover image */}
        <div className="space-y-4">
          <div className="card">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Cover image</p>
            {coverUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="Cover" className="w-full rounded-xl object-cover" style={{ maxHeight: "200px" }} />
                <button
                  onClick={() => { setCoverUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold text-white hover:bg-black/70"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] py-10 hover:border-coral-500 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[var(--muted)] mb-2" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p className="text-xs text-[var(--muted)]">Click to upload cover image</p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">PNG, JPG, WEBP — max 5 MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }}
            />
            {!coverUrl && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-3 w-full rounded-xl border border-[var(--border)] py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Choose file"}
              </button>
            )}
            {coverUrl && (
              <input
                type="text"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className={`${inputCls} mt-3 text-xs font-mono`}
                placeholder="Or paste image URL"
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
