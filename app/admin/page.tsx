import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { isAdminTab, type AdminTab } from "@/components/admin/types";
import { AppHeader } from "@/components/app/AppHeader";
import { requireVerifiedSession } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { listCustomProducts, listSites, listUsers } from "./_lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Admin area (validated admins only): staff, team products and site addresses. */
export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireVerifiedSession(["admin"]);
  if (!session.ok) redirect("/");

  const { tab } = await searchParams;
  const initialTab: AdminTab = isAdminTab(tab) ? tab : "personnel";

  const [users, sites, catalog, products] = await Promise.all([listUsers(), listSites(), getCatalog(), listCustomProducts()]);
  const builtIn = catalog.filter((p) => !p.custom).map((p) => ({ name: p.name, unit: p.unit }));

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader active="admin" role="admin" />
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
        <AdminDashboard
          initialTab={initialTab}
          users={users}
          products={products}
          builtIn={builtIn}
          sites={sites}
          currentUserId={String(session.user._id)}
        />
      </main>
    </div>
  );
}
