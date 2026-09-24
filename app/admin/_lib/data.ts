import "server-only";
import type { Types } from "mongoose";
import connectDB from "@/lib/connectDB";
import { CustomProduct, User, type CustomProductDoc, type UserDoc } from "@/lib/models";
import { getSiteOptions } from "@/lib/users";
import { isAdminRole, type AdminProduct, type AdminUser } from "@/components/admin/types";
import type { SiteOption } from "@/types/delivery";

/*
 * Data of the admin area, shared by the page (first render) and the /api/admin routes.
 * Only the fields the admin screens need are read: never the push token or the Clerk id.
 */

/** Upper bounds: the team is a few dozen people and products, this only guards against runaway data. */
const MAX_USERS = 2000;
const MAX_PRODUCTS = 2000;

export const USER_FIELDS = { name: 1, email: 1, site: 1, role: 1, verified: 1, createdAt: 1 } as const;
export type UserRow = Pick<UserDoc, "_id" | "name" | "email" | "site" | "role" | "verified" | "createdAt">;

export const PRODUCT_FIELDS = { uniquename: 1, typedequantite: 1, createdAt: 1 } as const;
export type ProductRow = Pick<CustomProductDoc, "_id" | "uniquename" | "typedequantite" | "createdAt">;

/** createdAt, or the creation time held by the ObjectId for older records. */
function createdIso(createdAt: Date | undefined, id: Types.ObjectId): string | null {
  const d = createdAt ? new Date(createdAt) : id?.getTimestamp?.();
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

export function toAdminUser(u: UserRow): AdminUser {
  return {
    _id: String(u._id),
    name: u.name ?? "",
    email: u.email ?? "",
    site: u.site || null,
    role: isAdminRole(u.role) ? u.role : "employee",
    verified: u.verified === true,
    createdAt: createdIso(u.createdAt, u._id),
  };
}

export function toAdminProduct(p: ProductRow): AdminProduct {
  return {
    _id: String(p._id),
    name: p.uniquename,
    unit: p.typedequantite ?? "",
    createdAt: createdIso(p.createdAt, p._id),
  };
}

/** Everyone, newest accounts first. */
export async function listUsers(): Promise<AdminUser[]> {
  await connectDB();
  const rows = await User.find({}, USER_FIELDS).sort({ createdAt: -1, _id: -1 }).limit(MAX_USERS).lean<UserRow[]>();
  return rows.map(toAdminUser);
}

/** Products added by the team, newest first. */
export async function listCustomProducts(): Promise<AdminProduct[]> {
  await connectDB();
  const rows = await CustomProduct.find({}, PRODUCT_FIELDS)
    .sort({ createdAt: -1, _id: -1 })
    .limit(MAX_PRODUCTS)
    .lean<ProductRow[]>();
  return rows.map(toAdminProduct);
}

/** Sites with the addresses printed on the PDFs (database values, falling back to the built-in list). */
export async function listSites(): Promise<SiteOption[]> {
  await connectDB();
  return getSiteOptions();
}
