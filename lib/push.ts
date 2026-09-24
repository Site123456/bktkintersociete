import "server-only";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";
import type { DocKind } from "@/types/delivery";

/*
 * Push notifications to the mobile app through the Expo push service.
 * Tokens and message contents are never logged: only counts and error messages.
 */

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100; // Expo accepts at most 100 messages per request
const TIMEOUT_MS = 10_000;

export const PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]\s]{1,180}\]$/;

export type PushData = Record<string, unknown>;
export type PushResult = { sent: number; failed: number };

type ExpoMessage = {
  to: string;
  sound: "default";
  data?: PushData;
  _contentAvailable: true;
  title?: string;
  body?: string;
};

function countTickets(payload: unknown): { ok: number; errors: number } {
  const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : undefined;
  if (!Array.isArray(data)) return { ok: 0, errors: 0 };
  let ok = 0;
  let errors = 0;
  for (const t of data) {
    if (t && typeof t === "object" && (t as { status?: unknown }).status === "ok") ok++;
    else errors++;
  }
  return { ok, errors };
}

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: PushData,
  silent?: boolean,
): Promise<PushResult | undefined> {
  if (tokens.length === 0) return;

  // Keep only well-formed Expo tokens, each once.
  const validTokens = [...new Set(tokens.filter((t) => typeof t === "string" && t.length <= 200 && PUSH_TOKEN_RE.test(t)))];
  if (validTokens.length === 0) return;

  const messages: ExpoMessage[] = validTokens.map((to) => {
    const message: ExpoMessage = { to, sound: "default", data, _contentAvailable: true };
    if (!silent) {
      message.title = title;
      message.body = body;
    }
    return message;
  });

  const result: PushResult = { sent: 0, failed: 0 };
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const response = await fetch(EXPO_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        result.failed += chunk.length;
        console.error(`Push: Expo answered ${response.status} for ${chunk.length} message(s)`);
        continue;
      }
      const tickets = countTickets(await response.json().catch(() => null));
      result.sent += tickets.ok;
      result.failed += chunk.length - tickets.ok;
    } catch (error) {
      result.failed += chunk.length;
      console.error("Push: request failed:", error instanceof Error ? error.message : "unknown error");
    }
  }
  if (result.failed > 0) console.error(`Push: ${result.sent} sent, ${result.failed} failed`);
  return result;
}

/**
 * Tells everyone attached to a site (with a push token) that a document was sent.
 * Best-effort: never throws.
 */
export async function notifySiteUsers(opts: { site: string; siteName: string; senderName: string; kind: DocKind }): Promise<void> {
  try {
    await connectDB();
    const users = await User.find(
      // Only validated accounts: a refused or revoked person gets no notification.
      { site: opts.site, verified: true, pushToken: { $exists: true, $ne: "" } },
      { pushToken: 1, _id: 0 },
    ).lean<{ pushToken?: string }[]>();
    const tokens = users.map((u) => u.pushToken || "").filter(Boolean);
    if (tokens.length === 0) return;
    const title = opts.kind === "stock" ? "📦 Inventaire Mis à Jour" : "🚚 Nouvelle Commande";
    const siteName = opts.siteName || "votre site";
    const senderName = opts.senderName || "Un utilisateur";
    const bodyMsg = `Une nouvelle commande pour ${siteName} a été envoyée par ${senderName}. Les confirmations de commande sont envoyées à tous les utilisateurs du site.`;
    await sendPushNotifications(tokens, title, bodyMsg, { type: opts.kind === "stock" ? "stock" : "command", siteSlug: opts.site });
  } catch (err) {
    console.error("Push: failed to notify site users:", err instanceof Error ? err.message : "unknown error");
  }
}
