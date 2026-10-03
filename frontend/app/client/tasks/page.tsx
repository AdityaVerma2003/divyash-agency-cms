"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Card, CardHeader } from "@/components/portal/Card";
import { EmptyState } from "@/components/portal/EmptyState";
import { AvatarStack } from "@/components/portal/Avatar";
import { PriorityBadge } from "@/components/portal/PriorityBadge";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/types/tasks";
import type { Task } from "@/types/tasks";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ClientTasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    api.get<Task[]>("/portal/tasks", getAccessToken()).then(setTasks).catch(() => setTasks([]));
  }, []);

  if (!tasks) return <PageLoader fullScreen={false} />;

  if (tasks.length === 0) {
    return <EmptyState title="Nothing to show yet" description="Tasks your account manager shares with you will appear here." />;
  }

  return (
    <div className="space-y-6">
      {TASK_STATUSES.map((status) => {
        const rows = tasks.filter((t) => t.status === status);
        if (rows.length === 0) return null;
        return (
          <Card key={status}>
            <CardHeader title={TASK_STATUS_LABELS[status]} />
            <div className="space-y-3">
              {rows.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{t.title}</p>
                    {formatDate(t.dueDate) && <p className="text-xs text-[var(--muted)]">Due {formatDate(t.dueDate)}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <AvatarStack people={t.assignees.map((a) => ({ name: a.name, photoUrl: a.photoUrl }))} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
