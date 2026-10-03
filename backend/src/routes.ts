import { Router } from "express";
import authRoutes from "./modules/auth.module";
import clientsRoutes, { portalTeamActivityRouter, publicClientsRouter } from "./modules/clients.module";
import servicesRoutes from "./modules/services.module";
import clientServicesRoutes from "./modules/clientServices.module";
import invoicesRoutes from "./modules/invoices.module";
import dashboardRoutes from "./modules/dashboard.module";
import postsRoutes from "./modules/posts.module";
import campaignsRoutes from "./modules/campaigns.module";
import leadsRoutes from "./modules/leads.module";
import usersRoutes from "./modules/users.module";
import auditLogsRoutes from "./modules/auditLogs.module";
import notificationsRoutes from "./modules/notifications.module";
import contactRoutes from "./modules/contact.module";
import billingRoutes from "./modules/billing.module";
import reportsRoutes from "./modules/reports.module";
import razorpayRoutes from "./modules/razorpay.module";
import { publicBlogRouter, adminBlogRouter } from "./modules/blogPosts.module";
import { adminServiceReportsRouter, portalServiceReportsRouter } from "./modules/serviceReports.module";
import { publicCaseStudiesRouter, adminCaseStudiesRouter } from "./modules/caseStudies.module";
import tasksRoutes, { portalTasksRouter } from "./modules/tasks.module";
import calendarEventsRoutes from "./modules/calendarEvents.module";
import workspaceRoutes from "./modules/workspace.module";
import { publicSiteSettingsRouter, adminSiteSettingsRouter } from "./modules/siteSettings.module";
import { Router as ExpressRouter } from "express";
import { asyncHandler } from "./utils/asyncHandler";
import { prisma } from "./lib/prisma";
import { OnboardingStatus, Role } from "@prisma/client";

const router = Router();

router.use("/auth", authRoutes);
router.use("/clients", clientsRoutes);
router.use("/admin/service-reports", adminServiceReportsRouter);
router.use("/portal/service-reports", portalServiceReportsRouter);
router.use("/services", servicesRoutes);
router.use("/client-services", clientServicesRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/posts", postsRoutes);
router.use("/campaigns", campaignsRoutes);
router.use("/leads", leadsRoutes);
router.use("/users", usersRoutes);
router.use("/audit-logs", auditLogsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/contact", contactRoutes);
router.use("/billing", billingRoutes);
router.use("/reports", reportsRoutes);
router.use("/razorpay", razorpayRoutes);
router.use("/blog-posts", publicBlogRouter);
router.use("/admin/blog-posts", adminBlogRouter);
router.use("/admin/case-studies", adminCaseStudiesRouter);
router.use("/public/case-studies", publicCaseStudiesRouter);
router.use("/public/clients", publicClientsRouter);
router.use("/portal/team-activity", portalTeamActivityRouter);
router.use("/tasks", tasksRoutes);
router.use("/portal/tasks", portalTasksRouter);
router.use("/calendar-events", calendarEventsRoutes);
router.use("/workspace", workspaceRoutes);
router.use("/public/site-settings", publicSiteSettingsRouter);
// GET /admin/settings, PATCH /admin/settings/maintenance, /admin/settings/report-lock
router.use("/admin/settings", adminSiteSettingsRouter);

// Public team endpoint — alias so /api/public/team works alongside /api/users/public/team
const publicTeamRouter = ExpressRouter();
publicTeamRouter.get(
  "/team",
  asyncHandler(async (_req, res) => {
    const members = await prisma.user.findMany({
      where: { role: { not: Role.CLIENT }, onboardingStatus: OnboardingStatus.COMPLETE },
      select: { id: true, name: true, designation: true, photoUrl: true, socialLinks: true, role: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    res.json(members);
  })
);
router.use("/public", publicTeamRouter);

export default router;
