import "server-only";
import connectDB from "@/lib/connectDB";
import { CustomProduct } from "@/lib/models";
import produitsRaw from "@/data/produits.json";
import type { Product } from "@/types/delivery";
import { normalizeKey } from "@/lib/format";

/**
 * Product catalogue = the built-in list (data/produits.json) + products added by the team.
 * The same name can exist in several packagings (e.g. ATTA 5KG and ATTA 10KG).
 */
const BUILT_IN: Product[] = (produitsRaw as { uniquename: string; typedequantite: string }[]).map((p) => ({
  name: p.uniquename.trim(),
  unit: (p.typedequantite || "").trim(),
}));

export async function getCatalog(): Promise<Product[]> {
  const out = [...BUILT_IN];
  const names = new Set(out.map((p) => normalizeKey(p.name)));
  try {
    await connectDB();
    const custom = await CustomProduct.find({}, { uniquename: 1, typedequantite: 1, _id: 0 }).lean();
    for (const c of custom) {
      const key = normalizeKey(c.uniquename);
      if (!key || names.has(key)) continue;
      names.add(key);
      out.push({ name: c.uniquename, unit: c.typedequantite || "Pièce", custom: true });
    }
  } catch (err) {
    console.error("Catalogue: custom products unavailable:", err instanceof Error ? err.message : err);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

export function isBuiltIn(name: string): boolean {
  const key = normalizeKey(name);
  return BUILT_IN.some((p) => normalizeKey(p.name) === key);
}

/** Adds a team product if no product with the same name exists (case and accents ignored). */
export async function addCustomProduct(name: string, unit?: string): Promise<{ created: boolean }> {
  if (isBuiltIn(name)) return { created: false };
  await connectDB();
  const existing = await CustomProduct.findOne({ uniquename: name }).collation({ locale: "fr", strength: 1 }).lean();
  if (existing) return { created: false };
  await CustomProduct.create(unit ? { uniquename: name, typedequantite: unit } : { uniquename: name });
  return { created: true };
}
