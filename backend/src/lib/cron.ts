import cron from "node-cron";
import { Role, SubscriptionStatus } from "@prisma/client";
import { generateMonthlyInvoices, sendInvoiceReminders } from "./billing";
import { prisma } from "./prisma";
import { notify, notifyAdmins } from "./notify";
import { reportTypeForCategory, reportTypeFromEnum, hasEntryForMonth } from "./reportTypes";
import { monthStart } from "./monthLock";

async function checkContractsEndingSoon() {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const expiring = await prisma.clientService.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      endDate: { gte: now, lte: in14Days },
    },
    include: {
      service: true,
      client: { include: { assignments: { select: { userId: true } } } },
    },
  });

  for (const cs of expiring) {
    const endStr = cs.endDate!.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const msg = `${cs.client.companyName}'s ${cs.service.name} contract ends on ${endStr}.`;
    const link = `/admin/clients/${cs.clientId}`;

    if (cs.client.assignments.length > 0) {
      for (const a of cs.client.assignments) {
        await notify(a.userId, "CONTRACT_EXPIRING", msg, link).catch(() => undefined);
      }
    } else {
      await notifyAdmins("CONTRACT_EXPIRING", msg, link).catch(() => undefined);
    }
  }

  if (expiring.length > 0) {
    console.log(`[cron] Sent ${expiring.length} contract-expiry notification(s)`);
  }
}

/** Reminds team members, once a week, which assigned clients still need a report entry this month. */
async function checkMissingReports() {
  const now = new Date();
  const thisMonth = monthStart(now);
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const members = await prisma.user.findMany({
    where: { role: Role.ACCOUNT_MANAGER, reportTypes: { isEmpty: false } },
    select: {
      id: true,
      reportTypes: true,
      clientAssignments: {
        select: {
          client: {
            select: {
              id: true,
              companyName: true,
              clientServices: {
                where: { status: SubscriptionStatus.ACTIVE },
                select: { id: true, service: { select: { category: true } } },
              },
            },
          },
        },
      },
    },
  });

  let remindersSent = 0;
  for (const member of members) {
    const myTypes = new Set(member.reportTypes.map(reportTypeFromEnum));
    const missing: string[] = [];

    for (const assignment of member.clientAssignments) {
      for (const cs of assignment.client.clientServices) {
        const type = reportTypeForCategory(cs.service.category);
        if (!type || !myTypes.has(type)) continue;

        const hasEntry = await hasEntryForMonth(type, cs.id, thisMonth, nextMonth);
        if (!hasEntry) missing.push(assignment.client.companyName);
      }
    }

    if (missing.length > 0) {
      const unique = [...new Set(missing)];
      await notify(
        member.id,
        "REPORT_REMINDER",
        `Reports still due this month for: ${unique.slice(0, 5).join(", ")}${unique.length > 5 ? ` +${unique.length - 5} more` : ""}`,
        "/workspace/dashboard"
      ).catch(() => undefined);
      remindersSent++;
    }
  }

  if (remindersSent > 0) {
    console.log(`[cron] Sent ${remindersSent} missing-report reminder(s)`);
  }
}

export function startCron() {
  // 9:00 AM on the 1st of every month — generate recurring invoices
  cron.schedule("0 9 1 * *", async () => {
    console.log("[cron] Running monthly invoice generation…");
    try {
      const result = await generateMonthlyInvoices();
      console.log(
        `[cron] Invoices done — generated: ${result.generated}, skipped: ${result.skipped}, errors: ${result.errors}`
      );
    } catch (err) {
      console.error("[cron] Monthly invoice generation failed:", err);
    }
  });

  // 8:00 AM daily — send payment reminders + mark overdue
  cron.schedule("0 8 * * *", async () => {
    console.log("[cron] Running invoice reminders…");
    try {
      const result = await sendInvoiceReminders();
      console.log(
        `[cron] Reminders done — marked overdue: ${result.overdueMark}, emails sent: ${result.emailsSent}, errors: ${result.errors}`
      );
    } catch (err) {
      console.error("[cron] Invoice reminders failed:", err);
    }
  });

  // 8:05 AM daily — check for contracts expiring within 14 days
  cron.schedule("5 8 * * *", async () => {
    console.log("[cron] Checking contracts ending soon…");
    try {
      await checkContractsEndingSoon();
    } catch (err) {
      console.error("[cron] Contract check failed:", err);
    }
  });

  // 9:00 AM every Monday — remind team members of missing report entries.
  // Weekly (not daily) is the natural dedup — no notification-idempotency
  // table needed since it simply won't re-fire until next Monday.
  cron.schedule("0 9 * * 1", async () => {
    console.log("[cron] Checking for missing report entries…");
    try {
      await checkMissingReports();
    } catch (err) {
      console.error("[cron] Missing-report check failed:", err);
    }
  });

  console.log(
    "[cron] Jobs scheduled: invoices (1st of month, 9am) · reminders (daily, 8am) · contracts (daily, 8:05am) · missing reports (Mondays, 9am)"
  );
}
