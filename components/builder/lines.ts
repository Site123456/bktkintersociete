import { normalizeKey } from "@/lib/format";
import { MAX_QTY } from "@/components/app/units";
import type { DeliveryLine } from "@/types/delivery";

/** Same limit as LIMITS.lines in lib/validation (repeated so the client bundle does not pull zod). */
export const MAX_LINES = 300;
export const MAX_NOTE_LENGTH = 500;

/** A line being edited (the id only lives in the browser, for React keys, highlight and undo). */
export type BuilderLine = DeliveryLine & { id: string };

/** Document a bon de livraison was copied from ("Recommander"). */
export type SourceDoc = { id: string; number: string };

export type DeliveryDraft = {
  v: 1;
  /** Requested delivery date, YYYY-MM-DD ("" = default). */
  date: string;
  note: string;
  lines: BuilderLine[];
  from: SourceDoc | null;
};

export type StockDraft = {
  v: 1;
  /** Month the sheet was started in (YYYY-MM): a draft of another month is kept only while it has lines. */
  month: string;
  /** true once the lines were prefilled with the month's orders or edited by hand. */
  seeded: boolean;
  /** true when the lines came from the month's orders (shows the explanation). */
  prefilled: boolean;
  lines: BuilderLine[];
};

/** Same product = same name and packaging (case and accents ignored). */
export const lineKey = (name: string, unit: string) => `${normalizeKey(name)}|${normalizeKey(unit)}`;

let counter = 0;
/** Local id for a new line (called from event handlers only). */
export function newLineId(): string {
  counter += 1;
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : "";
  return `l${Date.now().toString(36)}${counter.toString(36)}${rnd}`;
}

/**
 * Id of one sending attempt (POST /api/documents "requestId", 8-40 chars of [A-Za-z0-9_-]): a retry with the same id
 * returns the document already created instead of a second one. Called from event handlers only.
 */
export function newRequestId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // randomUUID needs a secure context (https): 24 random base-36 characters instead.
  const bytes = new Uint8Array(24);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** Lines received from the server, with stable ids (no randomness: safe during render). */
export function withIds(lines: DeliveryLine[], prefix: string): BuilderLine[] {
  return lines
    .filter((l) => l.name.trim() && Number.isFinite(l.qty) && l.qty >= 0)
    .slice(0, MAX_LINES)
    .map((l, i) => ({ id: `${prefix}-${i}`, name: l.name, unit: l.unit, qty: Math.min(l.qty, MAX_QTY) }));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function isLine(v: unknown): v is BuilderLine {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.unit === "string" &&
    typeof v.qty === "number" &&
    Number.isFinite(v.qty) &&
    v.qty >= 0
  );
}

const isLines = (v: unknown): v is BuilderLine[] => Array.isArray(v) && v.length <= MAX_LINES && v.every(isLine);

function isSource(v: unknown): v is SourceDoc | null {
  return v === null || (isObject(v) && typeof v.id === "string" && typeof v.number === "string");
}

export function isDeliveryDraft(v: unknown): v is DeliveryDraft {
  return (
    isObject(v) && v.v === 1 && typeof v.date === "string" && typeof v.note === "string" && isLines(v.lines) && isSource(v.from)
  );
}

export function isStockDraft(v: unknown): v is StockDraft {
  return (
    isObject(v) &&
    v.v === 1 &&
    typeof v.month === "string" &&
    typeof v.seeded === "boolean" &&
    typeof v.prefilled === "boolean" &&
    isLines(v.lines)
  );
}

/** Lines that will be sent (quantity above zero), without the local ids. */
/** Lines for the server. Zero lines are dropped, except on a stock sheet (keepZero): 0 = out of stock. */
export function linesToSend(lines: BuilderLine[], keepZero = false): DeliveryLine[] {
  return lines
    .filter((l) => l.name.trim() && (keepZero ? l.qty >= 0 : l.qty > 0))
    .map(({ name, unit, qty }) => ({ name, unit, qty }));
}

export type Totals = { articles: number; quantity: number; zero: number };

export function totalsOf(lines: BuilderLine[]): Totals {
  let articles = 0;
  let quantity = 0;
  let zero = 0;
  for (const l of lines) {
    if (l.qty > 0) {
      articles += 1;
      quantity += l.qty;
    } else zero += 1;
  }
  return { articles, quantity: Math.round(quantity * 1000) / 1000, zero };
}

export const plural = (n: number, one: string, many = `${one}s`) => (n > 1 ? many : one);

/** "3 articles" */
export const countLabel = (n: number, word = "article") => `${n} ${plural(n, word)}`;

/** "2026-09-25" → "vendredi" */
export function weekdayOf(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const d = new Date(`${ymd}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(d);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** Relative to today: "aujourd’hui", "demain", "après-demain", "dans 5 jours" ("" for a past or invalid date). */
export function relativeDay(ymd: string, today: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return "";
  const n = daysBetween(today, ymd);
  if (n < 0 || !Number.isFinite(n)) return "";
  if (n === 0) return "aujourd’hui";
  if (n === 1) return "demain";
  if (n === 2) return "après-demain";
  return `dans ${n} jours`;
}

/** "Vendredi · demain" (weekday + relative day), shown next to a JJ/MM/AAAA date. */
export function dayContext(ymd: string, today: string): string {
  return [capitalize(weekdayOf(ymd)), relativeDay(ymd, today)].filter(Boolean).join(" · ");
}

/** "2026-09-24" → "septembre 2026" */
export function formatMonth(ymd: string): string {
  if (!/^\d{4}-\d{2}/.test(ymd)) return ymd;
  const d = new Date(`${ymd.slice(0, 7)}-15T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

export const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Dates computed by the server (Paris time) so the page and the API agree. */
export type BuilderDates = { today: string; tomorrow: string; max: string };

/** "jeudi 25…" → "Jeudi 25…" */
export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Lines of an API answer ({ name, unit, qty }[]), ignoring anything malformed. */
export function parseLines(value: unknown): DeliveryLine[] {
  if (!Array.isArray(value)) return [];
  const out: DeliveryLine[] = [];
  for (const it of value) {
    if (!isObject(it) || typeof it.name !== "string" || !it.name.trim()) continue;
    const qty = typeof it.qty === "number" && Number.isFinite(it.qty) && it.qty >= 0 ? it.qty : 0;
    out.push({ name: it.name, unit: typeof it.unit === "string" ? it.unit : "", qty });
  }
  return out;
}

/** Frequent products of GET /api/frequent ({ name, unit, count }[]). */
export function parseFrequent(value: unknown): { name: string; unit: string; count?: number }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((it) =>
    isObject(it) && typeof it.name === "string" && it.name.trim()
      ? [
          {
            name: it.name,
            unit: typeof it.unit === "string" ? it.unit : "",
            count: typeof it.count === "number" ? it.count : undefined,
          },
        ]
      : [],
  );
}
