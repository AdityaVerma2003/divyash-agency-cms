"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken, fetchCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";

import { DESIGNATIONS } from "@/lib/designations";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
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
      if (!u) { router.push("/login"); return; }
      if (u.role === "CLIENT") { router.push("/client/dashboard"); return; }
      // Super admins aren't gated on onboarding — they edit details on the profile page
      if (u.role === "SUPER_ADMIN") { router.replace("/admin/profile"); return; }
      // Already onboarded — later edits belong on the profile page
      if (u.onboardingStatus === "COMPLETE") { router.replace("/admin/profile"); return; }
      setUserId(u.id);
      // Prefill anything the admin already set at invite time
      if (u.designation) setDesignation(u.designation);
      if (u.mobile) setMobile(u.mobile);
      if (u.address) setAddress(u.address);
      if (u.bankDetails) setBankDetails(u.bankDetails);
      if (u.socialLinks) setSocialLinks(u.socialLinks);
      if (u.photoUrl) setPhotoUrl(u.photoUrl);
    }).catch(() => router.push("/login"));
  }, [router]);

  async function uploadPhoto(file: File) {
    if (!userId) return;
    setUploading(true);
    try {
      const token = getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`${apiBase}/users/${userId}/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json() as { photoUrl: string };
      setPhotoUrl(data.photoUrl);
      success("Photo uploaded", "");
    } catch (err) {
      toastError("Upload failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mobile.trim() || !address.trim() || !designation) {
      toastError("Required fields", "Mobile, address and designation are required to complete your profile.");
      return;
    }
    if (!photoUrl) {
      toastError("Photo required", "Please upload a profile photo — it appears on the public team page.");
      return;
    }
    if (!bankDetails.trim()) {
      toastError("Bank details required", "Bank details are needed to process your payouts.");
      return;
    }
    if (!userId) return;
    setSaving(true);
    try {
      await api.patch(`/users/${userId}`, {
        mobile: mobile.trim(),
        address: address.trim(),
        designation,
        bankDetails: bankDetails.trim(),
        ...(designation === "Influencer" && socialLinks.trim() && { socialLinks: socialLinks.trim() }),
      }, getAccessToken());
      success("Profile complete", "Welcome to the team!");
      router.replace("/admin/dashboard");
    } catch (err) {
      toastError("Could not save profile", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-lg">
        <div className="card space-y-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--ink)]">Complete your profile</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Fill in your details to activate your account and appear on the team page.
            </p>
          </div>

          {/* Photo upload */}
          <div className="flex items-center gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Profile photo" className="h-20 w-20 rounded-2xl object-cover border border-[var(--border)]" />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-[var(--surface-2)] border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-60 transition-colors"
              >
                {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
              </button>
              <p className="mt-1 text-[10px] text-[var(--muted)]">JPG, PNG — max 5 MB</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Designation <span className="text-danger">*</span>
              </label>
              <select value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} required>
                <option value="">Select your role…</option>
                {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Mobile number <span className="text-danger">*</span>
              </label>
              <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} placeholder="+91 98765 43210" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Address <span className="text-danger">*</span>
              </label>
              <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputCls} resize-none`} placeholder="Your home or work address" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Bank details <span className="text-xs font-normal normal-case">(optional — for salary processing)</span>
              </label>
              <textarea rows={3} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className={`${inputCls} resize-none`} placeholder="Account number, IFSC, bank name…" />
            </div>

            {designation === "Influencer" && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Social links <span className="text-xs font-normal normal-case">(optional)</span>
                </label>
                <input type="text" value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} className={inputCls} placeholder="Instagram, YouTube or Twitter profile URL" />
              </div>
            )}

            <button type="submit" disabled={saving} className="btn btn-primary w-full disabled:opacity-60">
              {saving ? "Saving…" : "Complete profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
