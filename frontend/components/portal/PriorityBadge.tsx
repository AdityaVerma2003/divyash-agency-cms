import { cn } from "@/lib/utils";

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

const PRIORITY: Record<TaskPriority, { label: string; cls: string }> = {
  HIGH:   { label: "High",   cls: "badge-danger" },
  MEDIUM: { label: "Medium", cls: "badge-warning" },
  LOW:    { label: "Low",    cls: "badge-success" },
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const config = PRIORITY[priority];
  return <span className={cn("badge", config.cls, className)}>{config.label}</span>;
}
