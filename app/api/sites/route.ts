import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { getCaller, getSessionUser } from "@/lib/auth";
import { forbidden, json, rateLimit, readBody, serverError, unauthorized } from "@/lib/http";
import { Site, type SiteDoc } from "@/lib/models";
import { DEFAULT_SITES, defaultSite } from "@/lib/sites";
import { siteSlug } from "@/lib/validation";

/*
 * Restaurant sites. GET: mobile app (x-api-key) or anyone signed in (a new account picks its site
 * before being validated; addresses are public). POST (create / edit): app key (legacy) or admin.
 */

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

const siteBody = z.object({
  slug: siteSlug,
  name: text(80).pipe(z.string().min(1, "Nom requis")),
  line1: text(120).nullish(),
  line2: text(120).nullish(),
});

type SiteRow = Pick<SiteDoc, "_id" | "slug" | "name" | "line1" | "line2" | "active">;

const view = (r: SiteRow) => {
  const d = defaultSite(r.slug);
  return {
    _id: String(r._id),
    slug: r.slug,
    name: r.name,
    line1: r.line1 || d?.line1 || "",
    line2: r.line2 || d?.line2 || "",
    active: r.active !== false,
  };
};

const FIELDS = { slug: 1, name: 1, line1: 1, line2: 1, active: 1 } as const;

export async function GET(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    if (caller.kind === "app") {
      const limited = rateLimit(req, "sites:get", 120);
      if (limited) return limited;
    }

    await connectDB();
    // First use: store the built-in list (idempotent, safe if two requests race).
    if ((await Site.estimatedDocumentCount()) === 0) {
      await Site.bulkWrite(
        DEFAULT_SITES.map((s) => ({
          updateOne: {
            filter: { slug: s.slug },
            update: { $setOnInsert: { slug: s.slug, name: s.shortName, line1: s.line1, line2: s.line2, active: true } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    const rows = await Site.find({ active: { $ne: false } }, FIELDS).sort({ slug: 1 }).lean<SiteRow[]>();
    return json({ ok: true, sites: rows.map(view) });
  } catch (err) {
    console.error("GET /api/sites:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    if (caller.kind === "session") {
      const user = await getSessionUser(caller.clerkId);
      if (!user?.verified || user.role !== "admin") return forbidden("Réservé aux administrateurs");
    }
    const limited = rateLimit(req, "sites:post", 30);
    if (limited) return limited;

    const body = await readBody(req, siteBody);
    if ("error" in body) return body.error;
    const { slug, name, line1, line2 } = body.data;

    const set: Record<string, string | boolean> = { name, active: true };
    const unset: Record<string, 1> = {};
    if (line1) set.line1 = line1;
    else unset.line1 = 1;
    if (line2) set.line2 = line2;
    else unset.line2 = 1;

    await connectDB();
    const site = await Site.findOneAndUpdate(
      { slug },
      Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set },
      { upsert: true, returnDocument: "after", projection: FIELDS },
    ).lean<SiteRow>();
    if (!site) return serverError();
    return json({ ok: true, site: view(site) });
  } catch (err) {
    console.error("POST /api/sites:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
