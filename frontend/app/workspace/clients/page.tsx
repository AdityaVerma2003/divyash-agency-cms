"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { EmptyState } from "@/components/portal/EmptyState";
import { Icon } from "@/components/icons";
import type { WorkspaceClientLite } from "@/types/workspace";

function formatDate(iso: string | null) {
  if (!iso) return "No reports yet";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyClientsPage() {
  const [clients, setClients] = useState<WorkspaceClientLite[] | null>(null);

  useEffect(() => {
    api.get<WorkspaceClientLite[]>("/workspace/clients", getAccessToken()).then(setClients).catch(() => setClients([]));
  }, []);

  if (!clients) return <PageLoader fullScreen={false} />;

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="clients" size={32} />}
        title="No clients assigned yet"
        description="Once a super admin assigns you to a client, they'll appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/workspace/clients/${client.id}`}
          className="card block transition-colors hover:bg-[var(--surface-2)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-workspace)]/15 text-sm font-bold uppercase text-[var(--accent-workspace)]">
              {client.companyName.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[var(--ink)]">{client.companyName}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {client.serviceNames.length > 0 ? client.serviceNames.join(", ") : "No active services"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">Last report: {formatDate(client.lastReportAt)}</p>
        </Link>
      ))}
    </div>
  );
}
