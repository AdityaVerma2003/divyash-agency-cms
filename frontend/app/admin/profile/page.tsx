"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, fetchCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { DESIGNATIONS } from "@/lib/designations";
import type { AuthUser } from "@/types";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

export default function AdminProfilePage() {
  const { success, error: toastError } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [designation, setDesignation] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (!u) return;
      setUser(u);
      setName(u.name ?? "");
      setMobile(u.mobile ?? "");
      setAddress(u.address ?? "");
      setDesignation(u.designation ?? "");
      setBankDetails(u.bankDetails ?? "");
      setSocialLinks(u.socialLinks ?? "");
      setPhotoUrl(u.photoUrl ?? null);
    });
  }, []);

  async function uploadPhoto(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const token = getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`${apiBase}/users/${user.id}/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = (await res.json()) as { photoUrl: string };
      setPhotoUrl(data.photoUrl);
      success("Photo updated", "");
    } catch (err) {
      toastError("Upload failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !mobile.trim() || !address.trim() || !designation) {
      toastError("Required fields", "Name, mobile, address and designation cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await api.patch(
        `/users/${user.id}`,
        {
          name: name.trim(),
          mobile: mobile.trim(),
          address: address.trim(),
          designation,
          bankDetails: bankDetails.trim(),
          ...(designation === "Influencer" && { socialLinks: socialLinks.trim() }),
        },
        getAccessToken()
      );
      success("Profile saved", "Your details have been updated.");
    } catch (err) {
      toastError("Could not save", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <p className="text-sm text-[var(--muted)]">Loading your profile…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">My Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Update your details. Your photo and designation appear on the public team page.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card space-y-6">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-coral-500">
                {name.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn btn-ghost text-sm disabled:opacity-50"
            >
              {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
            </button>
            <p className="mt-1 text-xs text-[var(--muted)]">JPG or PNG, square works best.</p>
          </div>
        </div>

        {/* Read-only account info */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[var(--muted)]">Email</p>
            <p className="text-sm font-medium text-[var(--ink)]">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Portal access</p>
            <p className="text-sm font-medium capitalize text-[var(--ink)]">
              {user.role.toLowerCase().replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Full name <span className="text-danger">*</span></span>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Designation <span className="text-danger">*</span></span>
          <select required value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls}>
            <option value="" disabled>Select a designation…</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Mobile <span className="text-danger">*</span></span>
          <input type="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Address <span className="text-danger">*</span></span>
          <textarea rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputCls} resize-none`} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Bank details</span>
          <textarea rows={3} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className={`${inputCls} resize-none`} placeholder="Account number, IFSC, bank name…" />
          <span className="mt-1 block text-xs text-[var(--muted)]">Visible only to you and Super Admins.</span>
        </label>

        {designation === "Influencer" && (
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Social links</span>
            <textarea rows={2} value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} className={`${inputCls} resize-none`} placeholder='{"instagram":"https://…","youtube":"https://…"}' />
          </label>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
