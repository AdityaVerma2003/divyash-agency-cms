import cron from "node-cron";
import { Role, SubscriptionStatus } from "@prisma/client";
import { generateMonthlyInvoices, sendInvoiceReminders } from "./billing";
import { prisma } from "./prisma";
import { notify, notifyAdmins } from "./notify";

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
      client: { include: { accountManager: { select: { id: true } } } },
    },
  });

  for (const cs of expiring) {
    const endStr = cs.endDate!.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const msg = `${cs.client.companyName}'s ${cs.service.name} contract ends on ${endStr}.`;
    const link = `/admin/clients/${cs.clientId}`;

    if (cs.client.accountManagerId) {
      await notify(cs.client.accountManagerId, "CONTRACT_EXPIRING", msg, link).catch(() => undefined);
    } else {
      await notifyAdmins("CONTRACT_EXPIRING", msg, link).catch(() => undefined);
    }
  }

  if (expiring.length > 0) {
    console.log(`[cron] Sent ${expiring.length} contract-expiry notification(s)`);
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

  console.log("[cron] Jobs scheduled: invoices (1st of month, 9am) · reminders (daily, 8am) · contracts (daily, 8:05am)");
}
