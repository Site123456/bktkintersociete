import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { findCustomNamed, isBuiltIn } from "@/lib/catalog";
import { normalizeKey } from "@/lib/format";
import { badRequest, json, readBody, serverError } from "@/lib/http";
import { CustomProduct } from "@/lib/models";
import { objectId, productName, unitText } from "@/lib/validation";
import { PRODUCT_FIELDS, listCustomProducts, toAdminProduct, type ProductRow } from "@/app/admin/_lib/data";
import { adminGuard, isDuplicateKey, logError } from "@/app/api/admin/_lib/guard";

/*
 * Products added by the team (admins only, Clerk session). The built-in list (data/produits.json)
 * is part of the app and read-only.
 * GET    → { ok, products: [{ _id, name, unit, createdAt }] }
 * PATCH  { id, name?, unit? } → { ok: true, product }   (unit "" = no unit)
 * DELETE ?id= → { ok: true }
 */

const patchSchema = z
  .object({
    id: objectId,
    name: productName.optional(),
    unit: unitText.optional(),
  })
  .refine((d) => d.name !== undefined || d.unit !== undefined, { message: "Aucune modification" });

const notFound = () => json({ ok: false, error: "Produit introuvable. Il a peut-être déjà été supprimé." }, 404);
const duplicate = (name: string) => badRequest(`Un produit « ${name} » existe déjà.`);

export async function GET(req: Request) {
  try {
    const guard = await adminGuard(req, "products");
    if (!guard.ok) return guard.response;
    return json({ ok: true, products: await listCustomProducts() });
  } catch (err) {
    logError("GET /api/admin/products", err);
    return serverError();
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await adminGuard(req, "products");
    if (!guard.ok) return guard.response;

    const body = await readBody(req, patchSchema);
    if ("error" in body) return body.error;
    const { id, name, unit } = body.data;

    await connectDB();
    const current = await CustomProduct.findById(id, PRODUCT_FIELDS).lean<ProductRow>();
    if (!current) return notFound();

    const $set: { uniquename?: string; typedequantite?: string } = {};
    const $unset: { typedequantite?: 1 } = {};

    if (name !== undefined && name !== current.uniquename) {
      // Only a real change of name is checked (a case-only change keeps the same key).
      if (normalizeKey(name) !== normalizeKey(current.uniquename) && isBuiltIn(name)) {
        return badRequest(`« ${name} » fait déjà partie du catalogue de l’application.`);
      }
      const other = await findCustomNamed(name, String(current._id));
      if (other) return duplicate(other.uniquename);
      $set.uniquename = name;
    }
    if (unit !== undefined) {
      if (unit) $set.typedequantite = unit;
      else $unset.typedequantite = 1;
    }

    const update: { $set?: typeof $set; $unset?: typeof $unset } = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    if (!update.$set && !update.$unset) return json({ ok: true, product: toAdminProduct(current) });

    let product: ProductRow | null;
    try {
      product = await CustomProduct.findByIdAndUpdate(id, update, {
        returnDocument: "after",
        runValidators: true,
        projection: PRODUCT_FIELDS,
      }).lean<ProductRow>();
    } catch (err) {
      if (isDuplicateKey(err)) return duplicate(name ?? current.uniquename);
      throw err;
    }
    if (!product) return notFound();
    return json({ ok: true, product: toAdminProduct(product) });
  } catch (err) {
    logError("PATCH /api/admin/products", err);
    return serverError();
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await adminGuard(req, "products");
    if (!guard.ok) return guard.response;

    const id = objectId.safeParse(new URL(req.url).searchParams.get("id") ?? "");
    if (!id.success) return badRequest("Produit invalide.");

    await connectDB();
    const res = await CustomProduct.deleteOne({ _id: id.data });
    if (res.deletedCount === 0) return notFound();
    return json({ ok: true });
  } catch (err) {
    logError("DELETE /api/admin/products", err);
    return serverError();
  }
}
