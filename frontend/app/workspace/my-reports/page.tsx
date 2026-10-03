"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Card } from "@/components/portal/Card";
import { EmptyState } from "@/components/portal/EmptyState";
import { REPORT_TYPE_LABELS } from "@/lib/reportTypes";
import type { RecentEntryRow } from "@/types/workspace";

const INPUT_CLS =
  "rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 border-[var(--border)]";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MyReportsPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [rows, setRows] = useState<RecentEntryRow[] | null>(null);

  useEffect(() => {
    setRows(null);
    api
      .get<RecentEntryRow[]>(`/workspace/my-reports?month=${month}`, getAccessToken())
      .then(setRows)
      .catch(() => setRows([]));
  }, [month]);

  return (
    <div className="space-y-6">
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Month</span>
        <input type="month" className={INPUT_CLS} value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>

      <Card className="p-0 overflow-hidden">
        {rows === null ? (
          <PageLoader inline />
        ) : rows.length === 0 ? (
          <EmptyState title="No entries for this month" description="Switch months above, or log a new entry from My Clients." />
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.entryDate)}</td>
                    <td className="td-primary">{r.clientName}</td>
                    <td>{REPORT_TYPE_LABELS[r.type]}</td>
                    <td>{r.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
