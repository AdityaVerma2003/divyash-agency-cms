import { Router } from "express";
import { Role, SubscriptionStatus } from "@prisma/client";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, scopeToOwnClient } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

const LOGO_PATH = path.join(__dirname, "../../src/assets/logo.png");
const BRAND  = "#6366F1";
const MUTED  = "#6B7280";
const INK    = "#101828";
const LIGHT  = "#F4F5FF";
const LINE   = "#E5E7EB";
const GREEN  = "#059669";
const AMBER  = "#D97706";
const MARGIN = 45;
const PAGE_W = 595 - MARGIN * 2;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(v: any) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));
}
function fmtNum(v: number) {
  return new Intl.NumberFormat("en-IN").format(v);
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// GET /api/reports/:clientId/pdf?month=YYYY-MM  (defaults to previous month)
router.get(
  "/:clientId/pdf",
  scopeToOwnClient,
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    if (req.user!.role === Role.CLIENT && req.user!.clientId !== clientId) {
      throw ApiError.forbidden("You can only access your own reports");
    }

    // Parse target month
    const now = new Date();
    let year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    let month = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-based, default = last month

    if (req.query.month) {
      const [y, m] = (req.query.month as string).split("-").map(Number);
      if (y && m) { year = y; month = m; }
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd   = new Date(year, month, 0, 23, 59, 59);

    // ── Fetch all data in parallel ─────────────────────────────────
    const [client, services, invoices, posts, campaigns, leads] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.clientService.findMany({
        where: { clientId },
        include: { service: true },
      }),
      prisma.invoice.findMany({
        where: { clientId, issuedDate: { gte: periodStart, lte: periodEnd } },
        include: { payments: true, items: true },
      }),
      prisma.post.findMany({
        where: {
          clientService: { clientId },
          publishedAt: { gte: periodStart, lte: periodEnd },
        },
        include: { clientService: { include: { service: true } } },
      }),
      prisma.campaign.findMany({
        where: {
          clientService: { clientId },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: { clientService: { include: { service: true } } },
      }),
      prisma.lead.findMany({
        where: { clientId, month: { gte: periodStart, lte: periodEnd } },
      }),
    ]);

    if (!client) throw ApiError.notFound("Client not found");

    const activeServices = services.filter((s) => s.status === SubscriptionStatus.ACTIVE);

    // Derived invoice metrics
    const invoiceTotals = invoices.reduce((s, inv) => s + Number(inv.totalAmount), 0);
    const totalPaid     = invoices.reduce(
      (s, inv) => s + inv.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0
    );
    const outstanding   = Math.max(0, invoiceTotals - totalPaid);

    // Derived post metrics
    const totalPosts      = posts.length;
    const totalReach      = posts.reduce((s, p) => s + p.reach, 0);
    const totalLikes      = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments   = posts.reduce((s, p) => s + p.comments, 0);
    const totalShares     = posts.reduce((s, p) => s + p.shares, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;

    // Derived campaign metrics
    const totalSpend       = campaigns.reduce((s, c) => s + Number(c.spend), 0);
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks      = campaigns.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
    const avgROAS = 0; // roas field removed from Campaign model

    // Derived lead metrics
    const totalLeads   = leads.reduce((s, l) => s + l.count, 0);
    const leadsRevenue = leads.reduce((s, l) => s + Number(l.revenueAttributed), 0);

    // ── Estimate page height ───────────────────────────────────────
    const hasSMM       = totalPosts > 0;
    const hasCampaigns = campaigns.length > 0;
    const hasLeads     = leads.length > 0;
    const hasInvoices  = invoices.length > 0;

    const headerH      = 60;
    const titleH       = 50;
    const servicesH    = 30 + activeServices.length * 20 + 20;
    const billingH     = hasInvoices  ? 30 + invoices.length * 22 + 60  : 0;
    const smmH         = hasSMM       ? 30 + 60 + 20                    : 0;
    const campaignsH   = hasCampaigns ? 30 + 60 + 20                    : 0;
    const leadsH       = hasLeads     ? 30 + 40 + 20                    : 0;
    const noDataH      = (!hasSMM && !hasCampaigns && !hasLeads) ? 40   : 0;
    const footerH      = 50;
    const padding      = 60;

    const contentH = headerH + titleH + servicesH + billingH + smmH + campaignsH + leadsH + noDataH + footerH + padding;
    const pageH    = Math.max(841, contentH);

    // ── Build PDF ─────────────────────────────────────────────────
    const doc = new PDFDocument({
      autoFirstPage: false,
      info: { Title: `${client.companyName} – ${fmtMonth(periodStart)} Report` },
    });

    const filename = `${client.companyName.replace(/\s+/g, "_")}_Report_${year}-${String(month).padStart(2, "0")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.addPage({ size: [595, pageH], margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });

    /* ── Header ─────────────────────────────────────────────────── */
    try { doc.image(LOGO_PATH, MARGIN, MARGIN, { width: 34, height: 34 }); } catch { /* skip */ }

    doc.fontSize(14).fillColor(BRAND).font("Helvetica-Bold")
      .text("Divyash Digital", MARGIN + 42, MARGIN + 4);
    doc.fontSize(8).fillColor(MUTED).font("Helvetica")
      .text("info@divyashdigital.co.in  ·  +91 88103 76026", MARGIN + 42, MARGIN + 21);

    doc.fontSize(9).fillColor(MUTED).font("Helvetica")
      .text(`Generated ${fmtDate(new Date())}`, MARGIN, MARGIN + 8, { width: PAGE_W, align: "right" });

    const ruleY = MARGIN + 42;
    doc.moveTo(MARGIN, ruleY).lineTo(MARGIN + PAGE_W, ruleY).strokeColor(BRAND).lineWidth(1.5).stroke();

    /* ── Report title ───────────────────────────────────────────── */
    let y = ruleY + 16;
    doc.fontSize(18).fillColor(INK).font("Helvetica-Bold")
      .text("Monthly Performance Report", MARGIN, y);
    y += 24;
    doc.fontSize(11).fillColor(MUTED).font("Helvetica")
      .text(`${client.companyName}  ·  ${fmtMonth(periodStart)}`, MARGIN, y);
    y += 28;

    /* ── Section helper ─────────────────────────────────────────── */
    function sectionHeader(title: string) {
      doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_W, y).strokeColor(LINE).lineWidth(0.4).stroke();
      y += 6;
      doc.fontSize(7.5).fillColor(BRAND).font("Helvetica-Bold").text(title.toUpperCase(), MARGIN, y);
      y += 14;
    }

    function kpiGrid(items: { label: string; value: string; sub?: string; color?: string }[], cols = 4) {
      const colW = PAGE_W / cols;
      items.forEach((item, i) => {
        const cx = MARGIN + (i % cols) * colW;
        const row = Math.floor(i / cols);
        const cy = y + row * 52;
        doc.rect(cx + 2, cy, colW - 4, 46).fillColor(LIGHT).fill();
        doc.fontSize(14).fillColor(item.color ?? INK).font("Helvetica-Bold")
          .text(item.value, cx + 8, cy + 8, { width: colW - 16 });
        doc.fontSize(7.5).fillColor(MUTED).font("Helvetica")
          .text(item.label, cx + 8, cy + 28, { width: colW - 16 });
        if (item.sub) {
          doc.fontSize(7).fillColor(MUTED).text(item.sub, cx + 8, cy + 37, { width: colW - 16 });
        }
      });
      y += Math.ceil(items.length / cols) * 52 + 12;
    }

    /* ── Active services ────────────────────────────────────────── */
    sectionHeader("Active Services");
    for (const s of activeServices) {
      doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_W, y).strokeColor(LINE).lineWidth(0.3).stroke();
      doc.fontSize(9).fillColor(INK).font("Helvetica-Bold")
        .text(s.service.name, MARGIN + 6, y + 5, { width: PAGE_W * 0.5 });
      doc.fontSize(8).fillColor(MUTED).font("Helvetica")
        .text(s.service.category.replace(/_/g, " "), MARGIN + PAGE_W * 0.5, y + 5, { width: PAGE_W * 0.25 });
      doc.fontSize(8).fillColor(INK).font("Helvetica")
        .text(fmt(s.rate) + " / " + s.billingCycle.toLowerCase(), MARGIN, y + 5, { width: PAGE_W - 6, align: "right" });
      y += 20;
    }
    if (activeServices.length === 0) {
      doc.fontSize(9).fillColor(MUTED).font("Helvetica").text("No active services.", MARGIN, y);
      y += 16;
    }
    y += 10;

    /* ── Billing ────────────────────────────────────────────────── */
    if (hasInvoices) {
      sectionHeader("Billing Summary");
      kpiGrid([
        { label: "Total invoiced",  value: fmt(invoiceTotals) },
        { label: "Amount paid",     value: fmt(totalPaid),   color: GREEN },
        { label: "Outstanding",     value: fmt(outstanding), color: outstanding > 0 ? AMBER : GREEN },
        { label: "Invoices issued", value: String(invoices.length) },
      ]);

      // Invoice rows
      for (const inv of invoices) {
        const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
        doc.moveTo(MARGIN, y).lineTo(MARGIN + PAGE_W, y).strokeColor(LINE).lineWidth(0.3).stroke();
        doc.fontSize(8.5).fillColor(INK).font("Helvetica")
          .text(inv.invoiceNumber, MARGIN + 6, y + 5, { width: 130 })
          .text(fmtDate(inv.issuedDate), MARGIN + 140, y + 5, { width: 120 })
          .text(inv.status.replace(/_/g, " "), MARGIN + 270, y + 5, { width: 100 });
        doc.fontSize(8.5).fillColor(INK).font("Helvetica-Bold")
          .text(fmt(inv.totalAmount), MARGIN, y + 5, { width: PAGE_W - 6, align: "right" });
        y += 22;
      }
      y += 10;
    }

    /* ── Social Media ───────────────────────────────────────────── */
    if (hasSMM) {
      sectionHeader("Social Media Performance");
      kpiGrid([
        { label: "Posts published",  value: fmtNum(totalPosts) },
        { label: "Total reach",      value: fmtNum(totalReach) },
        { label: "Total engagement", value: fmtNum(totalEngagement) },
        { label: "Eng. rate",        value: totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(1) + "%" : "—" },
      ]);
      kpiGrid([
        { label: "Likes",    value: fmtNum(totalLikes) },
        { label: "Comments", value: fmtNum(totalComments) },
        { label: "Shares",   value: fmtNum(totalShares) },
      ], 3);
    }

    /* ── Ad Campaigns ───────────────────────────────────────────── */
    if (hasCampaigns) {
      sectionHeader("Ad Campaign Performance");
      kpiGrid([
        { label: "Total spend",   value: fmt(totalSpend) },
        { label: "Impressions",   value: fmtNum(totalImpressions) },
        { label: "Clicks",        value: fmtNum(totalClicks) },
        { label: "Conversions",   value: fmtNum(totalConversions) },
      ]);
      kpiGrid([
        { label: "Avg. ROAS",    value: avgROAS.toFixed(2) + "x", color: avgROAS >= 2 ? GREEN : AMBER },
        { label: "CTR",          value: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "—" },
        { label: "Cost / conv.", value: totalConversions > 0 ? fmt(totalSpend / totalConversions) : "—" },
      ], 3);
    }

    /* ── Leads ──────────────────────────────────────────────────── */
    if (hasLeads) {
      sectionHeader("Leads & Revenue");
      kpiGrid([
        { label: "Total leads",          value: fmtNum(totalLeads) },
        { label: "Revenue attributed",   value: fmt(leadsRevenue), color: GREEN },
      ], 2);
    }

    /* ── No performance data notice ─────────────────────────────── */
    if (!hasSMM && !hasCampaigns && !hasLeads) {
      sectionHeader("Performance Data");
      doc.fontSize(9).fillColor(MUTED).font("Helvetica")
        .text("No performance data recorded for this period.", MARGIN, y);
      y += 20;
    }

    /* ── Footer ─────────────────────────────────────────────────── */
    const footerY = pageH - 38;
    doc.moveTo(MARGIN, footerY).lineTo(MARGIN + PAGE_W, footerY).strokeColor(LINE).lineWidth(0.4).stroke();
    doc.fontSize(7.5).fillColor(MUTED).font("Helvetica")
      .text(
        `${client.companyName}  ·  ${fmtMonth(periodStart)} Report  ·  Divyash Digital  ·  divyashdigital.co.in`,
        MARGIN, footerY + 10,
        { width: PAGE_W, align: "center" }
      );

    doc.end();

    // Log report generation in DB (fire-and-forget)
    prisma.report.create({
      data: { clientId, month: periodStart, fileUrl: `report:${year}-${month}` },
    }).catch(() => undefined);
  })
);

export default router;
