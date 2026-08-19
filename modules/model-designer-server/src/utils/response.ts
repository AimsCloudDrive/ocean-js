import { randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { AppError } from "./errors.js";

function firstText(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
}

function requestBody(request: Request): Record<string, unknown> {
  return request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
}

function requestText(request: Request, key: string): string {
  const headers = request.headers ?? {};
  const query = request.query ?? {};
  return firstText(headers[key.toLowerCase()]) || firstText(query[key]) || firstText(requestBody(request)[key]);
}

function sanitizedBody(request: Request): Record<string, unknown> | undefined {
  const body = requestBody(request);
  if (Object.keys(body).length === 0) return undefined;
  return { ...body, ...(typeof body.password === "string" ? { password: "******" } : {}) };
}

function logRequest(request: Request, requestId: string): void {
  console.log("[request:start]", {
    requestId,
    method: request.method,
    path: request.originalUrl,
    connectionKey: requestText(request, "connectionKey") || undefined,
    db: requestText(request, "db") || undefined,
    body: sanitizedBody(request),
  });
}

function logResponse(
  request: Request,
  requestId: string,
  statusCode: number,
  startedAt: number,
  error?: unknown
): void {
  const known = error instanceof AppError;
  console[error ? "error" : "log"](error ? "[request:error]" : "[request:success]", {
    requestId,
    method: request.method,
    path: request.originalUrl,
    statusCode,
    durationMs: Date.now() - startedAt,
    ...(error
      ? { code: known ? error.code : "INTERNAL_ERROR", message: error instanceof Error ? error.message : String(error) }
      : {}),
  });
}

export function route(handler: RequestHandler): RequestHandler {
  return async (request, response, next) => {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    response.locals.requestId = requestId;
    logRequest(request, requestId);
    try {
      await handler(request, response, next);
      if (!response.headersSent) response.json({ success: true, data: null, message: "ok", requestId });
      logResponse(request, requestId, response.statusCode, startedAt);
    } catch (error) {
      const known = error instanceof AppError;
      response.status(known ? error.status : 500).json({
        success: false,
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "服务器内部错误",
        ...(known && error.details ? { details: error.details } : {}),
        requestId,
      });
      logResponse(request, requestId, response.statusCode, startedAt, error);
    }
  };
}

export function success(response: Parameters<RequestHandler>[1], data: unknown): void {
  const requestId = response.locals.requestId ?? `req_${randomUUID()}`;
  response.json({ success: true, data, message: "ok", requestId });
}
