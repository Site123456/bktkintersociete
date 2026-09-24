"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, Info, RefreshCw, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalDraft } from "@/hooks/use-local-draft";
import type { Product, SiteOption } from "@/types/delivery";
import { ApiError, apiFetch, saveProductInBackground, toastError } from "./api";
import { BuilderLayout, ProductSearch, SEARCH_ID } from "./BuilderLayout";
import { LinesCard } from "./LinesCard";
import {
  capitalize,
  countLabel,
  formatMonth,
  isStockDraft,
  linesToSend,
  newLineId,
  parseLines,
  plural,
  totalsOf,
  withIds,
  type BuilderDates,
  type StockDraft,
} from "./lines";
import { ReviewDialog, type ReviewData, type ReviewPhase } from "./ReviewDialog";
import { useLineList, type UpdateLines } from "./use-line-list";
import { useSlashFocus } from "./use-slash-focus";

export type StockBuilderProps = {
  site: SiteOption;
  products: Product[];
  author: string;
  dates: BuilderDates;
  onProductCreated: (p: Product) => void;
};

type Created = { ok: true; id: string; number: string };

const SKELETON_WIDTHS = ["58%", "42%", "66%", "50%", "37%"];

/** Placeholder rows while the month's orders load. */
function LinesSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-busy="true">
      <p className="sr-only" role="status">
        Chargement des commandes du mois…
      </p>
      <div className="flex min-h-12 items-center border-b px-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {SKELETON_WIDTHS.map((w, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-3 w-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4" style={{ width: w }} />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="hidden h-9 w-32 shrink-0 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Builder of the monthly état des stocks, prefilled with what the site ordered this month. */
export function StockBuilder({ site, products, author, dates, onProductCreated }: StockBuilderProps) {
  const router = useRouter();
  const month = dates.today.slice(0, 7);
  const monthLabel = formatMonth(dates.today);

  const initial: StockDraft = { v: 1, month, seeded: false, prefilled: false, lines: [] };
  // A sheet started another month is not reused.
  const validate = (v: unknown): v is StockDraft => isStockDraft(v) && v.month === month;
  const [draft, setDraft, clearDraft] = useLocalDraft<StockDraft>(`bktk:draft:stock:${site.slug}`, initial, validate);

  // Any change by hand means the month's orders must not overwrite the list any more.
  const updateLines: UpdateLines = (fn) => setDraft((d) => ({ ...d, seeded: true, lines: fn(d.lines) }));
  const list = useLineList(draft.lines, updateLines, "count");
  useSlashFocus(SEARCH_ID);

  // Prefill with the quantities ordered this month (starting point for the count).
  const [recapError, setRecapError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const needsRecap = !draft.seeded;
  const loading = needsRecap && recapError === null;

  useEffect(() => {
    if (!needsRecap) return;
    const ctrl = new AbortController();
    apiFetch<{ ok: true; items?: unknown }>(`/api/stock-recap?site=${encodeURIComponent(site.slug)}`, { signal: ctrl.signal })
      .then((body) => {
        const items = parseLines(body?.items).filter((l) => l.qty > 0);
        const prefix = newLineId();
        setDraft((d) => (d.seeded ? d : { ...d, seeded: true, prefilled: items.length > 0, lines: withIds(items, prefix) }));
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setRecapError(err instanceof ApiError ? err.message : "Erreur inconnue.");
      });
    return () => ctrl.abort();
  }, [needsRecap, site.slug, attempt, setDraft]);

  const retryRecap = () => {
    setRecapError(null);
    setAttempt((n) => n + 1);
  };

  /** Start again from the month's orders (offered when the list is empty). */
  const reloadRecap = () => {
    setRecapError(null);
    setDraft((d) => ({ ...d, seeded: false, prefilled: false, lines: [] }));
  };

  const clearAll = () => setDraft((d) => ({ ...d, seeded: true, prefilled: false, lines: [] }));

  const onCreate = (name: string, unit: string) => {
    list.add({ name, unit });
    onProductCreated({ name, unit, custom: true });
    saveProductInBackground(name, unit);
  };

  const totals = totalsOf(draft.lines);
  const canSend = totals.articles > 0;
  const zeroText =
    totals.zero > 0
      ? `${countLabel(totals.zero)} à 0 ${plural(totals.zero, "reste visible mais ne sera pas envoyé", "restent visibles mais ne seront pas envoyés")}.`
      : undefined;
  const hint = !canSend ? "Indiquez au moins une quantité supérieure à 0." : zeroText;

  // Review and send
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [phase, setPhase] = useState<ReviewPhase>("idle");
  const [sent, setSent] = useState<{ id: string; number: string } | null>(null);

  const openReview = () => {
    if (!canSend) return;
    const lines = linesToSend(draft.lines);
    setReview({
      kind: "stock",
      site,
      requestedDate: null,
      monthLabel,
      author,
      note: "",
      lines,
      dropped: draft.lines.length - lines.length,
    });
    setPhase("idle");
    setReviewOpen(true);
  };

  const send = async () => {
    if (!review || phase !== "idle") return;
    setPhase("sending");
    try {
      const res = await apiFetch<Created>("/api/documents", {
        method: "POST",
        body: { kind: "stock", site: review.site.slug, lines: review.lines },
      });
      if (typeof res?.id !== "string" || typeof res.number !== "string") throw new ApiError(500, "Réponse inattendue du serveur.");
      clearDraft();
      setSent({ id: res.id, number: res.number });
      setPhase("sent");
      toast.success(`Inventaire ${res.number} envoyé`);
      router.push(`/pdf?id=${encodeURIComponent(res.id)}`);
    } catch (err) {
      setPhase("idle");
      toastError(err, "L’inventaire n’a pas été envoyé");
    }
  };

  let listArea;
  if (draft.lines.length === 0 && loading) {
    listArea = <LinesSkeleton />;
  } else if (draft.lines.length === 0 && needsRecap && recapError) {
    listArea = (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-4 text-sm shadow-sm">
        <p className="font-medium">Les commandes du mois n’ont pas pu être chargées</p>
        <p className="mt-1 text-muted-foreground">{recapError}</p>
        <p className="mt-1 text-muted-foreground">Vous pouvez aussi ajouter les articles comptés avec la recherche.</p>
        <Button type="button" variant="outline" className="mt-3 h-11 sm:h-9" onClick={retryRecap}>
          <RefreshCw aria-hidden />
          Réessayer
        </Button>
      </div>
    );
  } else {
    listArea = (
      <LinesCard
        title="Stock compté"
        lines={draft.lines}
        list={list}
        muteZero
        intro={
          draft.prefilled ? (
            <p className="flex items-start gap-2 border-b bg-info/5 px-4 py-2.5 text-sm text-info">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Quantités commandées ce mois-ci — ajustez avec le stock réel.</span>
            </p>
          ) : null
        }
        footer={
          zeroText ? <p className="border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">{zeroText}</p> : null
        }
        empty={
          <EmptyState
            icon={ClipboardList}
            title="Aucun article compté"
            description={`Recherchez les produits en stock à ${site.shortName} pour les ajouter, ou repartez des commandes du mois.`}
            action={
              <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={reloadRecap}>
                <RotateCcw aria-hidden />
                Reprendre les commandes du mois
              </Button>
            }
          />
        }
        clear={{
          title: "Vider l’inventaire ?",
          description: `${countLabel(draft.lines.length)} ${plural(draft.lines.length, "sera retiré", "seront retirés")} de la liste. Cette action est définitive.`,
          onConfirm: clearAll,
        }}
      />
    );
  }

  return (
    <>
      <BuilderLayout
        summary={{
          kind: "stock",
          site,
          dateCaption: "Inventaire de",
          dateLong: capitalize(monthLabel),
          dateShort: monthLabel,
          author,
          totals,
          hint,
          disabled: !canSend,
          onReview: openReview,
        }}
      >
        <ProductSearch products={products} label="Rechercher un produit à compter" onPick={list.add} onCreate={onCreate} />
        {listArea}
      </BuilderLayout>

      <ReviewDialog
        open={reviewOpen}
        data={review}
        phase={phase}
        sent={sent}
        onClose={() => setReviewOpen(false)}
        onConfirm={send}
      />
    </>
  );
}
