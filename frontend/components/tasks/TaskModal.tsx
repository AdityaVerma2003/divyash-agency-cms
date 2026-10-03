"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Avatar } from "@/components/portal/Avatar";
import { Icon } from "@/components/icons";
import type { Task, TaskDetail, TaskPriority, TaskStatus } from "@/types/tasks";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/types/tasks";

const INPUT_CLS =
  "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 border-[var(--border)]";

interface TeamOption { id: string; name: string }
interface ClientOption { id: string; companyName: string }

export function TaskModal({
  task,
  isAdmin,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const token = getAccessToken();
  const isNew = task === null;

  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "MEDIUM");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignees.map((a) => a.id) ?? []);
  const [clientId, setClientId] = useState(task?.clientId ?? "");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [team, setTeam] = useState<TeamOption[] | null>(null);
  const [clients, setClients] = useState<ClientOption[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      api.get<TaskDetail>(`/tasks/${task.id}`, token).then(setDetail).catch(() => undefined);
    }
    if (isAdmin) {
      api.get<TeamOption[]>("/users", token).then(setTeam).catch(() => setTeam([]));
      api
        .get<{ clients?: ClientOption[] } | ClientOption[]>("/clients", token)
        .then((res) => setClients(Array.isArray(res) ? res : res.clients ?? []))
        .catch(() => setClients([]));
    }
  }, [task, isAdmin]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title,
        description: description || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
      };
      if (isAdmin) {
        payload.assigneeIds = assigneeIds;
        payload.clientId = clientId || undefined;
      }
      if (isNew) {
        await api.post("/tasks", payload, token);
      } else {
        await api.patch(`/tasks/${task!.id}`, payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task || !confirm("Delete this task?")) return;
    await api.del(`/tasks/${task.id}`, token);
    onDeleted?.();
  }

  async function handleComment() {
    if (!task || !comment.trim()) return;
    const created = await api.post<{ id: string; body: string; createdAt: string; user: TeamOption }>(
      `/tasks/${task.id}/comments`,
      { body: comment.trim() },
      token
    );
    setDetail((d) => (d ? { ...d, comments: [...d.comments, created as any] } : d));
    setComment("");
  }

  async function handleAttach(file: File) {
    if (!task) return;
    const form = new FormData();
    form.append("file", file);
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    const res = await fetch(`${apiBase}/tasks/${task.id}/attachments`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.ok) {
      const attachment = await res.json();
      setDetail((d) => (d ? { ...d, attachments: [attachment, ...d.attachments] } : d));
    }
  }

  return (
    <Modal title={isNew ? "New task" : "Task details"} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Title</span>
          <input className={INPUT_CLS} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Description</span>
          <textarea className={`${INPUT_CLS} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Status</span>
            <select className={INPUT_CLS} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Priority</span>
            <select className={INPUT_CLS} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Due date</span>
          <input type="date" className={INPUT_CLS} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>

        {isAdmin && (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Assignees</span>
              <select
                multiple
                className={`${INPUT_CLS} h-28`}
                value={assigneeIds}
                onChange={(e) => setAssigneeIds(Array.from(e.target.selectedOptions, (o) => o.value))}
              >
                {(team ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Client (optional)</span>
              <select className={INPUT_CLS} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Internal — no client</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[var(--muted)]">
                Only link a client if they should be able to see this task.
              </span>
            </label>
          </>
        )}

        {!isAdmin && task?.client && (
          <p className="text-xs text-[var(--muted)]">
            Linked to client: <span className="font-medium text-[var(--ink)]">{task.client.companyName}</span>
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <div className="ml-auto flex items-center gap-2">
            {!isNew && isAdmin && (
              <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm">
                Delete
              </button>
            )}
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
              {saving ? "Saving…" : isNew ? "Create task" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {!isNew && (
        <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Attachments</p>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAttach(f);
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm">
              <Icon name="paperclip" size={14} /> Attach file
            </button>
            <div className="mt-2 space-y-1.5">
              {detail?.attachments.map((a) => (
                <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-coral-600 hover:underline">
                  <Icon name="paperclip" size={13} /> {a.fileName}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Comments</p>
            <div className="max-h-48 space-y-3 overflow-y-auto">
              {detail?.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar person={{ name: c.user.name, photoUrl: c.user.photoUrl }} size="xs" />
                  <div className="min-w-0 flex-1 rounded-lg bg-[var(--surface-2)] px-3 py-1.5">
                    <p className="text-xs font-medium text-[var(--ink)]">{c.user.name}</p>
                    <p className="text-xs text-[var(--ink-2)]">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className={INPUT_CLS}
                placeholder="Write a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleComment())}
              />
              <button type="button" onClick={handleComment} className="btn btn-ghost btn-sm flex-shrink-0">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
