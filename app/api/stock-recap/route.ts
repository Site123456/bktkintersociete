import { getCaller, getSessionUser } from "@/lib/auth";
import { forbidden, json, rateLimit, serverError, unauthorized } from "@/lib/http";
import { monthRecap } from "@/lib/deliveries";
import { SITE_SLUG_RE } from "@/lib/sites";

/** Everything ordered for a site since the 1st of the month. Mobile app key or validated session. */
export async function GET(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    if (caller.kind === "app") {
      const limited = rateLimit(req, "stock-recap:get", 120);
      if (limited) return limited;
    } else {
      const user = await getSessionUser(caller.clerkId);
      if (!user?.verified) return forbidden("Compte non validé");
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
