import { getCaller, getSessionUser } from "@/lib/auth";
import { forbidden, json, rateLimit, readBody, serverError, unauthorized } from "@/lib/http";
import { addCustomProduct, getCatalog } from "@/lib/catalog";
import { newProductSchema } from "@/lib/validation";

/*
 * Product catalogue (built-in list + products added by the team).
 * Mobile app (x-api-key) and validated website users. Field names are the app's legacy ones.
 */

async function check(req: Request, route: string, keyMax: number, sessionMax?: number) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  if (caller.kind === "session") {
    const user = await getSessionUser(caller.clerkId);
    if (!user?.verified) return forbidden("Compte non validé");
    return sessionMax ? rateLimit(req, route, sessionMax) : null;
  }
  return rateLimit(req, route, keyMax);
}

export async function GET(req: Request) {
  try {
    const denied = await check(req, "products:get", 120);
    if (denied) return denied;

    // getCatalog() still returns the built-in list when the database is unavailable.
    const catalog = await getCatalog();
    const products = catalog.map((p) =>
      p.custom
        ? { uniquename: p.name, typedequantite: p.unit, custom: true as const }
        : { uniquename: p.name, typedequantite: p.unit },
    );
    return json({ ok: true, products });
  } catch (err) {
    console.error("GET /api/products:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const denied = await check(req, "products:post", 30, 30);
    if (denied) return denied;

    const body = await readBody(req, newProductSchema);
    if ("error" in body) return body.error;

    try {
      const { created } = await addCustomProduct(body.data.name, body.data.unit || undefined);
      return json({ ok: true, created });
    } catch (err) {
      // Same product added at the same moment by someone else (unique index).
      if (err && typeof err === "object" && (err as { code?: unknown }).code === 11000) return json({ ok: true, created: false });
      throw err;
    }
  } catch (err) {
    console.error("POST /api/products:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
