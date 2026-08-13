import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { AppError } from "./errors.js";

export function route(handler: RequestHandler): RequestHandler {
  return async (request, response, next) => {
    const requestId = `req_${randomUUID()}`;
    response.locals.requestId = requestId;
    try {
      await handler(request, response, next);
      if (!response.headersSent) response.json({ success: true, data: null, message: "ok", requestId });
    } catch (error) {
      const known = error instanceof AppError;
      response.status(known ? error.status : 500).json({
        success: false,
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "服务器内部错误",
        ...(known && error.details ? { details: error.details } : {}),
        requestId,
      });
    }
  };
}

export function success(response: Parameters<RequestHandler>[1], data: unknown): void {
  const requestId = response.locals.requestId ?? `req_${randomUUID()}`;
  response.json({ success: true, data, message: "ok", requestId });
}
