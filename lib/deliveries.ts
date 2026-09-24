import "server-only";
import { ObjectId, type Document, type Filter } from "mongodb";
import { getDb } from "@/lib/connectDB";
import { DEFAULT_SITES, defaultSite, type SiteInfo } from "@/lib/sites";
import { Site } from "@/lib/models";
import type { DeliveryView, DocKind, DeliveryLine } from "@/types/delivery";

/*
 * Delivery notes ("bons de livraison") and stock sheets ("états des stocks") in the `deliveries`
 * collection.
 *
 * New documents use a compact format (v: 2) that stores only what is needed:
 *   { v: 2, k: "bl" | "stock", s: "BKTK01", d: "2026-09-24", r?: "2026-09-25",
 *     a: "Jean D.", au?: "user_…", n?: "note", i: [["ATTA", 2, "1 = 10KG"], …] }
 * - the site is stored as its code; the name and address come from the site list when reading;
 * - no e-mail address, no duplicated user id, no createdAt (the _id already holds the time);
 * - each line is a short array [name, quantity, unit] instead of an object with repeated keys.
 * Older documents (website: docType/site/items…, mobile app: type/user/items…) are still read.
 */

const COLLECTION = "deliveries";

type StoredLine = [string, number] | [string, number, string];
export type StoredV2 = {
  _id?: ObjectId;
  v: 2;
  k: DocKind;
  s: string;
  d: string;
  r?: string;
  a: string;
  au?: string;
  n?: string;
  i: StoredLine[];
};

let indexes: Promise<unknown> | null = null;
async function collection() {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  indexes ??= col.createIndex({ s: 1, _id: -1 }, { name: "site_recent" }).catch(() => (indexes = null));
  return col;
}

export const toYmd = (v: unknown): string => {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = v instanceof Date ? v : typeof v === "string" || typeof v === "number" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
};

/** Today in Paris, as YYYY-MM-DD. */
export const todayParis = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

/** Human document number, e.g. BL-260924-7F3A2C or INV-260930-0B91D4 (derived, never stored). */
export function documentNumber(kind: DocKind, date: string, id: string): string {
  const ymd = (date || "").replace(/-/g, "").slice(2, 8) || "000000";
  return `${kind === "stock" ? "INV" : "BL"}-${ymd}-${id.slice(-6).toUpperCase()}`;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown, max = 200) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");

function decodeLines(doc: Document): DeliveryLine[] {
  if (Array.isArray(doc.i)) {
    return doc.i.map((l: unknown) => (Array.isArray(l) ? { name: str(l[0]), qty: num(l[1]), unit: str(l[2]) } : { name: "", qty: 0, unit: "" }));
  }
  if (Array.isArray(doc.items)) {
    return doc.items.map((it: Document) => ({ name: str(it?.name), qty: num(it?.qty), unit: str(it?.unit) }));
  }
  return [];
}

/** Site list with the addresses edited by an admin (falls back to the built-in list). */
export async function getSitesMap(): Promise<Map<string, SiteInfo>> {
  const map = new Map(DEFAULT_SITES.map((s) => [s.slug, { ...s }]));
  try {
    const rows = await Site.find({}, { slug: 1, name: 1, line1: 1, line2: 1 }).lean();
    for (const r of rows) {
      const base = map.get(r.slug);
      map.set(r.slug, {
        slug: r.slug,
        shortName: r.name || base?.shortName || r.slug,
        name: base?.name || r.name.toUpperCase(),
        line1: r.line1 || base?.line1 || "",
        line2: r.line2 || base?.line2 || "",
      });
    }
  } catch {
    /* built-in list only */
  }
  return map;
}

/** Any stored document (v2 or legacy) → one shape for pages, PDF and APIs. */
export function decodeDocument(doc: Document, sites?: Map<string, SiteInfo>): DeliveryView {
  const id = String(doc._id);
  const kind: DocKind =
    doc.k === "stock" || doc.docType === "stock" || doc.type === "stock" ? "stock" : "bl";
  const siteSlug: string | null = str(doc.s) || str(doc.site?.slug) || (typeof doc.site === "string" ? str(doc.site) : "") || null;
  const site = (siteSlug && sites?.get(siteSlug)) || defaultSite(siteSlug);
  const date = doc.v === 2 ? str(doc.d) : toYmd(doc.date) || toYmd(doc.createdAt) || toYmd((doc._id as ObjectId)?.getTimestamp?.());
  const requested = doc.v === 2 ? str(doc.r) : toYmd(doc.requestedDeliveryDate);
  const author =
    doc.v === 2 ? str(doc.a, 60) : str(doc.username, 60) || str(doc.user, 60) || str(doc.signedBy, 60).split("@")[0];
  const createdAt = doc._id instanceof ObjectId ? doc._id.getTimestamp().toISOString() : toYmd(doc.createdAt);
  return {
    id,
    kind,
    number: documentNumber(kind, date, id),
    siteSlug,
    siteName: site?.name || str(doc.site?.name, 80) || "—",
    siteShortName: site?.shortName || str(doc.site?.name, 80) || siteSlug || "—",
    siteAddress: site ? [site.line1, site.line2].filter(Boolean) : [],
    date,
    requestedDate: requested || null,
    author,
    createdAt,
    note: str(doc.n, 500) || undefined,
    lines: decodeLines(doc),
  };
}

export function encodeDocument(input: {
  kind: DocKind;
  site: string;
  date: string;
  requestedDate?: string | null;
  author: string;
  authorId?: string;
  note?: string;
  lines: DeliveryLine[];
}): StoredV2 {
  const doc: StoredV2 = {
    v: 2,
    k: input.kind,
    s: input.site,
    d: input.date,
    a: input.author.slice(0, 60),
    i: input.lines.map((l) => (l.unit ? [l.name, l.qty, l.unit] : [l.name, l.qty])),
  };
  if (input.kind === "bl" && input.requestedDate) doc.r = input.requestedDate;
  if (input.authorId) doc.au = input.authorId;
  if (input.note) doc.n = input.note;
  return doc;
}

/** Merge lines with the same product and unit (adds quantities) and drop zero lines for notes. */
export function tidyLines(lines: DeliveryLine[], keepZero = false): DeliveryLine[] {
  const out: DeliveryLine[] = [];
  const seen = new Map<string, DeliveryLine>();
  for (const l of lines) {
    if (!l.name) continue;
    if (!keepZero && !(l.qty > 0)) continue;
    const key = `${l.name.toLowerCase()}|${l.unit.toLowerCase()}`;
    const prev = seen.get(key);
    if (prev) prev.qty = Math.round((prev.qty + l.qty) * 1000) / 1000;
    else {
      const copy = { ...l };
      seen.set(key, copy);
      out.push(copy);
    }
  }
  return out;
}

export async function insertDocument(doc: StoredV2): Promise<string> {
  const col = await collection();
  const res = await col.insertOne(doc as Document);
  return res.insertedId.toString();
}

export async function getDocument(id: string): Promise<DeliveryView | null> {
  if (!ObjectId.isValid(id) || !/^[a-f0-9]{24}$/i.test(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return decodeDocument(doc, await getSitesMap());
}

const siteFilter = (slug: string): Filter<Document> => ({ $or: [{ s: slug }, { "site.slug": slug }] });

/** Most recent documents, optionally for one site / kind, with cursor paging on _id. */
export async function listDocuments(opts: { site?: string | null; kind?: DocKind | null; before?: string | null; limit?: number }) {
  const col = await collection();
  const and: Filter<Document>[] = [];
  if (opts.site) and.push(siteFilter(opts.site));
  if (opts.kind === "stock") and.push({ $or: [{ k: "stock" }, { docType: "stock" }, { type: "stock" }] });
  if (opts.kind === "bl") and.push({ k: { $ne: "stock" }, docType: { $ne: "stock" }, type: { $ne: "stock" } });
  if (opts.before && /^[a-f0-9]{24}$/i.test(opts.before)) and.push({ _id: { $lt: new ObjectId(opts.before) } });
  const filter: Filter<Document> = and.length ? { $and: and } : {};
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const docs = await col.find(filter).sort({ _id: -1 }).limit(limit).toArray();
  const sites = await getSitesMap();
  return docs.map((d) => decodeDocument(d, sites));
}

/** Totals of everything ordered for a site since the first day of the current month (Paris time). */
export async function monthRecap(site: string): Promise<DeliveryLine[]> {
  const col = await collection();
  const month = todayParis().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00+01:00`);
  const docs = await col
    .find({ $and: [siteFilter(site), { _id: { $gte: ObjectId.createFromTime(Math.floor(start.getTime() / 1000) - 7200) } }] })
    .toArray();
  const lines: DeliveryLine[] = [];
  for (const d of docs) {
    const v = decodeDocument(d);
    if (v.kind !== "bl" || !v.date.startsWith(month)) continue;
    lines.push(...v.lines);
  }
  return tidyLines(lines);
}

/** Products most often ordered by a site recently (for the "fréquents" shortcuts). */
export async function frequentProducts(site: string, max = 12): Promise<{ name: string; unit: string; count: number }[]> {
  const col = await collection();
  const docs = await col.find(siteFilter(site)).sort({ _id: -1 }).limit(40).toArray();
  const counts = new Map<string, { name: string; unit: string; count: number }>();
  for (const d of docs) {
    const v = decodeDocument(d);
    if (v.kind !== "bl") continue;
    for (const l of v.lines) {
      const key = `${l.name.toLowerCase()}|${l.unit.toLowerCase()}`;
      const c = counts.get(key) ?? { name: l.name, unit: l.unit, count: 0 };
      c.count++;
      counts.set(key, c);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, max);
}
