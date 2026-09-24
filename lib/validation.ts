import { z } from "zod";

/** Input rules shared by the website and the API. Limits keep documents small and requests sane. */

export const LIMITS = { lines: 300, name: 80, unit: 40, qty: 100_000, note: 500 } as const;

const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

export const productName = cleanText(LIMITS.name).pipe(z.string().min(1, "Nom requis"));
export const unitText = cleanText(LIMITS.unit);

export const lineSchema = z.object({
  name: productName,
  unit: unitText.optional().default(""),
  qty: z.coerce.number().finite().min(0).max(LIMITS.qty).transform((n) => Math.round(n * 1000) / 1000),
});
export type LineInput = z.infer<typeof lineSchema>;

export const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date AAAA-MM-JJ");
export const siteSlug = z.string().regex(/^[A-Z0-9_-]{2,16}$/, "Site invalide");
export const docKind = z.enum(["bl", "stock"]);

/** A new delivery note or stock sheet, as sent by the website. */
export const newDocumentSchema = z.object({
  kind: docKind,
  site: siteSlug,
  requestedDate: ymd.optional(),
  note: cleanText(LIMITS.note).optional(),
  lines: z.array(lineSchema).min(1, "Ajoutez au moins un article").max(LIMITS.lines),
});
export type NewDocumentInput = z.infer<typeof newDocumentSchema>;

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i);

export const newProductSchema = z.object({
  name: productName,
  unit: unitText.optional(),
});
