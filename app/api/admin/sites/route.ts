import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { getSitesMap } from "@/lib/deliveries";
import { badRequest, json, readBody, serverError } from "@/lib/http";
import { Site } from "@/lib/models";
import { siteSlug } from "@/lib/validation";
import { listSites } from "@/app/admin/_lib/data";
import { adminGuard, logError } from "@/app/api/admin/_lib/guard";
import type { SiteOption } from "@/types/delivery";

/*
 * Site names and addresses printed on the PDFs (admins only, Clerk session).
 * GET   → { ok, sites: SiteOption[] }
 * PATCH { slug, shortName?, line1?, line2? } → { ok: true, site }
 *       An empty address line is removed; built-in sites then print their original address.
 */

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, `${max} caractères au maximum`));

const patchSchema = z.object({
  slug: siteSlug,
  shortName: text(80).pipe(z.string().min(1, "Nom court requis")).optional(),
  line1: text(120).optional(),
  line2: text(120).optional(),
});

export async function GET(req: Request) {
  try {
    const guard = await adminGuard(req, "sites");
    if (!guard.ok) return guard.response;
    return json({ ok: true, sites: await listSites() });
  } catch (err) {
    logError("GET /api/admin/sites", err);
    return serverError();
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await adminGuard(req, "sites");
    if (!guard.ok) return guard.response;

    const body = await readBody(req, patchSchema);
    if ("error" in body) return body.error;
    const { slug, shortName, line1, line2 } = body.data;

    await connectDB();
    const known = (await getSitesMap()).get(slug);
    // Only known sites are edited here (new sites are created with POST /api/sites).
    if (!known) return badRequest("Site inconnu.");

    const $set: { active: true; name?: string; line1?: string; line2?: string } = { active: true };
    const $unset: { line1?: 1; line2?: 1 } = {};
    if (shortName !== undefined) $set.name = shortName;
    if (line1 !== undefined) {
      if (line1) $set.line1 = line1;
      else $unset.line1 = 1;
    }
    if (line2 !== undefined) {
      if (line2) $set.line2 = line2;
      else $unset.line2 = 1;
    }

    await Site.updateOne(
      { slug },
      {
        $set,
        ...(Object.keys($unset).length ? { $unset } : {}),
        // A built-in site not stored yet keeps its usual short name.
        ...(shortName === undefined ? { $setOnInsert: { name: known.shortName } } : {}),
      },
      { upsert: true, runValidators: true },
    );

    const s = (await getSitesMap()).get(slug);
    if (!s) return serverError();
    const site: SiteOption = { slug: s.slug, name: s.name, shortName: s.shortName, line1: s.line1, line2: s.line2 };
    return json({ ok: true, site });
  } catch (err) {
    logError("PATCH /api/admin/sites", err);
    return serverError();
  }
}
