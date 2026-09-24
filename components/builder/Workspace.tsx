"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, Truck } from "lucide-react";
import { AppHeader, type AppRole } from "@/components/app/AppHeader";
import { PageHeader } from "@/components/app/PageHeader";
import { SiteGrid } from "@/components/app/SiteSwitcher";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMounted } from "@/hooks/use-local-draft";
import { normalizeKey, ymdParis } from "@/lib/format";
import type { DeliveryLine, DocKind, Product, SiteOption } from "@/types/delivery";
import { saveSite, toastError } from "./api";
import { DeliveryBuilder, type Recommend } from "./DeliveryBuilder";
import { formatMonth, type BuilderDates } from "./lines";
import { StockBuilder } from "./StockBuilder";

export type WorkspaceProps = {
  user: { name: string; role: AppRole; site: string | null };
  sites: SiteOption[];
  products: Product[];
  initialKind: DocKind;
  /** Dates in Paris time, computed by the server. */
  dates: BuilderDates;
  /** "Recommander": bon de livraison to copy. */
  initialFromId?: string;
  initialFromNumber?: string;
  initialLines?: DeliveryLine[];
};

/** Keeps the address in line with the screen (tab, copied document) without reloading the page. */
function syncUrl(kind: DocKind, fromId: string | null) {
  const params = new URLSearchParams();
  if (kind === "stock") params.set("kind", "stock");
  else if (fromId) params.set("from", fromId);
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
}

/** Placeholder while the saved draft is read from the browser (same shapes as the builder). */
function BuilderSkeleton() {
  return (
    <div
      className="grid gap-6 pb-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        Chargement…
      </p>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-11 w-40 rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="hidden h-80 rounded-xl lg:block" />
    </div>
  );
}

/** Main screen: choose the site if needed, then build a bon de livraison or an inventaire. */
export function Workspace({
  user,
  sites,
  products,
  initialKind,
  dates,
  initialFromId,
  initialFromNumber,
  initialLines,
}: WorkspaceProps) {
  // Drafts live in the browser: the builders render after hydration only.
  const mounted = useMounted();
  const router = useRouter();
  const [siteSlug, setSiteSlug] = useState<string | null>(user.site);
  const [kind, setKind] = useState<DocKind>(initialKind);
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [recommend, setRecommend] = useState<Recommend | null>(() =>
    initialFromId && initialFromNumber && initialLines?.length
      ? { id: initialFromId, number: initialFromNumber, lines: initialLines }
      : null,
  );

  // The address drives the tab: a navigation that keeps this screen mounted (e.g. "Nouveau" → "/") resets it.
  // syncUrl() below always writes an address matching the state, so it never undoes a choice made here.
  const params = useSearchParams();
  const urlKind: DocKind = params.get("kind") === "stock" ? "stock" : "bl";
  const urlFrom = params.get("from");
  const [seenUrl, setSeenUrl] = useState({ kind: urlKind, from: urlFrom });
  if (seenUrl.kind !== urlKind || seenUrl.from !== urlFrom) {
    setSeenUrl({ kind: urlKind, from: urlFrom });
    setKind(urlKind);
    // A bon de livraison address without this copy: "Recommander" is over.
    if (recommend && urlKind === "bl" && urlFrom !== recommend.id) setRecommend(null);
  }

  // Dates come from the server: after midnight (page left open), fetch fresh ones before they are used.
  const [datesPending, startDatesRefresh] = useTransition();
  const refreshedFor = useRef<string | null>(null);
  const today = dates.today;
  /** true when the day changed since the page was rendered: fresh dates are on their way (wait for them). */
  const checkDates = useCallback((): boolean => {
    if (datesPending) return true;
    const now = ymdParis(0);
    // Offline, a refresh would fall back to reloading the page: keep these dates until the connection is back.
    if (now === today || navigator.onLine === false) return false;
    // Already refreshed for this change and the server kept its date: trust it (the device clock is off).
    const change = `${today}>${now}`;
    if (refreshedFor.current === change) return false;
    refreshedFor.current = change;
    startDatesRefresh(() => router.refresh());
    return true;
  }, [datesPending, today, router]);

  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible") checkDates();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("online", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("online", onShow);
    };
  }, [checkDates]);

  const site = sites.find((s) => s.slug === siteSlug) ?? null;

  const chooseSite = (slug: string) => {
    const next = sites.find((s) => s.slug === slug);
    if (!next || slug === siteSlug) return;
    const first = site === null;
    setSiteSlug(slug);
    if (recommend) {
      setRecommend(null);
      syncUrl(kind, null);
    }
    if (!first) toast.success(`Site : ${next.shortName}`);
    saveSite(slug).catch((err: unknown) => toastError(err, "Le site n’a pas pu être enregistré"));
  };

  const changeKind = (value: string) => {
    const next: DocKind = value === "stock" ? "stock" : "bl";
    setKind(next);
    syncUrl(next, recommend?.id ?? null);
  };

  const recommendDone = () => {
    setRecommend(null);
    syncUrl(kind, null);
  };

  const addProduct = (p: Product) => {
    const key = normalizeKey(p.name);
    setCatalog((list) => (list.some((x) => normalizeKey(x.name) === key) ? list : [...list, p]));
  };

  const monthLabel = formatMonth(dates.today);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader
        active="new"
        role={user.role}
        site={site}
        sites={site ? sites : undefined}
        onSiteChange={site ? chooseSite : undefined}
      />

      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-8">
        {!site ? (
          <div className="space-y-6 pb-10">
            <PageHeader
              title="Choisissez votre site"
              description="Vos bons de livraison et inventaires seront faits pour ce restaurant. Vous pourrez en changer à tout moment."
            />
            <SiteGrid sites={sites} value={siteSlug} onSelect={chooseSite} />
          </div>
        ) : (
          <Tabs value={kind} onValueChange={changeKind} className="flex flex-1 flex-col gap-5 sm:gap-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <PageHeader
                title={kind === "bl" ? "Nouveau bon de livraison" : "Inventaire du mois"}
                description={
                  kind === "bl" ? (
                    <>
                      Articles à livrer à <span className="font-medium text-foreground">{site.shortName}</span>.
                    </>
                  ) : (
                    <>
                      Stock de <span className="font-medium text-foreground">{site.shortName}</span> pour {monthLabel}.
                    </>
                  )
                }
              />
              <TabsList aria-label="Type de document" className="h-11 w-full shrink-0 sm:h-10 sm:w-auto">
                <TabsTrigger value="bl" className="px-4">
                  <Truck aria-hidden />
                  Bon de livraison
                </TabsTrigger>
                <TabsTrigger value="stock" className="px-4">
                  <ClipboardList aria-hidden />
                  Inventaire
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="bl" className="flex flex-col">
              {mounted ? (
                <DeliveryBuilder
                  key={site.slug}
                  site={site}
                  products={catalog}
                  author={user.name}
                  dates={dates}
                  datesPending={datesPending}
                  checkDates={checkDates}
                  recommend={recommend}
                  onRecommendDone={recommendDone}
                  onProductCreated={addProduct}
                />
              ) : (
                <BuilderSkeleton />
              )}
            </TabsContent>
            <TabsContent value="stock" className="flex flex-col">
              {mounted ? (
                <StockBuilder
                  key={site.slug}
                  site={site}
                  products={catalog}
                  author={user.name}
                  dates={dates}
                  datesPending={datesPending}
                  checkDates={checkDates}
                  onProductCreated={addProduct}
                />
              ) : (
                <BuilderSkeleton />
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
