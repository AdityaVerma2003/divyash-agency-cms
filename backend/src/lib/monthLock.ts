import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "../utils/apiError";

/** First instant of the month containing `date`, in UTC. */
export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

async function lockDayOfMonth(): Promise<number> {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "singleton" } });
  return settings?.reportLockDayOfMonth ?? 5;
}

/**
 * Report entries stay editable until a cutoff, after which the month is
 * frozen so numbers a client has already seen stop moving. A SUPER_ADMIN
 * always bypasses this.
 *
 * Locked when either:
 *  - an explicit ReportMonthLock row covers that month (for the client, or globally), or
 *  - the entry's month is before the current month and the cutoff day has passed.
 */
export async function assertMonthEditable(
  entryDate: Date,
  clientId: string,
  user: { role: Role }
): Promise<void> {
  if (user.role === Role.SUPER_ADMIN) return;

  const entryMonth = monthStart(entryDate);

  const explicit = await prisma.reportMonthLock.findFirst({
    where: { month: entryMonth, OR: [{ clientId }, { clientId: null }] },
  });
  if (explicit) {
    throw ApiError.forbidden(
      "This reporting month is locked. Ask a super admin to make changes."
    );
  }

  const now = new Date();
  const currentMonth = monthStart(now);
  if (entryMonth.getTime() >= currentMonth.getTime()) return; // current/future month

  const previousMonth = monthStart(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  );
  const cutoffDay = await lockDayOfMonth();

  // The immediately-previous month stays open until the cutoff day passes.
  if (entryMonth.getTime() === previousMonth.getTime() && now.getUTCDate() <= cutoffDay) {
    return;
  }

  throw ApiError.forbidden(
    `Reporting for that month closed after day ${cutoffDay}. Ask a super admin to make changes.`
  );
}
