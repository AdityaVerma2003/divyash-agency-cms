"use client";

import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/tasks";
import { TASK_STATUS_LABELS } from "@/types/tasks";

const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: "#71717A",
  IN_PROGRESS: "#3B82F6",
  REVIEW: "#A855F7",
  COMPLETE: "#22C55E",
};

export function TaskColumn({
  status,
  tasks,
  onOpenTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_DOT[status] }} />
        <p className="text-sm font-semibold text-[var(--ink)]">{TASK_STATUS_LABELS[status]}</p>
        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2.5 rounded-xl p-2 transition-colors",
          isOver ? "bg-[var(--surface-3)]" : "bg-[var(--surface-2)]/50"
        )}
        style={{ minHeight: 120 }}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task)} />
        ))}
      </div>
    </div>
  );
}
