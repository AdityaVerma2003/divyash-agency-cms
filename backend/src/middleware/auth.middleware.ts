import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import { ApiError } from "../utils/apiError";
import { prisma } from "../lib/prisma";
import { isAssignedToClient } from "../lib/clientLite";
import { reportTypeToEnum, type ReportType } from "../lib/reportTypes";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        clientId: string | null;
      };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;

  if (!token) {
    return next(ApiError.unauthorized("Missing access token"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch {
    return next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You don't have access to this resource"));
    }
    return next();
  };
}

/** For CLIENT users, forces any :clientId param / clientId query to match their own client. */
export function scopeToOwnClient(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role === Role.CLIENT) {
    const requestedClientId = req.params.clientId ?? (req.query.clientId as string | undefined);
    if (requestedClientId && requestedClientId !== req.user.clientId) {
      return next(ApiError.forbidden("You can only access your own data"));
    }
  }
  return next();
}

/**
 * Restricts a team member to clients they're actually assigned to, resolving
 * the target client from :clientId, ?clientId, body.clientId, or (when the
 * route is keyed by a service) ?clientServiceId / body.clientServiceId.
 * SUPER_ADMIN bypasses. CLIENT users are rejected outright — these are
 * staff routes.
 */
export function scopeToAssignedClient(req: Request, _res: Response, next: NextFunction) {
  (async () => {
    if (!req.user) throw ApiError.unauthorized();
    if (req.user.role === Role.SUPER_ADMIN) return;
    if (req.user.role === Role.CLIENT) {
      throw ApiError.forbidden("You don't have access to this resource");
    }

    let clientId =
      req.params.clientId ??
      (req.query.clientId as string | undefined) ??
      (req.body?.clientId as string | undefined);

    if (!clientId) {
      const clientServiceId =
        req.params.clientServiceId ??
        (req.query.clientServiceId as string | undefined) ??
        (req.body?.clientServiceId as string | undefined);
      if (clientServiceId) {
        const cs = await prisma.clientService.findUnique({
          where: { id: clientServiceId },
          select: { clientId: true },
        });
        if (!cs) throw ApiError.notFound("Client service not found");
        clientId = cs.clientId;
      }
    }

    if (!clientId) {
      throw ApiError.badRequest("A client must be specified for this request");
    }
    if (!(await isAssignedToClient(req.user.userId, clientId))) {
      throw ApiError.forbidden("You are not assigned to this client");
    }
  })()
    .then(() => next())
    .catch(next);
}

/**
 * Asserts the caller may file the given report type. SUPER_ADMIN bypasses.
 * Pass a resolver when the type comes from the request body.
 */
export function requireReportType(
  resolve:
    | ReportType
    | ((req: Request) => ReportType | null | undefined | Promise<ReportType | null | undefined>)
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (async () => {
      if (!req.user) throw ApiError.unauthorized();
      if (req.user.role === Role.SUPER_ADMIN) return;

      const key = typeof resolve === "function" ? await resolve(req) : resolve;
      if (!key) throw ApiError.badRequest("A report type must be specified");

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { reportTypes: true },
      });
      const allowed = user?.reportTypes ?? [];
      if (!allowed.includes(reportTypeToEnum(key))) {
        throw ApiError.forbidden(`You are not assigned to file ${key} reports`);
      }
    })()
      .then(() => next())
      .catch(next);
  };
}
