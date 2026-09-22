import { Role } from "@prisma/client";
import { prisma } from "./prisma";

export async function notify(
  userId: string,
  type: string,
  message: string,
  link?: string
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, message, link: link ?? null },
  });
}

/** Notifies all SUPER_ADMIN (and optionally ACCOUNT_MANAGER) users. */
export async function notifyAdmins(
  type: string,
  message: string,
  link?: string
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: { in: [Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER] } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type, message, link: link ?? null })),
  });
}
