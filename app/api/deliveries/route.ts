import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getCaller, getSessionUser, displayName } from "@/lib/auth";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/http";
import { encodeDocument, getSitesMap, insertDocument, listDocuments, tidyLines, toYmd, todayParis } from "@/lib/deliveries";
import { LIMITS, lineSchema } from "@/lib/validation";
import { SITE_SLUG_RE } from "@/lib/sites";
import { notifySiteUsers } from "@/lib/push";
import type { UserDoc } from "@/lib/models";
import type { DeliveryLine } from "@/types/delivery";

/*
 * Legacy endpoint used by the mobile app (x-api-key) and usable by validated website users.
 * Errors stay plain text, as the app expects: 401 "Unauthorized", 400 "Missing data" / "Invalid JSON",
 * 500 "Erreur Serveur".
 */

const text = (body: string, status: number) =>
  new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

type Gate = { ok: true; user: UserDoc | null; clerkId: string | null } | { ok: false; res: NextResponse };

async function gate(req: Request): Promise<Gate> {
  const caller = await getCaller(req);
  if (!caller) return { ok: false, res: text("Unauthorized", 401) };
  if (caller.kind === "app") return { ok: true, user: null, clerkId: null };
  const user = await getSessionUser(caller.clerkId);
  if (!user?.verified) return { ok: false, res: text("Forbidden", 403) };
  return { ok: true, user, clerkId: caller.clerkId };
}

export async function GET(req: Request) {
  try {
    const g = await gate(req);
    if (!g.ok) return g.res;
    if (!g.user) {
      const limited = rateLimit(req, "deliveries:get", 120);
      if (limited) return limited;
    }

    const site = new URL(req.url).searchParams.get("site");
    // An unknown code cannot match any document.
    if (site && !SITE_SLUG_RE.test(site)) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });

    const docs = await listDocuments({ site: site || null, limit: 50 });
    const out = docs.map((d) => ({
      _id: d.id,
      site: d.siteShortName,
      date: d.date,
      pdf: `${env.baseUrl}/api/pdf?id=${d.id}`,
    }));
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/deliveries:", error instanceof Error ? error.message : "unknown error");
    return text("Erreur Serveur", 500);
  }
}

const MAX_BODY = 256 * 1024;

const bodySchema = z.object({
  site: z.union([z.string().max(40), z.object({ slug: z.string().max(40), name: z.unknown().optional() })]),
  // Optional fields are read leniently (the app cannot be updated): anything unexpected is ignored.
  date: z.unknown().optional(),
  user: z.unknown().optional(),
  type: z.unknown().optional(),
  items: z.array(z.unknown()).max(LIMITS.lines),
});

const clean = (s: string, max: number) =>
  s
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Author as typed in the app; an e-mail address is reduced to its first part. */
const authorFrom = (user: unknown) => {
  const u = clean(typeof user === "string" ? user : "", 200);
  return clean(u.includes("@") ? u.split("@")[0] : u, 60);
};

const isRealYmd = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = new Date(`${s}T00:00:00Z`).getTime();
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

/** Validates the app's items; blank rows are skipped, any other invalid row rejects the request. */
function parseItems(items: unknown[]): DeliveryLine[] | null {
  const lines: DeliveryLine[] = [];
  for (const raw of items) {
    const it = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const candidate = { name: it.name ?? "", qty: it.qty ?? 0, unit: it.unit ?? "" };
    const parsed = lineSchema.safeParse(candidate);
    if (parsed.success) {
      lines.push(parsed.data);
      continue;
    }
    const blankName = typeof candidate.name !== "string" || candidate.name.trim() === "";
    if (!blankName) return null;
  }
  return lines;
}

export async function POST(req: Request) {
  try {
    const g = await gate(req);
    if (!g.ok) return g.res;
    const limited = rateLimit(req, "deliveries:post", 30);
    if (limited) return limited;

    let raw: unknown;
    try {
      const body = await req.text();
      if (body.length > MAX_BODY) return text("Payload too large", 413);
      raw = JSON.parse(body);
    } catch {
      return text("Invalid JSON", 400);
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return text("Missing data", 400);
    const { site, date, user, type, items } = parsed.data;

    const slug = (typeof site === "string" ? site : site.slug).trim();
    if (!SITE_SLUG_RE.test(slug)) return text("Missing data", 400);

    const kind = type === "stock" ? "stock" : "bl";
    const valid = parseItems(items);
    if (!valid) return text("Missing data", 400);
    const lines = tidyLines(valid, kind === "stock");
    if (lines.length === 0) return text("Missing data", 400);

    const ymd = typeof date === "string" || typeof date === "number" ? toYmd(date) : "";
    const author = g.user ? displayName(g.user) : authorFrom(user);

    const id = await insertDocument(
      encodeDocument({
        kind,
        site: slug,
        date: isRealYmd(ymd) ? ymd : todayParis(),
        author,
        authorId: g.clerkId ?? undefined,
        lines,
      }),
    );

    // Notify the site's team once the answer is sent (best-effort).
    const bodyName = typeof site === "object" && typeof site.name === "string" ? clean(site.name, 80) : "";
    after(async () => {
      const sites = await getSitesMap();
      await notifySiteUsers({ site: slug, siteName: sites.get(slug)?.shortName || bodyName, senderName: author, kind });
    });

    return NextResponse.json({ ok: true, id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("POST /api/deliveries:", error instanceof Error ? error.message : "unknown error");
    return text("Erreur Serveur", 500);
  }
}
