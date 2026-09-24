import { getCaller, getSessionUser } from "@/lib/auth";
import { forbidden, json, rateLimit, serverError, unauthorized } from "@/lib/http";
import { monthRecap } from "@/lib/deliveries";
import { SITE_SLUG_RE } from "@/lib/sites";

/**
 * Everything ordered for a site since the 1st of the month (read-only totals).
 * Mobile app key, validated session, or — as before the rebuild, for app versions that call it
 * without a key — no credentials at all, with a lower rate limit. A wrong key is refused.
 */
export async function GET(req: Request) {
  try {
    const sentKey = Boolean(req.headers.get("x-api-key")?.trim());
    const caller = await getCaller(req);
    if (!caller && sentKey) return unauthorized();
    if (caller?.kind === "session") {
      const user = await getSessionUser(caller.clerkId);
      if (!user?.verified) return forbidden("Compte non validé");
    } else {
      const limited = rateLimit(req, caller ? "stock-recap:get" : "stock-recap:get:anonymous", caller ? 120 : 30);
      if (limited) return limited;
    }

    const site = new URL(req.url).searchParams.get("site") || "";
    if (!site) return json({ ok: false, error: "Missing site slug" }, 400);
    if (!SITE_SLUG_RE.test(site)) return json({ ok: false, error: "Invalid site slug" }, 400);

    const lines = await monthRecap(site);
    return json({ ok: true, items: lines.map((l) => ({ name: l.name, unit: l.unit, qty: l.qty })) });
  } catch (err) {
    console.error("GET /api/stock-recap:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
