"use client";

import { TaskBoard } from "@/components/tasks/TaskBoard";

export default function WorkspaceTasksPage() {
  return <TaskBoard isAdmin={false} />;
}
