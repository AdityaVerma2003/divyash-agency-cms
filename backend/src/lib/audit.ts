import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

interface AuditParams {
  userId?: string | null;
  action: string;   // e.g. "CREATE", "UPDATE", "DELETE", "PAYMENT_RECORDED"
  entity: string;   // e.g. "Client", "Invoice", "Payment"
  entityId?: string;
  meta?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      meta: (params.meta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}
