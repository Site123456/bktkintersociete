/** Shapes shared by the admin page, its client components and the /api/admin routes (client-safe). */

/** Same values as ROLES in lib/models (repeated here: lib/models is server-only). */
export const ADMIN_ROLES = ["employee", "manager", "admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  employee: "Employé",
  manager: "Manager",
  admin: "Admin",
};

export const isAdminRole = (v: unknown): v is AdminRole =>
  typeof v === "string" && (ADMIN_ROLES as readonly string[]).includes(v);

/** A person as listed in the admin area (never the push token). */
export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  /** Site code, e.g. BKTK01; null when no site is assigned. */
  site: string | null;
  role: AdminRole;
  verified: boolean;
  /** ISO date of the first sign-in. */
  createdAt: string | null;
};

/** A product added by the team (stored in the database). */
export type AdminProduct = {
  _id: string;
  name: string;
  unit: string;
  /** ISO date the product was added. */
  createdAt: string | null;
};

/** A product of the built-in list (data/produits.json), read-only. */
export type BuiltInProduct = { name: string; unit: string };

export const ADMIN_TABS = ["personnel", "produits", "sites"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export const isAdminTab = (v: unknown): v is AdminTab =>
  typeof v === "string" && (ADMIN_TABS as readonly string[]).includes(v);
