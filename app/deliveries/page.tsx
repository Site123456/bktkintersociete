import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { HistoryList } from "@/components/history/HistoryList";
import { HISTORY_PAGE_SIZE, type HistoryFilters } from "@/components/history/format";
import { requireVerifiedSession } from "@/lib/auth";
import { listDocuments, todayParis } from "@/lib/deliveries";
import { SITE_SLUG_RE } from "@/lib/sites";
import { getSiteOptions } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Historique",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

/** History of bons de livraison and états des stocks (validated staff only). */
export default async function DeliveriesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireVerifiedSession();
  if (!session.ok) redirect("/");

  const params = await searchParams;
  const siteParam = first(params.site).toUpperCase();
  const kindParam = first(params.kind);

  const sites = await getSiteOptions();
  const filters: HistoryFilters = {
    site: SITE_SLUG_RE.test(siteParam) && sites.some((s) => s.slug === siteParam) ? siteParam : null,
    kind: kindParam === "bl" || kindParam === "stock" ? kindParam : null,
  };
  const initial = await listDocuments({ site: filters.site, kind: filters.kind, limit: HISTORY_PAGE_SIZE });

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader active="history" role={session.user.role} />
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
        <HistoryList initial={initial} sites={sites} filters={filters} today={todayParis()} />
      </main>
    </div>
  );
}
