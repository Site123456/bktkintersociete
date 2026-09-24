/** Small formatting helpers shared by the server, the client and the PDF (no secrets). */

/** Lowercase, no accents, single spaces: for comparing and searching names. */
export function normalizeKey(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Every word of the query must appear in the name (any order, accents/case ignored). */
export function matchesQuery(name: string, query: string): boolean {
  const q = normalizeKey(query);
  if (!q) return true;
  const n = normalizeKey(name);
  return q.split(" ").every((w) => n.includes(w));
}

/** Ranking for search results: exact > starts with > word starts with > contains. */
export function searchScore(name: string, query: string): number {
  const q = normalizeKey(query);
  const n = normalizeKey(name);
  if (!q) return 0;
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.split(" ").some((w) => w.startsWith(q))) return 2;
  return 3;
}

/** "1 = 10KG" → "10 kg", "1 pack = 100 pcs" → "pack de 100 pcs"; unknown formats are kept. */
export function formatUnit(unit: string): string {
  const u = (unit || "").trim();
  if (!u) return "";
  const m = u.match(/^1\s*=\s*(.+)$/i);
  if (m) {
    const v = m[1].trim();
    const q = v.match(/^(\d+(?:[.,]\d+)?)\s*(KG|G|L|CL|ML)\b(.*)$/i);
    if (q) {
      const u2 = q[2].toLowerCase();
      return `${q[1].replace(".", ",")} ${u2 === "l" ? "L" : u2}${q[3]}`.trim();
    }
    if (/^kg$/i.test(v)) return "kg";
    return v;
  }
  const p = u.match(/^1\s+(\w+)\s*=\s*(.+)$/i);
  if (p) return `${p[1]} de ${p[2]}`;
  return u;
}

/** 1234.5 → "1 234,5" (French), integers without decimals. */
export function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n);
}

/** "2026-09-24" → "24/09/2026" */
export function formatDateFr(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return ymd || "";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-09-24" → "mercredi 24 septembre 2026" */
export function formatDateLong(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return ymd || "";
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** Date (Paris) as YYYY-MM-DD, `offsetDays` from today. */
export function ymdParis(offsetDays = 0): string {
  // Today's date in Paris, then whole calendar days (adding 24 h is wrong on daylight-saving days).
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const t = Date.parse(`${today}T12:00:00Z`) + offsetDays * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
