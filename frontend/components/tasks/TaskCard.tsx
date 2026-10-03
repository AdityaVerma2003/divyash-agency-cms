"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AvatarStack } from "@/components/portal/Avatar";
import { PriorityBadge } from "@/components/portal/PriorityBadge";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/tasks";

function formatDue(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50, opacity: isDragging ? 0.6 : 1 }
    : undefined;

  const due = formatDue(task.dueDate);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-portal-xs transition-shadow hover:shadow-portal-sm"
    >
      {task.client && (
        <p className="mb-1.5 truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--portal-accent)]">
          {task.client.companyName}
        </p>
      )}
      <p className="text-sm font-medium leading-snug text-[var(--ink)]">{task.title}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.status === "COMPLETE" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="checkCircle" size={13} />
            </span>
          ) : (
            <PriorityBadge priority={task.priority} />
          )}
          {due && (
            <span className={cn("text-xs", isOverdue ? "font-medium text-danger" : "text-[var(--muted)]")}>
              {due}
            </span>
          )}
        </div>
        <AvatarStack people={task.assignees.map((a) => ({ name: a.name, photoUrl: a.photoUrl }))} max={3} />
      </div>

      {(task.attachmentCount > 0 || task.commentCount > 0) && (
        <div className="mt-2.5 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--muted)]">
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="paperclip" size={13} /> {task.attachmentCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="comment" size={13} /> {task.commentCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
