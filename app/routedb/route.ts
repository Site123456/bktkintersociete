import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { getCaller, getSessionUser, displayName } from "@/lib/auth";
import { badRequest, forbidden, json, rateLimit, readBody, serverError, unauthorized } from "@/lib/http";
import { encodeDocument, insertDocument, tidyLines, toYmd, todayParis } from "@/lib/deliveries";
import { LIMITS, lineSchema } from "@/lib/validation";
import { SITE_SLUG_RE } from "@/lib/sites";
import type { UserDoc } from "@/lib/models";

/*
 * Legacy endpoint of the first website version (possibly still used by older app builds).
 * GET is a health check for the app key. POST accepts the old document format and stores it in the
 * compact format: the e-mail address and the user reference are never stored.
 */

export async function GET(req: Request) {
  try {
    const caller = await getCaller(req);
    if (caller?.kind !== "app") return unauthorized();
    const limited = rateLimit(req, "routedb:get", 120);
    if (limited) return limited;
    await connectDB();
    return json({ ok: true });
  } catch (err) {
    console.error("GET /routedb:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}

const shortText = z.string().max(254).nullish();

const legacySchema = z.object({
  docType: z.string().max(20).nullish(),
  date: z.union([z.string().max(40), z.number()]).nullish(),
  requestedDeliveryDate: z.string().max(40).nullish(),
  signedBy: shortText,
  username: shortText,
  site: z.union([z.string().max(40), z.object({ slug: z.string().max(40) })]),
  items: z.array(z.unknown()).min(1).max(LIMITS.lines),
});

const clean = (s: string | null | undefined, max: number) =>
  (s || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const isRealYmd = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = new Date(`${s}T00:00:00Z`).getTime();
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

export async function POST(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    let sessionUser: UserDoc | null = null;
    if (caller.kind === "session") {
      sessionUser = await getSessionUser(caller.clerkId);
      if (!sessionUser?.verified) return forbidden("Compte non validé");
    }
    const limited = rateLimit(req, "routedb:post", 30);
    if (limited) return limited;

    const body = await readBody(req, legacySchema);
    if ("error" in body) return body.error;
    const input = body.data;

    const slug = (typeof input.site === "string" ? input.site : input.site.slug).trim();
    if (!SITE_SLUG_RE.test(slug)) return badRequest("Invalid site");

    const kind = input.docType === "stock" ? "stock" : "bl";
    const parsed = z.array(lineSchema).safeParse(
      input.items.map((raw) => {
        const it = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        return { name: it.name ?? "", qty: it.qty ?? 0, unit: it.unit ?? "" };
      }),
    );
    if (!parsed.success) return badRequest("Invalid items");
    const lines = tidyLines(parsed.data, kind === "stock");
    if (lines.length === 0) return badRequest("Invalid items");

    // Identity: from Clerk for a session, otherwise the name sent by the app (never the e-mail).
    const author = sessionUser
      ? displayName(sessionUser)
      : clean(input.username, 60) || clean(clean(input.signedBy, 254).split("@")[0], 60);

    const date = toYmd(input.date ?? "");
    const requested = toYmd(input.requestedDeliveryDate ?? "");
    const { id } = await insertDocument(
      encodeDocument({
        kind,
        site: slug,
        date: isRealYmd(date) ? date : todayParis(),
        requestedDate: isRealYmd(requested) ? requested : null,
        author: author.includes("@") ? author.split("@")[0] : author,
        authorId: sessionUser ? sessionUser.clerkId : undefined,
        lines,
      }),
    );
    return json({ ok: true, id });
  } catch (err) {
    console.error("POST /routedb:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
