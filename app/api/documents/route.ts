import { after } from "next/server";
import { z } from "zod";
import { displayName, requireVerifiedSession } from "@/lib/auth";
import { badRequest, json, rateLimit, readBody, serverError } from "@/lib/http";
import { documentNumber, encodeDocument, getSitesMap, insertDocument, listDocuments, tidyLines, todayParis } from "@/lib/deliveries";
import { docKind, newDocumentSchema, objectId, siteSlug } from "@/lib/validation";
import { ymdParis } from "@/lib/format";
import { notifySiteUsers } from "@/lib/push";

/*
 * Website endpoint (Clerk session of a validated user only; the API key is not accepted here).
 * POST creates a bon de livraison or an état des stocks, GET lists recent documents.
 */

const MAX_AHEAD_DAYS = 60;

const isRealYmd = (s: string) => {
  const t = new Date(`${s}T00:00:00Z`).getTime();
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

export async function POST(req: Request) {
  try {
    const session = await requireVerifiedSession(undefined, req);
    if (!session.ok) return json({ ok: false, error: session.error }, session.status);
    const limited = rateLimit(req, "documents:post", 20);
    if (limited) return limited;

    const body = await readBody(req, newDocumentSchema);
    if ("error" in body) return body.error;
    const input = body.data;

    const sites = await getSitesMap();
    const site = sites.get(input.site);
    if (!site) return badRequest("Site inconnu");

    let requestedDate: string | null = null;
    if (input.kind === "bl") {
      requestedDate = input.requestedDate ?? ymdParis(1);
      const today = ymdParis(0);
      if (!isRealYmd(requestedDate) || requestedDate < today || requestedDate > ymdParis(MAX_AHEAD_DAYS)) {
        return badRequest(`Date de livraison invalide : choisissez une date entre aujourd'hui et dans ${MAX_AHEAD_DAYS} jours`);
      }
    }

    // On a stock sheet a zero quantity means "out of stock" and is kept.
    const lines = tidyLines(input.lines, input.kind === "stock");
    if (lines.length === 0) return badRequest("Ajoutez au moins un article avec une quantité");

    const author = displayName(session.user);
    const date = todayParis();
    const saved = await insertDocument(
      encodeDocument({
        kind: input.kind,
        site: site.slug,
        date,
        requestedDate,
        author,
        authorId: session.clerkId,
        note: input.note || undefined,
        requestId: input.requestId,
        lines,
      }),
    );

    // A retry of a send that already went through: same document, no second notification.
    if (!saved.existing) {
      after(() => notifySiteUsers({ site: site.slug, siteName: site.shortName, senderName: author, kind: input.kind }));
    }

    return json({ ok: true, id: saved.id, number: documentNumber(input.kind, saved.date, saved.id) });
  } catch (err) {
    console.error("POST /api/documents:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}

const listQuery = z.object({
  site: siteSlug.optional(),
  kind: docKind.optional(),
  before: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireVerifiedSession(undefined, req);
    if (!session.ok) return json({ ok: false, error: session.error }, session.status);

    const params = new URL(req.url).searchParams;
    const query = listQuery.safeParse({
      site: params.get("site") || undefined,
      kind: params.get("kind") || undefined,
      before: params.get("before") || undefined,
      limit: params.get("limit") || undefined,
    });
    if (!query.success) return badRequest("Paramètres invalides");

    const limit = query.data.limit ?? 30;
    const documents = await listDocuments({
      site: query.data.site ?? null,
      kind: query.data.kind ?? null,
      before: query.data.before ?? null,
      limit,
    });
    const nextBefore = documents.length === limit ? documents[documents.length - 1].id : null;
    return json({ ok: true, documents, nextBefore });
  } catch (err) {
    console.error("GET /api/documents:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
