"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { AvatarStack } from "@/components/portal/Avatar";
import { PriorityBadge } from "@/components/portal/PriorityBadge";
import { EmptyState } from "@/components/portal/EmptyState";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TASK_STATUS_LABELS } from "@/types/tasks";
import type { Task } from "@/types/tasks";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminTasksListPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);

  function load() {
    api.get<Task[]>("/tasks", getAccessToken()).then(setTasks).catch(() => setTasks([]));
  }
  useEffect(() => { load(); }, []);

  if (!tasks) return <PageLoader fullScreen={false} />;

  return (
    <div className="card overflow-hidden p-0">
      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Assignees</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} onClick={() => setSelected(t)} className="cursor-pointer">
                  <td className="td-primary">{t.title}</td>
                  <td>{t.client?.companyName ?? "Internal"}</td>
                  <td>{TASK_STATUS_LABELS[t.status]}</td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td>{formatDate(t.dueDate)}</td>
                  <td><AvatarStack people={t.assignees.map((a) => ({ name: a.name, photoUrl: a.photoUrl }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <TaskModal
          task={selected}
          isAdmin
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
          onDeleted={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
