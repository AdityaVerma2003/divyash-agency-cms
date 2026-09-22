export type Role = "SUPER_ADMIN" | "ACCOUNT_MANAGER" | "CLIENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  suspensionReason?: string | null;
  suspensionNotes?: string | null;
  suspendedAt?: string | null;
  onboardedAt: string;
  accountManagerId?: string | null;
  accountManager?: { id: string; name: string } | null;
  _count?: { clientServices: number };
  clientServices?: (ClientService & { service: Service })[];
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface ClientService {
  id: string;
  clientId: string;
  serviceId: string;
  service: Service;
  billingCycle: "MONTHLY" | "ONE_TIME";
  rate: number;
  startDate: string;
  endDate?: string | null;
  contractDurationMonths?: number | null;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  pauseReason?: string | null;
  pauseNotes?: string | null;
  statusChangedAt?: string | null;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  clientServiceId?: string | null;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  dueDate: string;
  issuedDate: string;
  paidAt?: string | null;
  client?: { id: string; companyName: string };
  items?: InvoiceItem[];
  payments?: { id: string; amount: number; method: string; paidAt: string | null }[];
}

export interface AdminDashboardSummary {
  totalClients: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  revenueThisMonth: number;
  outstandingAmount: number;
  overdueInvoiceCount: number;
  suspendedClients: number;
  contractsEndingSoon: {
    id: string;
    endDate: string;
    serviceName: string;
    clientId: string;
    clientName: string;
  }[];
}

export interface Post {
  id: string;
  clientServiceId: string;
  platform: string;
  postUrl?: string | null;
  publishedAt: string;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  clientServiceId: string;
  month: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  createdAt: string;
}

export interface Lead {
  id: string;
  clientId: string;
  serviceId?: string | null;
  month: string;
  count: number;
  revenueAttributed: number;
  createdAt: string;
}

export type PerServiceMetric =
  | {
      clientServiceId: string;
      serviceName: string;
      category: "SMM";
      totalPosts: number;
      totalReach: number;
      totalEngagement: number;
    }
  | {
      clientServiceId: string;
      serviceName: string;
      category: "GOOGLE_ADS" | "META_ADS";
      totalSpend: number;
      totalConversions: number;
      avgROAS: number;
    }
  | {
      clientServiceId: string;
      serviceName: string;
      category: string;
    };

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AdminNotification extends Notification {
  user: { id: string; name: string; email: string; role: string };
}

export interface AdminNotificationPage {
  notifications: AdminNotification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogPage {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ClientDashboardSummary {
  activeServices: ClientService[];
  upcomingInvoice: Invoice | null;
  totalSpendAmount: number;
  recentPosts: {
    id: string;
    platform: string;
    reach: number;
    likes: number;
    publishedAt: string;
  }[];
  totalReach: number;
  perService: PerServiceMetric[];
  reachTrend: { month: string; totalReach: number }[];
  leadsTrend: { month: string; count: number; revenueAttributed: number }[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl?: string | null;
  category?: string | null;
  authorId: string;
  author?: { id: string; name: string };
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostListResponse {
  posts: Omit<BlogPost, "contentMarkdown">[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  service: string;
  message?: string | null;
  isRead: boolean;
  createdAt: string;
}
