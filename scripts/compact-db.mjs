#!/usr/bin/env node
/*
 * Compacts the BKTK International MongoDB database. It never deletes a document.
 *
 * Usage (from the project folder):
 *   node --env-file=.env.local scripts/compact-db.mjs           # dry run: shows what would change, writes nothing
 *   node --env-file=.env.local scripts/compact-db.mjs --apply   # makes the changes
 *
 * The connection string is read from the environment: MONGOSEDB_URI (or MONGODB_URI).
 * It cannot be given on the command line, so it never ends up in the shell history.
 *
 * What changes:
 * - deliveries: every document not yet in the compact format (v: 2) is rewritten in that format, with the
 *   same _id: { v: 2, k, s, d, r?, a, n?, i: [[name, qty, unit?], …] }. The e-mail address (signedBy),
 *   the user reference (ref), createdAt, the copied site object and duplicated user names are dropped;
 *   the author's display name and the requested delivery date are kept. Documents whose site code cannot
 *   be read are left untouched and counted as "skipped".
 * - users: removes empty pushToken and empty site, and __v / updatedAt.
 * - attendances, customproducts, sites, messages: removes __v and updatedAt (attendances: also createdAt).
 *
 * The conversion mirrors lib/deliveries.ts (decodeDocument + encodeDocument). This file is plain
 * JavaScript on purpose: it does not import the TypeScript sources.
 */
import { BSON, MongoClient } from "mongodb";

const BATCH = 500;
const SITE_SLUG_RE = /^[A-Z0-9_-]{2,16}$/;

// ---------------------------------------------------------------------------------------------
// Arguments

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node --env-file=.env.local scripts/compact-db.mjs [--apply]");
  process.exit(0);
}
if (args.some((a) => a === "--uri" || a.startsWith("--uri="))) {
  console.error("--uri is not accepted (it would stay in the shell history).");
  console.error("Set MONGOSEDB_URI in the environment, e.g. node --env-file=.env.local scripts/compact-db.mjs");
  process.exit(1);
}
const unknownArgs = args.filter((a) => a !== "--apply");
if (unknownArgs.length > 0) {
  console.error(`Unknown option: ${unknownArgs.join(" ")}`);
  console.error("Usage: node --env-file=.env.local scripts/compact-db.mjs [--apply]");
  process.exit(1);
}
const APPLY = args.includes("--apply");

const uri = process.env.MONGOSEDB_URI || process.env.MONGODB_URI || "";
if (!uri) {
  console.error("MONGOSEDB_URI (or MONGODB_URI) is not set.");
  console.error("Example: node --env-file=.env.local scripts/compact-db.mjs");
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Helpers (same rules as lib/deliveries.ts)

const str = (v, max = 200) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");
const num = (v) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toYmd = (v) => {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = v instanceof Date ? v : typeof v === "string" || typeof v === "number" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
};
/** Never keep an e-mail address as the author: "jean.dupont@x.fr" → "jean.dupont". */
const withoutEmail = (s) => (s.includes("@") ? s.split("@")[0].trim() : s);
const size = (doc) => BSON.calculateObjectSize(doc);

function formatBytes(n) {
  const abs = Math.abs(n);
  if (abs < 1024) return `${n} B`;
  if (abs < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Legacy delivery document → compact v2 document (without _id), or null when it cannot be converted. */
function toV2(doc) {
  const kind = doc.k === "stock" || doc.docType === "stock" || doc.type === "stock" ? "stock" : "bl";
  const slug =
    str(doc.s) || str(doc.site && typeof doc.site === "object" ? doc.site.slug : "") || (typeof doc.site === "string" ? str(doc.site) : "");
  if (!SITE_SLUG_RE.test(slug)) return null;

  const idTime = typeof doc._id?.getTimestamp === "function" ? doc._id.getTimestamp() : null;
  const date = toYmd(doc.d) || toYmd(doc.date) || toYmd(doc.createdAt) || toYmd(idTime);
  const requested = kind === "bl" ? toYmd(doc.r) || toYmd(doc.requestedDeliveryDate) : "";
  const author = withoutEmail(str(doc.a, 254) || str(doc.username, 254) || str(doc.user, 254) || str(doc.signedBy, 254)).slice(0, 60);
  const note = str(doc.n ?? doc.note, 500);

  let lines = [];
  if (Array.isArray(doc.i)) {
    lines = doc.i.map((l) => (Array.isArray(l) ? { name: str(l[0]), qty: num(l[1]), unit: str(l[2]) } : null));
  } else if (Array.isArray(doc.items)) {
    lines = doc.items.map((it) => (it && typeof it === "object" ? { name: str(it.name), qty: num(it.qty), unit: str(it.unit) } : null));
  }

  const out = { v: 2, k: kind, s: slug, d: date, a: author };
  if (kind === "bl" && requested) out.r = requested;
  if (typeof doc.au === "string" && doc.au) out.au = doc.au;
  if (note) out.n = note;
  out.i = lines.filter((l) => l && l.name).map((l) => (l.unit ? [l.name, l.qty, l.unit] : [l.name, l.qty]));
  return out;
}

/** Fields to remove from a document, or [] when nothing changes. */
function fieldsToUnset(doc, fields, emptyFields = []) {
  const out = fields.filter((f) => Object.prototype.hasOwnProperty.call(doc, f));
  for (const f of emptyFields) {
    if (Object.prototype.hasOwnProperty.call(doc, f) && (doc[f] === "" || doc[f] === null)) out.push(f);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Work

/**
 * Scans a collection. `plan(doc)` returns { op, after } (a bulkWrite operation and the document as it
 * will be stored), "skip" when the document cannot be changed safely, or null when nothing changes.
 */
async function processCollection(db, name, plan, filter = {}) {
  const found = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (found.length === 0) {
    console.log(`  ${name.padEnd(15)} not found, skipped`);
    return { changed: 0, saved: 0, written: 0 };
  }
  const col = db.collection(name);
  const s = { scanned: 0, changed: 0, skipped: 0, before: 0, after: 0, written: 0 };
  let batch = [];
  const flush = async () => {
    if (batch.length === 0) return;
    if (APPLY) {
      const res = await col.bulkWrite(batch, { ordered: false });
      s.written += res.modifiedCount;
    }
    batch = [];
  };

  for await (const doc of col.find(filter)) {
    s.scanned++;
    const p = plan(doc);
    if (p === null) continue;
    if (p === "skip") {
      s.skipped++;
      continue;
    }
    s.changed++;
    s.before += size(doc);
    s.after += size(p.after);
    batch.push(p.op);
    if (batch.length >= BATCH) await flush();
  }
  await flush();

  const saved = s.before - s.after;
  const verb = APPLY ? "changed" : "would change";
  let line = `  ${name.padEnd(15)} ${String(s.scanned).padStart(6)} scanned, ${String(s.changed).padStart(6)} ${verb}`;
  if (s.skipped) line += `, ${s.skipped} skipped (no valid site code)`;
  if (s.changed) line += ` · ${formatBytes(s.before)} → ${formatBytes(s.after)} (saves ${formatBytes(saved)})`;
  if (APPLY) line += ` · ${s.written} written`;
  console.log(line);
  return { changed: s.changed, saved, written: s.written };
}

const deliveriesPlan = (doc) => {
  const v2 = toV2(doc);
  if (!v2) return "skip";
  return {
    op: { replaceOne: { filter: { _id: doc._id, v: { $ne: 2 } }, replacement: v2 } },
    after: { _id: doc._id, ...v2 },
  };
};

const unsetPlan = (fields, emptyFields = []) => (doc) => {
  const unset = fieldsToUnset(doc, fields, emptyFields);
  if (unset.length === 0) return null;
  const after = { ...doc };
  for (const f of unset) delete after[f];
  return {
    op: { updateOne: { filter: { _id: doc._id }, update: { $unset: Object.fromEntries(unset.map((f) => [f, ""])) } } },
    after,
  };
};

async function main() {
  console.log("BKTK International – database compaction");
  console.log("=========================================");
  if (APPLY) {
    console.log("Mode: APPLY – the changes below are written to the database. No document is deleted.");
  } else {
    console.log("Mode: DRY RUN – nothing is written. Sizes are estimates (BSON size before/after).");
    console.log("      Run again with --apply to make these changes.");
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, appName: "bktk-compact-db" });
  await client.connect();
  try {
    const db = client.db();
    console.log(`Database: ${db.databaseName}\n`);

    const results = [];
    results.push(await processCollection(db, "deliveries", deliveriesPlan, { v: { $ne: 2 } }));
    results.push(await processCollection(db, "users", unsetPlan(["__v", "updatedAt"], ["pushToken", "site"])));
    results.push(await processCollection(db, "attendances", unsetPlan(["__v", "updatedAt", "createdAt"])));
    results.push(await processCollection(db, "customproducts", unsetPlan(["__v", "updatedAt"])));
    results.push(await processCollection(db, "sites", unsetPlan(["__v", "updatedAt"])));
    results.push(await processCollection(db, "messages", unsetPlan(["__v", "updatedAt"])));

    const changed = results.reduce((t, r) => t + r.changed, 0);
    const saved = results.reduce((t, r) => t + r.saved, 0);
    const written = results.reduce((t, r) => t + r.written, 0);
    console.log("");
    if (APPLY) {
      console.log(`Done: ${written} document(s) updated, about ${formatBytes(saved)} saved.`);
    } else {
      console.log(`Total: ${changed} document(s) would change, about ${formatBytes(saved)} saved.`);
      console.log("Nothing was written. Run with --apply to make these changes.");
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Compaction failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
