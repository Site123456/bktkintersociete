import "server-only";
import connectDB from "@/lib/connectDB";
import { getClerkProfile } from "@/lib/auth";
import { User, type UserDoc } from "@/lib/models";
import { getSitesMap } from "@/lib/deliveries";
import type { SiteOption } from "@/types/delivery";

/**
 * Database record of the signed-in person, created on the first visit. Name and e-mail always come
 * from Clerk (never from the browser). New accounts wait for an admin to validate them.
 */
export async function ensureUser(clerkId: string): Promise<UserDoc | null> {
  await connectDB();
  const existing = await User.findOne({ clerkId }).lean<UserDoc>();
  const profile = await getClerkProfile();
  if (!profile) return existing;
  const changes: Partial<UserDoc> = {};
  if (profile.email && profile.email !== existing?.email) changes.email = profile.email;
  if (profile.name && profile.name !== existing?.name) changes.name = profile.name;
  if (existing && Object.keys(changes).length === 0) return existing;
  return User.findOneAndUpdate(
    { clerkId },
    { $set: changes, $setOnInsert: { clerkId, verified: false, role: "employee" } },
    { new: true, upsert: true },
  ).lean<UserDoc>();
}

/** Sites for pickers, with the admin-edited addresses. */
export async function getSiteOptions(): Promise<SiteOption[]> {
  const map = await getSitesMap();
  return [...map.values()]
    .map((s) => ({ slug: s.slug, name: s.name, shortName: s.shortName, line1: s.line1, line2: s.line2 }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
