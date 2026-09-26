import { Router } from "express";
import { ClientStatus, InvoiceStatus, Role, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// GET /api/dashboard/admin — agency-wide overview
router.get(
  "/admin",
  authorize(Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [
      totalClients,
      activeSubscriptions,
      outstandingInvoices,
      overdueInvoices,
      paidThisMonth,
      suspendedClients,
      contractsEndingSoon,
      monthlyRecurringRevenue,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.clientService.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.invoice.aggregate({
        where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({ where: { status: InvoiceStatus.OVERDUE } }),
      prisma.payment.aggregate({
        where: { paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { amount: true },
      }),
      prisma.client.count({ where: { status: ClientStatus.SUSPENDED } }),
      prisma.clientService.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: now, lte: in14Days },
        },
        select: {
          id: true,
          endDate: true,
          service: { select: { name: true } },
          client: { select: { id: true, companyName: true } },
        },
      }),
      prisma.clientService.aggregate({
        where: { status: SubscriptionStatus.ACTIVE, billingCycle: "MONTHLY" },
        _sum: { rate: true },
      }),
    ]);

    const outstandingAmount = Number(outstandingInvoices._sum.totalAmount ?? 0);
    const revenueThisMonth  = Number(paidThisMonth._sum.amount ?? 0);

    res.json({
      totalClients,
      activeSubscriptions,
      monthlyRecurringRevenue: Number(monthlyRecurringRevenue._sum.rate ?? 0),
      revenueThisMonth,
      outstandingAmount,
      overdueInvoiceCount: overdueInvoices,
      suspendedClients,
      contractsEndingSoon: contractsEndingSoon.map((cs) => ({
        id: cs.id,
        endDate: cs.endDate,
        serviceName: cs.service.name,
        clientId: cs.client.id,
        clientName: cs.client.companyName,
      })),
    });
  })
);

// GET /api/dashboard/client/:clientId — a single client's overview
router.get(
  "/client/:clientId",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    if (req.user!.role === Role.CLIENT && req.user!.clientId !== clientId) {
      return res.status(403).json({ message: "You can only access your own dashboard" });
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [activeServices, upcomingInvoice, totalSpend, recentPosts, allPostsTrend, leadsRaw] =
      await Promise.all([
        prisma.clientService.findMany({
          where: { clientId, status: SubscriptionStatus.ACTIVE },
          include: { service: true },
        }),
        prisma.invoice.findFirst({
          where: { clientId, status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT] } },
          orderBy: { dueDate: "asc" },
        }),
        prisma.payment.findMany({
          where: { invoice: { clientId }, status: "SUCCESS" },
          select: { amount: true },
        }),
        prisma.post.findMany({
          where: { clientService: { clientId } },
          orderBy: { publishedAt: "desc" },
          take: 5,
        }),
        // All posts for the past 6 months (for reach trend)
        prisma.post.findMany({
          where: {
            clientService: { clientId },
            publishedAt: { gte: sixMonthsAgo },
          },
          select: { publishedAt: true, reach: true, likes: true, comments: true, shares: true, clientServiceId: true },
        }),
        // All leads for the past 6 months
        prisma.lead.findMany({
          where: { clientId, month: { gte: sixMonthsAgo } },
          select: { month: true, count: true, revenueAttributed: true },
          orderBy: { month: "asc" },
        }),
      ]);

    // Per-service performance (last 3 months) — batch queries to avoid N+1
    const smmIds = activeServices.filter((cs) => cs.service.category === "SMM").map((cs) => cs.id);
    const adsIds = activeServices.filter((cs) => cs.service.category === "GOOGLE_ADS" || cs.service.category === "META_ADS").map((cs) => cs.id);

    const [smmPosts, adsCampaigns] = await Promise.all([
      smmIds.length > 0
        ? prisma.post.findMany({
            where: { clientServiceId: { in: smmIds }, publishedAt: { gte: threeMonthsAgo } },
            select: { clientServiceId: true, reach: true, likes: true, comments: true, shares: true },
          })
        : Promise.resolve([]),
      adsIds.length > 0
        ? prisma.campaign.findMany({
            where: { clientServiceId: { in: adsIds }, createdAt: { gte: threeMonthsAgo } },
            select: { clientServiceId: true, spend: true, conversions: true },
          })
        : Promise.resolve([]),
    ]);

    const perService = activeServices.map((cs) => {
      const category = cs.service.category;
      if (category === "SMM") {
        const posts = smmPosts.filter((p) => p.clientServiceId === cs.id);
        return {
          clientServiceId: cs.id,
          serviceName: cs.service.name,
          category,
          totalPosts: posts.length,
          totalReach: posts.reduce((s, p) => s + p.reach, 0),
          totalEngagement: posts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0),
        };
      }
      if (category === "GOOGLE_ADS" || category === "META_ADS") {
        const campaigns = adsCampaigns.filter((c) => c.clientServiceId === cs.id);
        const totalSpendSvc    = campaigns.reduce((s, c) => s + Number(c.spend), 0);
        const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
        return {
          clientServiceId: cs.id,
          serviceName: cs.service.name,
          category,
          totalSpend: totalSpendSvc,
          totalConversions,
          avgROAS: 0,
        };
      }
      return { clientServiceId: cs.id, serviceName: cs.service.name, category };
    });

    // Reach trend: aggregate posts by calendar month (last 6 months)
    const reachByMonth: Record<string, number> = {};
    for (const post of allPostsTrend) {
      const key = `${post.publishedAt.getFullYear()}-${String(post.publishedAt.getMonth() + 1).padStart(2, "0")}`;
      reachByMonth[key] = (reachByMonth[key] ?? 0) + post.reach;
    }
    // Fill all 6 month slots even if zero
    const reachTrend: { month: string; totalReach: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      reachTrend.push({ month: key, totalReach: reachByMonth[key] ?? 0 });
    }

    // Leads trend: group by calendar month (last 6 months)
    const leadsByMonth: Record<string, { count: number; revenueAttributed: number }> = {};
    for (const lead of leadsRaw) {
      const key = `${lead.month.getFullYear()}-${String(lead.month.getMonth() + 1).padStart(2, "0")}`;
      if (!leadsByMonth[key]) leadsByMonth[key] = { count: 0, revenueAttributed: 0 };
      leadsByMonth[key].count += lead.count;
      leadsByMonth[key].revenueAttributed += Number(lead.revenueAttributed);
    }
    const leadsTrend: { month: string; count: number; revenueAttributed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      leadsTrend.push({ month: key, ...(leadsByMonth[key] ?? { count: 0, revenueAttributed: 0 }) });
    }

    const totalSpendAmount = totalSpend.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalReach = recentPosts.reduce((sum, post) => sum + post.reach, 0);

    res.json({
      activeServices,
      upcomingInvoice,
      totalSpendAmount,
      recentPosts,
      totalReach,
      perService,
      reachTrend,
      leadsTrend,
    });
  })
);

export default router;
