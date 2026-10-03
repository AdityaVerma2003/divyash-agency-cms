"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Card, CardHeader } from "@/components/portal/Card";
import { useToast } from "@/components/Toast";

const INPUT_CLS =
  "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 border-[var(--border)]";

interface Settings {
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  maintenanceStartedAt: string | null;
  maintenanceEndsAt: string | null;
  updatedBy: { id: string; name: string } | null;
  updatedAt: string;
}

export default function MaintenancePage() {
  const { success, error: toastError } = useToast();
  const token = getAccessToken();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Settings>("/admin/settings", token).then((s) => {
      setSettings(s);
      setMessage(s.maintenanceMessage ?? "");
      setEndsAt(s.maintenanceEndsAt?.slice(0, 16) ?? "");
    });
  }
  useEffect(() => { load(); }, []);

  async function toggle(nextEnabled: boolean) {
    setSaving(true);
    try {
      await api.patch(
        "/admin/settings/maintenance",
        {
          maintenanceEnabled: nextEnabled,
          maintenanceMessage: message || undefined,
          maintenanceEndsAt: endsAt ? new Date(endsAt).toISOString() : null,
        },
        token
      );
      success(nextEnabled ? "Maintenance mode is now live" : "Maintenance mode turned off", "");
      setConfirming(false);
      load();
    } catch (err) {
      toastError("Could not update", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <PageLoader fullScreen={false} />;

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader
          title="Maintenance mode"
          subtitle="Takes the public site and client portal offline. The staff portal (/admin, /workspace) always stays reachable."
        />

        <div className="mb-5 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">
              Status: {settings.maintenanceEnabled ? "Live" : "Off"}
            </p>
            {settings.updatedBy && (
              <p className="text-xs text-[var(--muted)]">
                Last changed by {settings.updatedBy.name} · {new Date(settings.updatedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <span className={`badge ${settings.maintenanceEnabled ? "badge-danger" : "badge-success"}`}>
            {settings.maintenanceEnabled ? "LIVE" : "OFF"}
          </span>
        </div>

        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Visitor-facing message (optional)</span>
            <textarea className={`${INPUT_CLS} resize-none`} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="We'll be back shortly…" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Scheduled end (optional)</span>
            <input type="datetime-local" className={INPUT_CLS} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          {!confirming ? (
            <button onClick={() => setConfirming(true)} className={`btn ${settings.maintenanceEnabled ? "btn-ghost" : "btn-danger"}`}>
              {settings.maintenanceEnabled ? "Turn off maintenance mode" : "Take site down for maintenance"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-[var(--muted)]">
                {settings.maintenanceEnabled ? "Bring the public site back up?" : "This takes the public site and client portal offline. Continue?"}
              </p>
              <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={() => toggle(!settings.maintenanceEnabled)} disabled={saving} className="btn btn-danger btn-sm disabled:opacity-60">
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
