"use client";

import { useEffect, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PageLoader from "@/components/PageLoader";
import { Icon } from "@/components/icons";
import { TaskColumn } from "./TaskColumn";
import { TaskModal } from "./TaskModal";
import { TASK_STATUSES } from "@/types/tasks";
import type { Task, TaskStatus } from "@/types/tasks";

export function TaskBoard({ isAdmin }: { isAdmin: boolean }) {
  const token = getAccessToken();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [search, setSearch] = useState("");
  const [modalTask, setModalTask] = useState<Task | null | "new">(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function load() {
    api.get<Task[]>("/tasks", token).then(setTasks).catch(() => setTasks([]));
  }

  useEffect(() => { load(); }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !tasks) return;
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const destination = tasks.filter((t) => t.status === newStatus);
    const position = destination.length;

    // Optimistic update, rolled back on failure
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus, position } : t)));
    try {
      await api.patch(`/tasks/${taskId}/move`, { status: newStatus, position }, token);
    } catch {
      setTasks(prev);
    }
  }

  if (!tasks) return <PageLoader fullScreen={false} />;

  const filtered = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-coral-500"
          />
        </div>
        {isAdmin && (
          <button onClick={() => setModalTask("new")} className="btn btn-primary ml-auto">
            <Icon name="plus" size={16} /> Add Task
          </button>
        )}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {TASK_STATUSES.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={filtered.filter((t) => t.status === status)}
              onOpenTask={setModalTask}
            />
          ))}
        </div>
      </DndContext>

      {modalTask !== null && (
        <TaskModal
          task={modalTask === "new" ? null : modalTask}
          isAdmin={isAdmin}
          onClose={() => setModalTask(null)}
          onSaved={() => { setModalTask(null); load(); }}
          onDeleted={() => { setModalTask(null); load(); }}
        />
      )}
    </div>
  );
}
