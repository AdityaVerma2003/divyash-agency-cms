"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { Client } from "@/types";

interface CaseStudy {
  id: string;
  clientId: string;
  clientName: string;
  title?: string | null;
  pdfUrl: string;
  createdAt: string;
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

export default function AdminCaseStudiesPage() {
  const { success, error: toastError } = useToast();
  const [caseStudies, setCaseStudies] = useState<CaseStudy[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadData() {
    api.get<CaseStudy[]>("/admin/case-studies", getAccessToken()).then(setCaseStudies).catch(() => setCaseStudies([]));
    api.get<Client[]>("/clients", getAccessToken()).then(setClients).catch(() => setClients([]));
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(file: File) {
    if (!clientId) {
      toastError("Select client", "Please select a client before uploading.");
      return;
    }
    setUploading(true);
    try {
      const token = getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const form = new FormData();
      form.append("file", file);
      form.append("clientId", clientId);
      if (title.trim()) form.append("title", title.trim());
      const res = await fetch(`${apiBase}/admin/case-studies`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      success("Case study uploaded", "");
      setClientId("");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      loadData();
    } catch (err) {
      toastError("Upload failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(cs: CaseStudy) {
    if (!confirm(`Delete case study for ${cs.clientName}? This cannot be undone.`)) return;
    setDeletingId(cs.id);
    try {
      await api.del(`/admin/case-studies/${cs.id}`, getAccessToken());
      success("Deleted", `Case study removed.`);
      setCaseStudies((prev) => prev?.filter((c) => c.id !== cs.id) ?? null);
    } catch (err) {
      toastError("Could not delete", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--ink)]">Case Studies</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Upload a PDF case study per client. Clients can download it from the public Work page.</p>
      </div>

      {/* Upload form */}
      <div className="card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Upload case study</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Client <span className="text-danger">*</span></label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Title (optional)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. 3x ROAS for fashion brand" />
          </div>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !clientId}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading…" : "Choose PDF & upload"}
          </button>
          <p className="mt-1 text-xs text-[var(--muted)]">PDF only — max 15 MB. Uploading replaces any existing case study for this client.</p>
        </div>
      </div>

      {/* List */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Uploaded case studies</p>
        {!caseStudies ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-[var(--border)] opacity-40" />)}
          </div>
        ) : caseStudies.length === 0 ? (
          <div className="card py-10 text-center text-sm text-[var(--muted)]">No case studies uploaded yet.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {caseStudies.map((cs) => (
                  <tr key={cs.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{cs.clientName}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{cs.title ?? <span className="italic">—</span>}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {new Date(cs.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={cs.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                        >
                          View PDF
                        </a>
                        <button
                          onClick={() => handleDelete(cs)}
                          disabled={deletingId === cs.id}
                          className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          {deletingId === cs.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
