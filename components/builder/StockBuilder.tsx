"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, ClipboardList, Info, RefreshCw, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalDraft } from "@/hooks/use-local-draft";
import type { Product, SiteOption } from "@/types/delivery";
import { ApiError, apiFetch, isNetworkError, saveProductInBackground, toastError } from "./api";
import { BuilderLayout, ProductSearch, SEARCH_ID } from "./BuilderLayout";
import { LinesCard } from "./LinesCard";
import {
  capitalize,
  countLabel,
  formatMonth,
  isStockDraft,
  linesToSend,
  newLineId,
  newRequestId,
  parseLines,
  plural,
  totalsOf,
  withIds,
  type BuilderDates,
  type BuilderLine,
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
  /** Fresh dates are being fetched (the day changed while the page was open). */
  datesPending: boolean;
  /** true when the dates are out of date: a refresh started, wait for the new `dates`. */
  checkDates: () => boolean;
  onProductCreated: (p: Product) => void;
};

type Created = { ok: true; id: string; number: string };

const SKELETON_WIDTHS = ["58%", "42%", "66%", "50%", "37%"];

/** Placeholder rows while the month's orders load. */
function LinesSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Chargement des commandes du mois…
      </p>
      <div className="flex min-h-9 items-center">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="mt-2 divide-y overflow-hidden rounded-xl border bg-card">
        {SKELETON_WIDTHS.map((w, i) => (
          <div key={i} className="flex items-center gap-3 py-3 pr-2 pl-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4" style={{ width: w }} />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-28 shrink-0 rounded-full pointer-coarse:h-11 pointer-coarse:w-34" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** What POST /api/documents receives for this review (without the requestId). */
const bodyOf = (r: ReviewData) => ({ kind: "stock" as const, site: r.site.slug, lines: r.lines });

/** New lines for the sheet; an empty sheet (before or after the change) belongs to the current `month`. */
function withLines(d: StockDraft, lines: BuilderLine[], month: string): StockDraft {
  return { ...d, month: d.lines.length > 0 && lines.length > 0 ? d.month : month, lines };
}

/** Builder of the monthly état des stocks, prefilled with what the site ordered this month. */
export function StockBuilder({
  site,
  products,
  author,
  dates,
  datesPending,
  checkDates,
  onProductCreated,
}: StockBuilderProps) {
  const router = useRouter();
  const month = dates.today.slice(0, 7);
  const monthLabel = formatMonth(dates.today);

  const initial: StockDraft = { v: 1, month, seeded: false, prefilled: false, lines: [] };
  // A sheet started another month is kept while it has lines: it is shown with a notice, never overwritten.
  const validate = (v: unknown): v is StockDraft => isStockDraft(v) && (v.month === month || v.lines.length > 0);
  const [draft, setDraft, clearDraft] = useLocalDraft<StockDraft>(`bktk:draft:stock:${site.slug}`, initial, validate);
  // Month the unfinished sheet was started in, when it is not this month.
  const startedMonth = draft.month !== month && draft.lines.length > 0 ? draft.month : null;

  // Any change by hand means the month's orders must not overwrite the list any more.
  const updateLines: UpdateLines = (fn) => setDraft((d) => ({ ...withLines(d, fn(d.lines), month), seeded: true }));
  const { list, listRef } = useLineList(draft.lines, updateLines, "count");
  useSlashFocus(SEARCH_ID);

  // Prefill with the quantities ordered this month (starting point for the count), never over counted lines.
  const [recapError, setRecapError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const needsRecap = !draft.seeded && draft.lines.length === 0;
  const loading = needsRecap && recapError === null;

  useEffect(() => {
    if (!needsRecap) return;
    const ctrl = new AbortController();
    apiFetch<{ ok: true; items?: unknown }>(`/api/stock-recap?site=${encodeURIComponent(site.slug)}`, { signal: ctrl.signal })
      .then((body) => {
        const items = parseLines(body?.items).filter((l) => l.qty > 0);
        const prefix = newLineId();
        setDraft((d) =>
          d.seeded || d.lines.length > 0
            ? d
            : { ...withLines(d, withIds(items, prefix), month), seeded: true, prefilled: items.length > 0 },
        );
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setRecapError(err instanceof ApiError ? err.message : "Erreur inconnue.");
      });
    return () => ctrl.abort();
  }, [needsRecap, site.slug, attempt, setDraft, month]);

  const retryRecap = () => {
    setRecapError(null);
    setAttempt((n) => n + 1);
  };

  /** Start again from the month's orders (offered when the list is empty). */
  const reloadRecap = () => {
    setRecapError(null);
    setDraft((d) => ({ ...withLines(d, [], month), seeded: false, prefilled: false }));
  };

  const clearAll = () => setDraft((d) => ({ ...withLines(d, [], month), seeded: true, prefilled: false }));

  /** Drop the sheet started another month and start this month's (undo in the toast). */
  const restart = () => {
    const previous = draft;
    setRecapError(null);
    setDraft(initial);
    toast("Nouvel inventaire commencé", {
      description: capitalize(monthLabel),
      action: { label: "Annuler", onClick: () => setDraft(previous) },
    });
  };

  const onCreate = (name: string, unit: string) => {
    list.add({ name, unit });
    onProductCreated({ name, unit, custom: true });
    saveProductInBackground(name, unit);
  };

  const totals = totalsOf(draft.lines);
  // On an inventory a 0 is information (out of stock): those lines are sent too.
  const canSend = draft.lines.some((l) => l.name.trim());
  const zeroText =
    totals.zero > 0
      ? `${countLabel(totals.zero)} à 0 : ${plural(totals.zero, "sera noté", "seront notés")} en rupture de stock.`
      : undefined;
  const hint = !canSend ? "Ajoutez au moins un article." : zeroText;

  // Review and send
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [phase, setPhase] = useState<ReviewPhase>("idle");
  const [sent, setSent] = useState<{ id: string; number: string } | null>(null);
  // Same id for every retry of one review: a lost answer never creates the inventaire twice.
  const [requestId, setRequestId] = useState("");
  // Last attempt that failed: reopening the review with the same content keeps its id (never a second inventaire).
  const [lastAttempt, setLastAttempt] = useState<{ id: string; body: string } | null>(null);
  // Review asked for while fresh dates were loading (day changed): opened once they arrived.
  const [queued, setQueued] = useState<{ id: string; month: string } | null>(null);

  const showReview = (id: string) => {
    const lines = linesToSend(draft.lines, true);
    const data: ReviewData = {
      kind: "stock",
      site,
      requestedDate: null,
      monthLabel,
      author,
      note: "",
      lines,
      dropped: draft.lines.length - lines.length,
    };
    setRequestId(lastAttempt?.body === JSON.stringify(bodyOf(data)) ? lastAttempt.id : id);
    setReview(data);
    setPhase("idle");
    setReviewOpen(true);
  };

  // When a new month started meanwhile, the review stays closed: the notice about the sheet's month comes first.
  if (queued !== null && !datesPending) {
    setQueued(null);
    if (canSend && queued.month === month) showReview(queued.id);
  }

  const openReview = () => {
    if (!canSend) return;
    const id = newRequestId();
    if (checkDates()) setQueued({ id, month });
    else showReview(id);
  };

  const send = async () => {
    if (!review || phase !== "idle") return;
    setPhase("sending");
    try {
      const res = await apiFetch<Created>("/api/documents", {
        method: "POST",
        body: { ...bodyOf(review), requestId },
      });
      if (typeof res?.id !== "string" || typeof res.number !== "string")
        throw new ApiError(500, "Réponse inattendue du serveur.");
      clearDraft();
      setSent({ id: res.id, number: res.number });
      setPhase("sent");
      toast.success(`Inventaire ${res.number} envoyé`);
      router.push(`/pdf?id=${encodeURIComponent(res.id)}`);
    } catch (err) {
      setPhase("idle");
      setLastAttempt({ id: requestId, body: JSON.stringify(bodyOf(review)) });
      if (isNetworkError(err)) toast.error("Envoi non confirmé : réessayez, l’inventaire ne sera pas créé deux fois.");
      else toastError(err, "L’inventaire n’a pas été envoyé");
    }
  };

  let listArea;
  if (draft.lines.length === 0 && loading) {
    listArea = <LinesSkeleton />;
  } else if (draft.lines.length === 0 && needsRecap && recapError) {
    listArea = (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-4 text-sm">
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
        listRef={listRef}
        muteZero
        intro={
          draft.prefilled && !startedMonth ? (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
              <span>Quantités commandées ce mois-ci : ajustez avec le stock réel.</span>
            </p>
          ) : null
        }
        footer={zeroText ? <p className="mt-2 px-1 text-xs text-muted-foreground">{zeroText}</p> : null}
        empty={
          <EmptyState
            icon={ClipboardList}
            title="Aucun article compté"
            description={`Recherchez les produits en stock à ${site.shortName} pour les ajouter, ou repartez des commandes du mois.`}
            className="border-0 bg-transparent px-4 py-8"
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
          dateCaption: "Inventaire",
          dateValue: capitalize(monthLabel),
          barDate: `Inventaire · ${capitalize(monthLabel)}`,
          author,
          totals,
          hint,
          disabled: !canSend,
          onReview: openReview,
        }}
      >
        {startedMonth ? (
          <div role="status" className="flex items-center gap-3 rounded-xl bg-accent/70 py-1 pr-1 pl-4 text-sm text-accent-foreground">
            <CalendarClock className="size-4 shrink-0 text-info" aria-hidden />
            <p className="min-w-0 flex-1 py-1.5">
              Inventaire commencé en <span className="font-semibold">{formatMonth(startedMonth)}</span>.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="h-11 shrink-0 px-3 text-accent-foreground/80 pointer-fine:h-9"
              onClick={restart}
            >
              <RotateCcw aria-hidden />
              Recommencer
            </Button>
          </div>
        ) : null}
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
