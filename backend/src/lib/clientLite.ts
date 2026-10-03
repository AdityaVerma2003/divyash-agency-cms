import { Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * The only client shape team-facing endpoints may return. Contact details,
 * billing, rates, contract values, GSTIN, addresses and internal notes are
 * deliberately excluded — a team member never needs them, so they never
 * enter the payload.
 */
export interface ClientLite {
  id: string;
  companyName: string;
  logoUrl: string | null;
  serviceNames: string[];
  lastReportAt: string | null;
}

const LITE_SELECT = {
  id: true,
  companyName: true,
  clientServices: {
    where: { status: SubscriptionStatus.ACTIVE },
    select: { service: { select: { name: true } } },
  },
} satisfies Prisma.ClientSelect;

type LiteRow = Prisma.ClientGetPayload<{ select: typeof LITE_SELECT }>;

function shape(row: LiteRow, lastReportAt: Date | null): ClientLite {
  return {
    id: row.id,
    companyName: row.companyName,
    // Clients have no logo column today; the public site maps logos by name.
    logoUrl: null,
    serviceNames: row.clientServices.map((cs) => cs.service.name),
    lastReportAt: lastReportAt ? lastReportAt.toISOString() : null,
  };
}

/** Most recent report-entry timestamp per client, across all six entry types. */
async function lastReportByClient(clientIds: string[]): Promise<Map<string, Date>> {
  if (clientIds.length === 0) return new Map();
  const where = { clientId: { in: clientIds } };

  // Written out per model: each delegate wants its own ScalarFieldEnum type,
  // so a shared args object doesn't typecheck across all six.
  const groups = await Promise.all([
    prisma.smmReportEntry.groupBy({ by: ["clientId"], where, _max: { createdAt: true } }),
    prisma.seoReportEntry.groupBy({ by: ["clientId"], where, _max: { createdAt: true } }),
    prisma.paidAdsReportEntry.groupBy({ by: ["clientId"], where, _max: { createdAt: true } }),
    prisma.graphicDesignReportEntry.groupBy({ by: ["clientId"], where, _max: { createdAt: true } }),
    prisma.contentCreationReportEntry.groupBy({ by: ["clientId"], where, _max: { createdAt: true } }),
    prisma.websiteDevelopmentReportEntry.groupBy({ by: ["clientId"], where, _max: { createdAt: true } }),
  ]);

  const latest = new Map<string, Date>();
  for (const group of groups) {
    for (const row of group) {
      const at = row._max?.createdAt;
      if (!at) continue;
      const current = latest.get(row.clientId);
      if (!current || at > current) latest.set(row.clientId, at);
    }
  }
  return latest;
}

/** Clients this user is assigned to, as safe DTOs. */
export async function assignedClientsLite(userId: string): Promise<ClientLite[]> {
  const assignments = await prisma.clientAssignment.findMany({
    where: { userId },
    select: { client: { select: LITE_SELECT } },
  });

  const rows = assignments.map((a) => a.client);
  const latest = await lastReportByClient(rows.map((r) => r.id));
  return rows
    .map((row) => shape(row, latest.get(row.id) ?? null))
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
}

export async function clientLiteById(clientId: string): Promise<ClientLite | null> {
  const row = await prisma.client.findUnique({ where: { id: clientId }, select: LITE_SELECT });
  if (!row) return null;
  const latest = await lastReportByClient([clientId]);
  return shape(row, latest.get(clientId) ?? null);
}

/** Team member ↔ client assignment check, used by scoping middleware. */
export async function isAssignedToClient(userId: string, clientId: string): Promise<boolean> {
  const found = await prisma.clientAssignment.findFirst({
    where: { userId, clientId },
    select: { id: true },
  });
  return found !== null;
}
