import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { getSitesMap } from "@/lib/deliveries";
import { badRequest, json, readBody, serverError } from "@/lib/http";
import { ROLES, User } from "@/lib/models";
import { objectId, siteSlug } from "@/lib/validation";
import { USER_FIELDS, listUsers, toAdminUser, type UserRow } from "@/app/admin/_lib/data";
import { adminGuard, logError } from "@/app/api/admin/_lib/guard";

/*
 * Staff accounts (admins only, Clerk session).
 * GET   → { ok, users: [{ _id, name, email, site, role, verified, createdAt }] }
 * PATCH { id, verified?, site?, role? } → { ok: true, user }   (site "" or null = no site)
 */

const patchSchema = z
  .object({
    id: objectId,
    verified: z.boolean().optional(),
    site: z.union([siteSlug, z.literal("")]).nullish(),
    role: z.enum(ROLES).optional(),
  })
  .refine((d) => d.verified !== undefined || d.site !== undefined || d.role !== undefined, {
    message: "Aucune modification",
  });

export async function GET(req: Request) {
  try {
    const guard = await adminGuard(req, "users");
    if (!guard.ok) return guard.response;
    return json({ ok: true, users: await listUsers() });
  } catch (err) {
    logError("GET /api/admin/users", err);
    return serverError();
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await adminGuard(req, "users");
    if (!guard.ok) return guard.response;

    const body = await readBody(req, patchSchema);
    if ("error" in body) return body.error;
    const { id, verified, role } = body.data;
    const site = body.data.site === null ? "" : body.data.site;

    // An admin cannot lock themselves out.
    if (String(guard.user._id) === id) {
      if (role !== undefined && role !== "admin") {
        return badRequest("Vous ne pouvez pas retirer votre propre rôle d’administrateur. Demandez à un autre admin.");
      }
      if (verified === false) {
        return badRequest("Vous ne pouvez pas retirer votre propre validation.");
      }
    }

    await connectDB();
    if (site) {
      const sites = await getSitesMap();
      if (!sites.has(site)) return badRequest("Site inconnu.");
    }

    const $set: { verified?: boolean; site?: string; role?: (typeof ROLES)[number] } = {};
    const $unset: { site?: 1 } = {};
    if (verified !== undefined) $set.verified = verified;
    if (role !== undefined) $set.role = role;
    if (site === "") $unset.site = 1;
    else if (site !== undefined) $set.site = site;

    const update: { $set?: typeof $set; $unset?: typeof $unset } = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    const user = await User.findByIdAndUpdate(id, update, {
      returnDocument: "after",
      runValidators: true,
      projection: USER_FIELDS,
    }).lean<UserRow>();
    if (!user) return json({ ok: false, error: "Personne introuvable. Rechargez la page." }, 404);

    return json({ ok: true, user: toAdminUser(user) });
  } catch (err) {
    logError("PATCH /api/admin/users", err);
    return serverError();
  }
}
