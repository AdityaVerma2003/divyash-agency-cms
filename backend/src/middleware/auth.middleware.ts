import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import { ApiError } from "../utils/apiError";

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
