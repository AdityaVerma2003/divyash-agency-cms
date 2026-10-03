"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, fetchCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import BankDetailsFields from "@/components/BankDetailsFields";
import { EMPTY_BANK_DETAILS, parseBankDetails, serializeBankDetails, type BankDetails } from "@/lib/bankDetails";
import type { AuthUser } from "@/types";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

/** Self-service profile editor shared by the admin shell and the team workspace. */
export default function ProfileEditor() {
  const { success, error: toastError } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [designation, setDesignation] = useState("");
  const [bankDetails, setBankDetails] = useState<BankDetails>(EMPTY_BANK_DETAILS);
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
      setBankDetails(parseBankDetails(u.bankDetails) ?? EMPTY_BANK_DETAILS);
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
    if (!name.trim() || !mobile.trim() || !address.trim()) {
      toastError("Required fields", "Name, mobile and address cannot be empty.");
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
          bankDetails: serializeBankDetails(bankDetails),
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
          <div>
            <p className="text-xs text-[var(--muted)]">Designation</p>
            <p className="text-sm font-medium text-[var(--ink)]">
              {designation || <span className="italic text-[var(--muted)]">Not set</span>}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">Set by your Super Admin — contact them to change this.</p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Full name <span className="text-danger">*</span></span>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Mobile <span className="text-danger">*</span></span>
          <input type="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Address <span className="text-danger">*</span></span>
          <textarea rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputCls} resize-none`} />
        </label>

        <div className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Bank details</span>
          <BankDetailsFields value={bankDetails} onChange={setBankDetails} />
          <span className="mt-1 block text-xs text-[var(--muted)]">Visible only to you and Super Admins.</span>
        </div>

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
