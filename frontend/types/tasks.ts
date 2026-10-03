export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETE";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export interface TaskPerson {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  clientId: string | null;
  client: { id: string; companyName: string } | null;
  createdById: string;
  createdBy: TaskPerson;
  assignees: TaskPerson[];
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  user: TaskPerson;
}

export interface TaskAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
  uploadedBy: { id: string; name: string };
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETE"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  COMPLETE: "Complete",
};
