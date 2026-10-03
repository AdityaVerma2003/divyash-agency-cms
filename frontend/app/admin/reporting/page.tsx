"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { reportTypeForCategory, REPORT_TYPE_LABELS } from "@/lib/reportTypes";
import type { Client, ClientService, ReportType } from "@/types";
import SmmForm from "@/components/reporting/SmmForm";
import SeoForm from "@/components/reporting/SeoForm";
import PaidAdsForm from "@/components/reporting/PaidAdsForm";
import GraphicDesignForm from "@/components/reporting/GraphicDesignForm";
import ContentCreationForm from "@/components/reporting/ContentCreationForm";
import WebsiteDevelopmentForm from "@/components/reporting/WebsiteDevelopmentForm";

const INPUT_CLS =
  "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 border-[var(--border)]";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const ENTRY_DATE_FIELD: Record<ReportType, string> = {
  smm: "postedAt",
  seo: "entryDate",
  paidAds: "month",
  graphicDesigning: "executionDate",
  contentCreation: "executionDate",
  websiteDevelopment: "createdAt",
};

const ENTRY_SUMMARY_FIELDS: Record<ReportType, string[]> = {
  smm: ["postType", "platform", "marketingType"],
  seo: ["backlinksCreated", "articleSubmissions", "trafficGain"],
  paidAds: ["campaignName", "objective", "spend"],
  graphicDesigning: ["designType", "itemCount"],
  contentCreation: ["contentType"],
  websiteDevelopment: ["websiteType", "hosting", "websiteLink"],
};

function EntryForm({ type, clientServiceId, onAdded }: { type: ReportType; clientServiceId: string; onAdded: () => void }) {
  switch (type) {
    case "smm": return <SmmForm clientServiceId={clientServiceId} onAdded={onAdded} />;
    case "seo": return <SeoForm clientServiceId={clientServiceId} onAdded={onAdded} />;
    case "paidAds": return <PaidAdsForm clientServiceId={clientServiceId} onAdded={onAdded} />;
    case "graphicDesigning": return <GraphicDesignForm clientServiceId={clientServiceId} onAdded={onAdded} />;
    case "contentCreation": return <ContentCreationForm clientServiceId={clientServiceId} onAdded={onAdded} />;
    case "websiteDevelopment": return <WebsiteDevelopmentForm clientServiceId={clientServiceId} onAdded={onAdded} />;
  }
}

function ReportingContent() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [services, setServices] = useState<ClientService[] | null>(null);
  const [clientServiceId, setClientServiceId] = useState("");
  const [entries, setEntries] = useState<Record<string, unknown>[] | null>(null);
  const token = getAccessToken();

  useEffect(() => {
    api.get<Client[]>("/clients", token).then(setClients).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!clientId) { setServices(null); setClientServiceId(""); return; }
    setServices(null);
    setClientServiceId("");
    api
      .get<ClientService[]>(`/client-services?clientId=${clientId}`, token)
      .then((subs) => setServices(subs.filter((s) => s.status === "ACTIVE")))
      .catch(() => setServices([]));
  }, [clientId]);

  const selectedService = services?.find((s) => s.id === clientServiceId) ?? null;
  const reportType = selectedService ? reportTypeForCategory(selectedService.service.category) : null;

  const loadEntries = useCallback(() => {
    if (!clientServiceId || !reportType) { setEntries(null); return; }
    setEntries(null);
    api
      .get<{ reportType: ReportType; entries: Record<string, unknown>[] }>(
        `/admin/service-reports?clientServiceId=${clientServiceId}`,
        token
      )
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]));
  }, [clientServiceId, reportType]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function handleDelete(entryId: string) {
    if (!reportType) return;
    if (!confirm("Delete this entry?")) return;
    await api.del(`/admin/service-reports/${entryId}?type=${reportType}`, token);
    loadEntries();
  }

  if (!clients) return <PageLoader fullScreen={false} />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--ink)]">Reporting</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Log performance updates for a client's service — clients see a live summary on their dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Client</span>
          <select className={INPUT_CLS} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Service</span>
          <select
            className={INPUT_CLS}
            value={clientServiceId}
            onChange={(e) => setClientServiceId(e.target.value)}
            disabled={!clientId || !services}
          >
            <option value="">{!clientId ? "Pick a client first" : "Select a service…"}</option>
            {services?.map((s) => (
              <option key={s.id} value={s.id}>{s.service.name} ({s.service.category})</option>
            ))}
          </select>
        </label>
      </div>

      {clientId && services?.length === 0 && (
        <p className="text-sm text-[var(--muted)]">This client has no active services yet.</p>
      )}

      {selectedService && !reportType && (
        <div className="rounded-xl border border-dashed border-[var(--border)] px-5 py-4 text-sm text-[var(--muted)]">
          No reporting template exists yet for the "{selectedService.service.category}" service category.
          This will be added once the field spec for it is finalized.
        </div>
      )}

      {selectedService && reportType && (
        <div className="space-y-6">
          <div className="card">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Add {REPORT_TYPE_LABELS[reportType]} entry
            </p>
            <EntryForm type={reportType} clientServiceId={clientServiceId} onAdded={loadEntries} />
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Logged entries
            </p>
            {entries === null ? (
              <PageLoader inline />
            ) : entries.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No entries logged yet.</p>
            ) : (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Details</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id as string} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-4 py-3">
                            {formatDate(entry[ENTRY_DATE_FIELD[reportType]] as string)}
                          </td>
                          <td className="px-4 py-3 text-[var(--muted)]">
                            {ENTRY_SUMMARY_FIELDS[reportType]
                              .map((f) => entry[f])
                              .filter((v) => v !== null && v !== undefined && v !== "")
                              .join(" · ")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(entry.id as string)}
                              className="text-xs font-medium text-danger hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportingPage() {
  return (
    <Suspense fallback={<PageLoader fullScreen={false} />}>
      <ReportingContent />
    </Suspense>
  );
}
