/**
 * Restaurant sites that receive delivery notes. The addresses printed on the PDF come from the
 * database (editable by an admin) and fall back to this list.
 * Safe to import from client components (no secrets).
 */

export type SiteInfo = { slug: string; name: string; shortName: string; line1: string; line2: string };

export const DEFAULT_SITES: SiteInfo[] = [
  { slug: "BKTK01", shortName: "INS Paris 15", name: "INDIAN NEPALI SWAD PARIS", line1: "4 Rue Bargue", line2: "75015 Paris, France" },
  { slug: "BKTK02", shortName: "INS Bordeaux", name: "INDIAN NEPALI SWAD BORDEAUX", line1: "170 Cours du Médoc", line2: "33000 Bordeaux, France" },
  { slug: "BKTK03", shortName: "INS Courbevoie", name: "INDIAN NEPALI SWAD COURBEVOIE", line1: "13 Rue Latérale", line2: "92400 Courbevoie, France" },
  { slug: "BKTK04", shortName: "INS Saint-Ouen", name: "INDIAN NEPALI SWAD SAINT-OUEN", line1: "12 Rue Palouzie", line2: "93400 Saint-Ouen, France" },
  { slug: "BKTK05", shortName: "INS Bagneux", name: "INDIAN NEPALI SWAD BAGNEUX", line1: "5 Allée du Parc de Garlande", line2: "92220 Bagneux, France" },
  { slug: "BKTK06", shortName: "INS Ivry", name: "INDIAN NEPALI SWAD IVRY", line1: "11 Rue Moïse", line2: "94200 Ivry-sur-Seine, France" },
  { slug: "BKTK07", shortName: "INS Aubervilliers", name: "INDIAN NEPALI SWAD AUBERVILLIERS", line1: "79 Rue du Landy", line2: "93300 Aubervilliers, France" },
  { slug: "BKTK08", shortName: "Koseli Buffet", name: "KOSELI BUFFET", line1: "197 Avenue Paul Vaillant Couturier", line2: "93120 La Courneuve, France" },
];

/** Legacy export (name → address block) kept for older imports. */
export const SITE_HEADERS: Record<string, { name: string; line1: string; line2: string }> = Object.fromEntries(
  DEFAULT_SITES.map((s) => [s.slug, { name: s.name, line1: s.line1, line2: s.line2 }]),
);

export const SITE_SLUG_RE = /^[A-Z0-9_-]{2,16}$/;

export function defaultSite(slug?: string | null): SiteInfo | null {
  if (!slug) return null;
  return DEFAULT_SITES.find((s) => s.slug === slug) ?? null;
}

/** The issuing company, printed on every document. */
export const COMPANY = {
  name: "BKTK INTERNATIONAL",
  line1: "1 Avenue Louis Blériot, Local A22",
  line2: "93120 La Courneuve – France",
  phone: "+33 9 77 37 61 67",
};
