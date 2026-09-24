import { formatDateLong, formatQty } from "@/lib/format";
import type { DeliveryView, DocKind } from "@/types/delivery";

/** Display helpers for the history and document pages (client-safe, deterministic: no "now"). */

/** Documents per page (server page and "Charger plus"). */
export const HISTORY_PAGE_SIZE = 30;

/** History filters, kept in the URL (?site=BKTK01&kind=bl). */
export type HistoryFilters = { site: string | null; kind: DocKind | null };

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

const toDate = (iso: string): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Paris calendar day (YYYY-MM-DD) of an ISO time; plain dates are returned as they are. */
export function parisDay(iso: string): string {
  if (YMD_RE.test(iso)) return iso;
  const d = toDate(iso);
  return d ? dayFormat.format(d) : "";
}

/** Paris time "HH:mm" of an ISO time ("" when only a date is known). */
export function parisTime(iso: string): string {
  if (YMD_RE.test(iso)) return "";
  const d = toDate(iso);
  return d ? timeFormat.format(d) : "";
}

/** "2026-09-24" + (-1) → "2026-09-23". */
export function shiftYmd(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T12:00:00Z`);
  return Number.isNaN(t) ? "" : new Date(t + days * DAY_MS).toISOString().slice(0, 10);
}

/** "Aujourd'hui", "Hier", else "Mercredi 23 septembre" (the year only when it is not the current one). */
export function dayLabel(ymd: string, today: string): string {
  if (!ymd) return "Date inconnue";
  if (ymd === today) return "Aujourd’hui";
  if (ymd === shiftYmd(today, -1)) return "Hier";
  let label = formatDateLong(ymd);
  if (ymd.slice(0, 4) === today.slice(0, 4)) label = label.replace(/\s\d{4}$/, "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "1 article", "12 articles", "1,5 unité", "34 unités". */
export function countLabel(n: number, word: string): string {
  return `${formatQty(n)} ${word}${Math.abs(n) >= 2 ? "s" : ""}`;
}

/** Number of lines and total quantity of a document. */
export function docTotals(doc: DeliveryView): { articles: number; units: number } {
  let articles = 0;
  let units = 0;
  for (const l of doc.lines) {
    if (!l.name.trim()) continue;
    articles++;
    if (Number.isFinite(l.qty)) units += l.qty;
  }
  return { articles, units: Math.round(units * 1000) / 1000 };
}

export const kindLabel = (kind: DocKind) => (kind === "stock" ? "État des stocks" : "Bon de livraison");

export const pdfUrl = (id: string, download = false) =>
  `/api/pdf?id=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;
export const pageUrl = (id: string) => `/pdf?id=${encodeURIComponent(id)}`;
export const reorderUrl = (id: string) => `/?from=${encodeURIComponent(id)}`;
