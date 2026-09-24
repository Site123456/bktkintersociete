import "server-only";
import type { NextResponse } from "next/server";
import { requireVerifiedSession } from "@/lib/auth";
import { forbidden, isCrossSiteWrite, rateLimit, unauthorized } from "@/lib/http";
import type { UserDoc } from "@/lib/models";

/*
 * Access to /api/admin/*: a signed-in, validated admin (Clerk session cookie). The mobile app's API
 * key is never accepted here. 60 requests per minute and per route.
 */

type Guard = { ok: true; user: UserDoc } | { ok: false; response: NextResponse };

export async function adminGuard(req: Request, route: string): Promise<Guard> {
  const limited = rateLimit(req, `admin:${route}`, 60, 60_000);
  if (limited) return { ok: false, response: limited };
  if (isCrossSiteWrite(req)) return { ok: false, response: forbidden() };

  const gate = await requireVerifiedSession(["admin"]);
  if (!gate.ok) return { ok: false, response: gate.status === 401 ? unauthorized() : forbidden(gate.error) };
  return { ok: true, user: gate.user };
}

/** Error log without personal data. */
export function logError(where: string, err: unknown) {
  console.error(`${where}:`, err instanceof Error ? err.message : "unknown error");
}

export const isDuplicateKey = (err: unknown) =>
  Boolean(err && typeof err === "object" && (err as { code?: unknown }).code === 11000);
