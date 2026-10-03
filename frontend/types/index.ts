export type Role = "SUPER_ADMIN" | "ACCOUNT_MANAGER" | "CLIENT";

export type OnboardingStatus = "INVITED" | "PENDING" | "COMPLETE";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
  onboardingStatus: OnboardingStatus;
  photoUrl?: string | null;
  mobile?: string | null;
  address?: string | null;
  designation?: string | null;
  socialLinks?: string | null;
  bankDetails?: string | null;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  agreementDetails?: string | null;
  intro?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  suspensionReason?: string | null;
  suspensionNotes?: string | null;
  suspendedAt?: string | null;
  onboardedAt: string;
  showOnPublicSite: boolean;
  /** Team members assigned to this client — many-to-many, no single "owner" */
  assignments?: { id: string; user: { id: string; name: string; designation?: string | null } }[];
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
  period: "this_month" | "last_month" | "this_quarter" | "this_year";
  range: number;
  kpis: {
    revenue: KpiValue;
    contractsSigned: KpiValue;
    clientsAdded: KpiValue;
    invoicesSent: KpiValue;
  };
  leadTrend: { month: string; leads: number; converted: number }[];
  upcoming: {
    events: {
      id: string; title: string; startAt: string; endAt: string; mode: "ONLINE" | "OFFLINE"; allDay: boolean;
      client: { id: string; companyName: string } | null;
      attendees: { id: string; name: string; photoUrl?: string | null }[];
    }[];
    tasks: {
      id: string; title: string; dueDate: string | null; priority: "HIGH" | "MEDIUM" | "LOW"; status: string;
      client: { id: string; companyName: string } | null;
      assignees: { id: string; name: string; photoUrl?: string | null }[];
    }[];
  };
  recentActivity: {
    id: string;
    kind: "audit" | "comment";
    actor: { id: string; name: string; photoUrl?: string | null } | null;
    action: string;
    subject: string;
    body: string | null;
    createdAt: string;
  }[];
}

export interface KpiValue {
  value: number;
  prevValue: number;
  deltaPct: number | null;
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
  campaignName: string;
  adGroup?: string | null;
  adSet?: string | null;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
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
      organicCount: number;
      paidCount: number;
      totalFollowersGain: number;
      totalProfileReach: number;
      totalLeads: number;
      reachByMonth: Record<string, number>;
    }
  | {
      clientServiceId: string;
      serviceName: string;
      category: "GOOGLE_ADS" | "META_ADS" | "PERFORMANCE_MARKETING";
      totalCampaignsCreated: number;
      totalAdSpend: number;
      totalReach: number;
      totalConversion: number;
      totalLeads: number;
      totalProfileVisits: number;
      roasPct: number;
      targetedCountries: string[];
      leadsByMonth: Record<string, number>;
      spendByMonth: Record<string, number>;
    }
  | {
      clientServiceId: string;
      serviceName: string;
      category: "SEO";
      totalLinksSubmission: number;
      countryTraffic: Record<string, number>;
      trafficGain: number;
      durationDays: number;
      totalArticleCreated: number;
      totalImageSubmission: number;
      totalProfileCreated: number;
      serpRanking: string | null;
      keywordRanking: string | null;
      trafficByMonth: Record<string, number>;
    }
  | {
      clientServiceId: string;
      serviceName: string;
      category: "GRAPHIC_DESIGN" | "CONTENT";
      totalItems: number;
      latestSubmissionDate: string | null;
      items: { type: string | null; executionDate: string; submissionDate: string | null }[];
      itemsByMonth: Record<string, number>;
    }
  | {
      clientServiceId: string;
      serviceName: string;
      category: "WEB_DESIGN";
      websiteLink: string | null;
      domainPlatform: string | null;
      hosting: string | null;
      seoEnhanced: boolean;
      platformLanguage: string | null;
      maintenanceAgreed: boolean;
      executionDate: string | null;
      submissionDate: string | null;
    }
  | {
      clientServiceId: string;
      serviceName: string;
      category: string;
    };

// ── Per-service reporting (new system) ──────────────────────────────────

export type ReportType =
  | "smm"
  | "seo"
  | "paidAds"
  | "graphicDesigning"
  | "contentCreation"
  | "websiteDevelopment";

export interface SmmReportEntry {
  id: string;
  clientServiceId: string;
  postType: "STATIC" | "CAROUSEL" | "REEL";
  platform: "META" | "YOUTUBE" | "WHATSAPP" | "LINKEDIN" | "X" | "OTHER";
  platformOther?: string | null;
  postUrl?: string | null;
  postedAt: string;
  marketingType: "ORGANIC" | "PAID";
  followersGain?: number | null;
  profileReach?: number | null;
  postLikes?: number | null;
  profileVisits?: number | null;
  isPaidAd: boolean;
  paidAdSpend?: number | null;
  paidFollowersGain?: number | null;
  paidLikes?: number | null;
  paidImpressions?: number | null;
  paidLeadsGenerated?: number | null;
  createdAt: string;
}

export interface SeoReportEntry {
  id: string;
  clientServiceId: string;
  entryDate: string;
  backlinksCreated: number;
  directorySubmissions: number;
  articleSubmissions: number;
  imageSubmissions: number;
  profileCreations: number;
  approvedLinks: number;
  keywordRanking?: string | null;
  serpRanking?: string | null;
  trafficGain: number;
  countryTraffic?: { country: string; visits: number }[] | null;
  createdAt: string;
}

export interface PaidAdsReportEntry {
  id: string;
  clientServiceId: string;
  campaignName: string;
  adGroup?: string | null;
  adSet?: string | null;
  objective: "LEAD_GEN" | "AWARENESS" | "SALES" | "TRAFFIC" | "PROMOTION";
  setupDate: string;
  dailyBudget: number;
  month: string;
  spend: number;
  reach?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  leads?: number | null;
  leadsConverted?: number | null;
  profileVisits?: number | null;
  addToCart?: number | null;
  revenueGeneratedPct?: number | null;
  cpl?: number | null;
  cpc?: number | null;
  cpv?: number | null;
  targetedCountries?: string[] | null;
  createdAt: string;
}

export interface GraphicDesignReportEntry {
  id: string;
  clientServiceId: string;
  designType: "VIDEO_EDITING" | "BRANDING" | "SOCIAL_MEDIA_POST" | "AUDIO_BOOSTING" | "LONG_VIDEO_EDITING" | "THREE_D_ANIMATION" | "LOGO_DESIGN" | "OTHER";
  designTypeOther?: string | null;
  itemCount: number;
  executionDate: string;
  submissionDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ContentCreationReportEntry {
  id: string;
  clientServiceId: string;
  contentType: "CONTENT_SHOOT" | "COPYWRITING" | "SCRIPT_WRITING" | "OTHER";
  contentTypeOther?: string | null;
  executionDate: string;
  submissionDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface WebsiteDevelopmentReportEntry {
  id: string;
  clientServiceId: string;
  websiteType: "INFOGRAPHIC" | "BRAND" | "ECOMMERCE" | "CUSTOM_CODED" | "LANDING_PAGE_ONLY" | "OTHER";
  websiteTypeOther?: string | null;
  pageCount?: number | null;
  platformLanguage?: string | null;
  adminCredentialNote?: string | null;
  seoEnhanced: boolean;
  domainPlatform?: string | null;
  hosting?: "DD_SHARED" | "CLIENT_OWN" | null;
  websiteLink?: string | null;
  maintenanceAgreed: boolean;
  executionDate?: string | null;
  submissionDate?: string | null;
  createdAt: string;
}

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
  primaryKeyword?: string | null;
  keywords?: string | null;
  canonicalUrl?: string | null;
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
