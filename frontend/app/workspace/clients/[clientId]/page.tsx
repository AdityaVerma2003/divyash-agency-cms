"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Card, CardHeader } from "@/components/portal/Card";
import { EmptyState } from "@/components/portal/EmptyState";
import { REPORT_TYPE_LABELS } from "@/lib/reportTypes";
import { ENTRY_DATE_FIELD, formatEntrySummary, entryAuthorName } from "@/lib/reportEntrySummary";
import type { ReportType } from "@/types";
import type { WorkspaceClientDetail } from "@/types/workspace";
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

export default function ClientWorkspacePage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const token = getAccessToken();

  const [detail, setDetail] = useState<WorkspaceClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [entries, setEntries] = useState<Record<string, unknown>[] | null>(null);

  useEffect(() => {
    api
      .get<WorkspaceClientDetail>(`/workspace/clients/${clientId}`, token)
      .then((d) => {
        setDetail(d);
        if (d.services.length > 0) setSelectedServiceId(d.services[0].clientServiceId);
      })
      .catch((err: Error) => setError(err.message));
  }, [clientId]);

  const selectedService = detail?.services.find((s) => s.clientServiceId === selectedServiceId) ?? null;

  const loadEntries = useCallback(() => {
    if (!selectedServiceId) { setEntries(null); return; }
    setEntries(null);
    api
      .get<{ entries: Record<string, unknown>[] }>(`/admin/service-reports?clientServiceId=${selectedServiceId}`, token)
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]));
  }, [selectedServiceId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function handleDelete(entryId: string) {
    if (!selectedService?.reportType) return;
    if (!confirm("Delete this entry?")) return;
    await api.del(`/admin/service-reports/${entryId}?type=${selectedService.reportType}`, token);
    loadEntries();
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        {error}
      </div>
    );
  }
  if (!detail) return <PageLoader fullScreen={false} />;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">{detail.client.companyName}</h2>
        {detail.teammates.length > 0 && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Also on this account: {detail.teammates.map((t) => t.name).join(", ")}
          </p>
        )}
      </Card>

      {detail.services.length === 0 ? (
        <EmptyState
          title="No reporting duties here yet"
          description="None of this client's active services match a report type assigned to you."
        />
      ) : (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Service</span>
            <select className={INPUT_CLS} value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
              {detail.services.map((s) => (
                <option key={s.clientServiceId} value={s.clientServiceId}>{s.serviceName}</option>
              ))}
            </select>
          </label>

          {selectedService?.reportType && (
            <>
              <Card>
                <CardHeader title={`Add ${REPORT_TYPE_LABELS[selectedService.reportType]} entry`} />
                <EntryForm type={selectedService.reportType} clientServiceId={selectedServiceId} onAdded={loadEntries} />
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="card-header p-5 pb-0">
                  <h3 className="card-title">Logged entries</h3>
                </div>
                {entries === null ? (
                  <PageLoader inline />
                ) : entries.length === 0 ? (
                  <EmptyState title="No entries logged yet" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="portal-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Details</th>
                          <th>Entered by</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id as string}>
                            <td className="whitespace-nowrap">{formatDate(entry[ENTRY_DATE_FIELD[selectedService.reportType!]] as string)}</td>
                            <td className="td-primary">
                              {formatEntrySummary(selectedService.reportType!, entry)}
                            </td>
                            <td className="whitespace-nowrap">{entryAuthorName(entry)}</td>
                            <td className="text-right">
                              <button onClick={() => handleDelete(entry.id as string)} className="text-xs font-medium text-danger hover:underline">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
