import type { ReportType } from "@/types";

export interface WorkspaceClientLite {
  id: string;
  companyName: string;
  logoUrl: string | null;
  serviceNames: string[];
  lastReportAt: string | null;
}

export interface ReportDueRow {
  clientId: string;
  clientName: string;
  clientServiceId: string;
  serviceName: string;
  reportType: ReportType;
  hasEntryThisMonth: boolean;
}

export interface RecentEntryRow {
  id: string;
  type: ReportType;
  clientId: string;
  clientName?: string;
  createdAt: string;
  entryDate: string;
  label: string;
}

export interface WorkspaceTaskSummary {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string | null;
  client: { id: string; companyName: string } | null;
}

export interface WorkspaceEventSummary {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  mode: "ONLINE" | "OFFLINE";
  location: string | null;
  meetingUrl: string | null;
}

export interface WorkspaceDashboard {
  reportTypes: ReportType[];
  kpis: {
    assignedClients: number;
    entriesThisMonth: number;
    reportsDue: number;
    openTasks: number;
  };
  clients: WorkspaceClientLite[];
  reportsDue: ReportDueRow[];
  entryVolume: { month: string; count: number }[];
  recentEntries: RecentEntryRow[];
  myTasks: WorkspaceTaskSummary[];
  upcomingEvents: WorkspaceEventSummary[];
}

export interface WorkspaceClientDetail {
  client: WorkspaceClientLite;
  services: {
    clientServiceId: string;
    serviceName: string;
    category: string;
    reportType: ReportType | null;
  }[];
  teammates: { id: string; name: string; designation: string | null }[];
}
