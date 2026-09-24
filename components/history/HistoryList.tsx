"use client";

import { useDeferredValue, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSearch, Inbox, Plus, Search, X } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { matchesQuery } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryView, SiteOption } from "@/types/delivery";
import { DocumentSheet } from "./DocumentSheet";
import { HistoryRow } from "./HistoryRow";
import { HISTORY_PAGE_SIZE, dayLabel, parisDay, type HistoryFilters } from "./format";


export type HistoryListProps = {
  /** First page for the current filters, newest first. */
  initial: DeliveryView[];
  sites: SiteOption[];
  filters: HistoryFilters;
  /** Today in Paris (YYYY-MM-DD), from the server, for "Aujourd'hui" / "Hier". */
  today: string;
};

type ListResponse = { ok: true; documents: DeliveryView[]; nextBefore: string | null };
type MorePages = { base: DeliveryView[]; docs: DeliveryView[]; next: string | null };

const ALL = "all";
/** Segmented control: shorter label for "bons de livraison" on phones. */
const KINDS: { value: string; label: string; short?: string }[] = [
  { value: ALL, label: "Tous" },
  { value: "bl", label: "Bons de livraison", short: "Livraisons" },
  { value: "stock", label: "Inventaires" },
];

function isListResponse(v: unknown): v is ListResponse {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return r.ok === true && Array.isArray(r.documents) && (r.nextBefore === null || typeof r.nextBefore === "string");
}

function errorText(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const e = (v as Record<string, unknown>).error;
  return typeof e === "string" && e ? e : null;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Words searched for each document: number, site, author and product names. */
const searchText = (d: DeliveryView) =>
  [d.number, d.siteShortName, d.siteName, d.siteSlug ?? "", d.author, ...d.lines.map((l) => l.name)].join(" ");

type Group = { key: string; label: string; docs: DeliveryView[] };

function groupByDay(docs: DeliveryView[], today: string): Group[] {
  const groups: Group[] = [];
  for (const d of docs) {
    const key = parisDay(d.createdAt) || d.date || "";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.docs.push(d);
    else groups.push({ key, label: dayLabel(key, today), docs: [d] });
  }
  return groups;
}

/** History page body: filters (URL driven), search in the loaded documents, day groups, preview sheet, paging. */
export function HistoryList({ initial, sites, filters, today }: HistoryListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shown, setShownFilters] = useOptimistic(filters);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // Pages loaded with "Charger plus" belong to one server list: new server props start over.
  const [more, setMore] = useState<MorePages | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const extra = more && more.base === initial ? more : null;

  const [sheetDoc, setSheetDoc] = useState<DeliveryView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const docs = useMemo(() => {
    if (!extra) return initial;
    const seen = new Set(initial.map((d) => d.id));
    return [...initial, ...extra.docs.filter((d) => !seen.has(d.id))];
  }, [initial, extra]);
  const nextBefore = extra ? extra.next : initial.length >= HISTORY_PAGE_SIZE ? initial[initial.length - 1].id : null;

  const indexed = useMemo(() => docs.map((doc) => ({ doc, text: searchText(doc) })), [docs]);
  const searching = deferredQuery.trim() !== "";
  const visible = useMemo(
    () => (searching ? indexed.filter((x) => matchesQuery(x.text, deferredQuery)).map((x) => x.doc) : docs),
    [indexed, docs, searching, deferredQuery],
  );
  const groups = useMemo(() => groupByDay(visible, today), [visible, today]);

  const hasFilters = Boolean(shown.site || shown.kind);

  const applyFilters = (next: HistoryFilters) => {
    const params = new URLSearchParams();
    if (next.site) params.set("site", next.site);
    if (next.kind) params.set("kind", next.kind);
    const qs = params.toString();
    startTransition(() => {
      setShownFilters(next);
      router.replace(qs ? `/deliveries?${qs}` : "/deliveries", { scroll: false });
    });
  };

  const loadMore = async () => {
    if (!nextBefore || loadingMore) return;
    const base = initial;
    const previous = extra?.docs ?? [];
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ before: nextBefore, limit: String(HISTORY_PAGE_SIZE) });
      if (filters.site) params.set("site", filters.site);
      if (filters.kind) params.set("kind", filters.kind);
      const res = await fetch(`/api/documents?${params.toString()}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const data: unknown = await res.json().catch(() => null);
      if (res.status === 401) {
        toast.error("Session expirée", { description: "Reconnectez-vous pour voir la suite." });
        return;
      }
      if (!res.ok || !isListResponse(data)) {
        toast.error(errorText(data) ?? "Impossible de charger la suite. Réessayez.");
        return;
      }
      setMore({ base, docs: [...previous, ...data.documents], next: data.nextBefore });
    } catch {
      toast.error("Connexion impossible. Vérifiez le réseau et réessayez.");
    } finally {
      setLoadingMore(false);
    }
  };

  const openDoc = (doc: DeliveryView) => {
    setSheetDoc(doc);
    setSheetOpen(true);
  };

  const status = searching
    ? `${plural(visible.length, "résultat")} sur ${plural(docs.length, "document")} chargé${docs.length > 1 ? "s" : ""}`
    : nextBefore
      ? `${docs.length} documents les plus récents`
      : plural(docs.length, "document");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique"
        description="Retrouvez, téléchargez ou recommandez un bon de livraison ou un inventaire."
        actions={
          <Button asChild className="h-11 sm:h-9">
            <Link href="/">
              <Plus aria-hidden />
              Nouveau bon
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <section aria-label="Filtres" className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={shown.site ?? ALL}
              onValueChange={(v) => applyFilters({ ...shown, site: v === ALL ? null : v })}
            >
              <SelectTrigger
                aria-label="Site"
                className="w-full bg-card data-[size=default]:h-11 sm:w-56 sm:data-[size=default]:h-9"
              >
                <SelectValue placeholder="Tous les sites" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80">
                <SelectItem value={ALL} className="min-h-11 sm:min-h-8">
                  Tous les sites
                </SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.slug} value={s.slug} className="min-h-11 sm:min-h-8">
                    {s.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              variant="outline"
              aria-label="Type de document"
              value={shown.kind ?? ALL}
              onValueChange={(v) => {
                if (!v) return;
                applyFilters({ ...shown, kind: v === "bl" || v === "stock" ? v : null });
              }}
              className="w-full bg-card sm:w-fit"
            >
              {KINDS.map((k) => (
                <ToggleGroupItem key={k.value} value={k.value} className="h-11 flex-auto px-3 sm:h-9 sm:flex-none">
                  {k.short ? (
                    <>
                      <span className="sm:hidden">{k.short}</span>
                      <span className="hidden sm:inline">{k.label}</span>
                    </>
                  ) : (
                    k.label
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="relative min-w-0 lg:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="N°, site, auteur ou produit…"
              aria-label="Rechercher dans les documents chargés"
              enterKeyHint="search"
              autoComplete="off"
              maxLength={80}
              className="h-11 bg-card pr-11 pl-9 sm:h-9 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-8"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {isPending ? <Spinner className="size-3.5" aria-hidden /> : null}
          <p aria-live="polite">{isPending ? "Chargement…" : status}</p>
        </div>
      </section>

      {/* List */}
      <div aria-busy={isPending} className={cn("transition-opacity", isPending && "pointer-events-none opacity-60")}>
        {docs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aucun document"
            description={
              hasFilters ? "Aucun document ne correspond à ces filtres." : "Les bons de livraison et inventaires envoyés apparaîtront ici."
            }
            action={
              hasFilters ? (
                <Button variant="outline" className="h-11 sm:h-9" onClick={() => applyFilters({ site: null, kind: null })}>
                  Effacer les filtres
                </Button>
              ) : (
                <Button asChild className="h-11 sm:h-9">
                  <Link href="/">
                    <Plus aria-hidden />
                    Nouveau bon
                  </Link>
                </Button>
              )
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="Aucun résultat"
            description={`Aucun document chargé ne correspond à « ${deferredQuery.trim()} ».${nextBefore ? " Chargez plus de documents pour chercher plus loin." : ""}`}
            action={
              <>
                <Button variant="outline" className="h-11 sm:h-9" onClick={() => setQuery("")}>
                  Effacer la recherche
                </Button>
                {nextBefore ? (
                  <Button variant="outline" className="h-11 sm:h-9" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? <Spinner aria-hidden /> : null}
                    Charger plus
                  </Button>
                ) : null}
              </>
            }
          />
        ) : (
          <div className="space-y-6">
            {groups.map((g, i) => (
              <section key={`${g.key}-${i}`} aria-labelledby={`day-${i}`}>
                <h2
                  id={`day-${i}`}
                  className="sticky top-14 z-10 flex items-baseline gap-2 bg-background/85 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur-md"
                >
                  {g.label}
                  <span className="tabular font-normal">{g.docs.length}</span>
                </h2>
                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {g.docs.map((d) => (
                    <HistoryRow key={d.id} doc={d} query={searching ? deferredQuery : ""} onOpen={openDoc} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {docs.length > 0 && visible.length > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            {nextBefore ? (
              <Button
                variant="outline"
                className="h-11 w-full sm:h-9 sm:w-auto sm:min-w-48"
                onClick={loadMore}
                disabled={loadingMore || isPending}
              >
                {loadingMore ? <Spinner aria-hidden /> : null}
                {loadingMore ? "Chargement…" : "Charger plus"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Tous les documents sont affichés.</p>
            )}
          </div>
        ) : null}
      </div>

      <DocumentSheet doc={sheetDoc} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
