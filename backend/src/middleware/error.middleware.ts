import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/apiError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return res.status(400).json({ message });
  }

  // util.inspect can crash on certain error objects with non-standard property descriptors
  try {
    console.error("[unhandled error]", err instanceof Error ? err.stack ?? err.message : String(err));
  } catch {
    console.error("[unhandled error — could not serialize]");
  }
  return res.status(500).json({ message: "Internal server error" });
}
