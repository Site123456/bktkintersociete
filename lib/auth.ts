import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectDB from "@/lib/connectDB";
import { env } from "@/lib/env";
import { User, type Role, type UserDoc } from "@/lib/models";

/**
 * Who is calling an API route:
 * - "session": someone signed in with Clerk (the website sends the session cookie; a native app can
 *   send `Authorization: Bearer <Clerk token>`). The identity is verified by Clerk.
 * - "app": the mobile app with the shared `x-api-key`. The key proves it is the app, not who the
 *   person is, so routes re-check any person or site named in the request against the database.
 */
export type Caller = { kind: "session"; clerkId: string } | { kind: "app" };

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time comparison against every configured key (API_SECRET, comma-separated). */
export function isValidApiKey(key: string | null): boolean {
  if (!key || env.apiKeys.length === 0) return false;
  const given = digest(key);
  let ok = false;
  for (const k of env.apiKeys) ok = timingSafeEqual(given, digest(k)) || ok;
  return ok;
}

export async function getCaller(req: Request): Promise<Caller | null> {
  // An empty header (a page built without a key) is treated as no key: the Clerk session decides.
  const key = req.headers.get("x-api-key")?.trim();
  if (key) return isValidApiKey(key) ? { kind: "app" } : null;
  try {
    const { userId } = await auth();
    return userId ? { kind: "session", clerkId: userId } : null;
  } catch {
    return null;
  }
}

/** Database record of a signed-in person (created on first visit). */
export async function getSessionUser(clerkId: string): Promise<UserDoc | null> {
  await connectDB();
  return User.findOne({ clerkId }).lean<UserDoc>();
}

export type SessionGate =
  | { ok: true; clerkId: string; user: UserDoc }
  | { ok: false; status: 401 | 403; error: string };

/** Signed-in, validated by an admin, and optionally with one of the given roles. */
export async function requireVerifiedSession(roles?: Role[]): Promise<SessionGate> {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    userId = null;
  }
  if (!userId) return { ok: false, status: 401, error: "Connexion requise" };
  const user = await getSessionUser(userId);
  if (!user || !user.verified) return { ok: false, status: 403, error: "Compte non validé" };
  if (roles && !roles.includes(user.role)) return { ok: false, status: 403, error: "Accès refusé" };
  return { ok: true, clerkId: userId, user };
}

/** Name and e-mail of the signed-in person, read from Clerk (never trusted from the request). */
export async function getClerkProfile(): Promise<{ email: string; name: string } | null> {
  const u = await currentUser();
  if (!u) return null;
  const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
  const name = (u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || email.split("@")[0] || "").trim();
  return { email: email.toLowerCase(), name: name.slice(0, 80) };
}

/** Short display name for documents: "Prénom N." */
export function displayName(user: Pick<UserDoc, "name" | "email"> | null | undefined): string {
  const raw = (user?.name || user?.email?.split("@")[0] || "").trim();
  if (!raw) return "";
  const parts = raw.split(/\s+/);
  return (parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]).slice(0, 40);
}
