import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/** JSON response that is never cached by browsers or proxies. */
export function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export const unauthorized = () => json({ ok: false, error: "Unauthorized" }, 401);
export const forbidden = (error = "Forbidden") => json({ ok: false, error }, 403);
export const badRequest = (error = "Invalid request") => json({ ok: false, error }, 400);
export const serverError = () => json({ ok: false, error: "Server error" }, 500);

const MAX_BODY = 256 * 1024;

/** Reads a JSON body (max 256 KB) and validates it; returns the parsed value or an error response. */
export async function readBody<T>(req: Request, schema?: ZodType<T>): Promise<{ data: T } | { error: NextResponse }> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) return { error: json({ ok: false, error: "Payload too large" }, 413) };
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return { error: json({ ok: false, error: "Payload too large" }, 413) };
    raw = text ? JSON.parse(text) : {};
  } catch {
    return { error: badRequest("Invalid JSON") };
  }
  if (!schema) return { data: raw as T };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: badRequest(issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request") };
  }
  return { data: parsed.data };
}

/*
 * Best-effort rate limit (per server instance): enough to slow down scripted abuse of a leaked key
 * without affecting normal use. Keyed by client IP and route.
 */
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimit(req: Request, route: string, max = 60, windowMs = 60_000): NextResponse | null {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const key = `${route}|${ip}`;
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return null;
  }
  h.count++;
  if (h.count > max) {
    return json({ ok: false, error: "Too many requests" }, 429, { "Retry-After": String(Math.ceil((h.reset - now) / 1000)) });
  }
  return null;
}

/**
 * A change (POST, PATCH, DELETE…) sent by a browser from another site. Browsers always send Origin on
 * such requests; the mobile app sends none. The Clerk cookie is SameSite=Lax: this is a second check.
 */
export function isCrossSiteWrite(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
