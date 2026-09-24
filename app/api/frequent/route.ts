import { getCaller, getSessionUser } from "@/lib/auth";
import { badRequest, forbidden, json, rateLimit, serverError, unauthorized } from "@/lib/http";
import { frequentProducts } from "@/lib/deliveries";
import { SITE_SLUG_RE } from "@/lib/sites";

/** Products a site orders most often (shortcuts on the order screen). Key or validated session. */
export async function GET(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    if (caller.kind === "app") {
      const limited = rateLimit(req, "frequent:get", 120);
      if (limited) return limited;
    } else {
      const user = await getSessionUser(caller.clerkId);
      if (!user?.verified) return forbidden("Compte non validé");
    }

    const site = new URL(req.url).searchParams.get("site") || "";
    if (!SITE_SLUG_RE.test(site)) return badRequest("Site invalide");

    const products = await frequentProducts(site);
    return json({ ok: true, products });
  } catch (err) {
    console.error("GET /api/frequent:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
