"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, MessageSquarePlus, PackageSearch, RotateCcw, X } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import type { FrequentItem } from "@/components/app/ProductPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { formatDateLong } from "@/lib/format";
import type { DeliveryLine, Product, SiteOption } from "@/types/delivery";
import { ApiError, apiFetch, saveProductInBackground, toastError } from "./api";
import { BuilderLayout, ProductSearch, SEARCH_ID } from "./BuilderLayout";
import { LinesCard } from "./LinesCard";
import {
  capitalize,
  countLabel,
  formatDateShort,
  isDeliveryDraft,
  isYmd,
  linesToSend,
  MAX_NOTE_LENGTH,
  parseFrequent,
  plural,
  totalsOf,
  withIds,
  type BuilderDates,
  type DeliveryDraft,
  type SourceDoc,
} from "./lines";
import { ReviewDialog, type ReviewData, type ReviewPhase } from "./ReviewDialog";
import { useLineList, type UpdateLines } from "./use-line-list";
import { useSlashFocus } from "./use-slash-focus";

/** Bon de livraison to copy ("Recommander"). */
export type Recommend = SourceDoc & { lines: DeliveryLine[] };

export type DeliveryBuilderProps = {
  site: SiteOption;
  products: Product[];
  /** "Prénom N." printed on the document. */
  author: string;
  dates: BuilderDates;
  recommend: Recommend | null;
  /** The copy was dismissed, cleared or sent: forget it (and drop it from the address). */
  onRecommendDone: () => void;
  onProductCreated: (p: Product) => void;
};

const EMPTY: DeliveryDraft = { v: 1, date: "", note: "", lines: [], from: null };

type Created = { ok: true; id: string; number: string };

/** Builder of a bon de livraison (order the central kitchen delivers to the site). */
export function DeliveryBuilder({
  site,
  products,
  author,
  dates,
  recommend,
  onRecommendDone,
  onProductCreated,
}: DeliveryBuilderProps) {
  const router = useRouter();
  const dateId = useId();
  const noteId = useId();

  // "Recommander": start from the copied lines unless the saved draft already is that copy (edited).
  const recommendId = recommend?.id ?? null;
  const initial: DeliveryDraft = recommend
    ? { ...EMPTY, lines: withIds(recommend.lines, `r${recommend.id.slice(-6)}`), from: { id: recommend.id, number: recommend.number } }
    : EMPTY;
  const validate = (v: unknown): v is DeliveryDraft => isDeliveryDraft(v) && (!recommendId || v.from?.id === recommendId);
  const [draft, setDraft, clearDraft] = useLocalDraft<DeliveryDraft>(`bktk:draft:bl:${site.slug}`, initial, validate);

  const updateLines: UpdateLines = (fn) => setDraft((d) => ({ ...d, lines: fn(d.lines) }));
  const list = useLineList(draft.lines, updateLines, "order");
  useSlashFocus(SEARCH_ID);

  // Products this site orders most (errors are ignored: it is only a shortcut).
  const [frequent, setFrequent] = useState<FrequentItem[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/frequent?site=${encodeURIComponent(site.slug)}`, { signal: ctrl.signal, cache: "no-store", credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        const items = body && typeof body === "object" ? parseFrequent((body as { products?: unknown }).products) : [];
        if (items.length) setFrequent(items);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [site.slug]);

  // A saved date in the past (old draft) falls back to tomorrow.
  const date = isYmd(draft.date) && draft.date >= dates.today ? draft.date : dates.tomorrow;
  const dateError = date > dates.max ? `Date trop lointaine : au plus tard le ${formatDateLong(dates.max)}.` : null;

  const [noteOpen, setNoteOpen] = useState(() => draft.note.trim() !== "");
  const showNote = noteOpen || draft.note !== "";

  const totals = totalsOf(draft.lines);
  const canSend = totals.articles > 0 && !dateError;
  const hint = dateError
    ? "Corrigez la date de livraison."
    : totals.articles === 0
      ? "Ajoutez au moins un article pour continuer."
      : totals.zero > 0
        ? `${countLabel(totals.zero)} à 0 ${plural(totals.zero, "ne sera pas envoyé", "ne seront pas envoyés")}.`
        : undefined;

  const onCreate = (name: string, unit: string) => {
    list.add({ name, unit });
    onProductCreated({ name, unit, custom: true });
    saveProductInBackground(name, unit);
  };

  const clearAll = () => {
    setDraft((d) => ({ ...EMPTY, date: d.date }));
    setNoteOpen(false);
    if (recommend) onRecommendDone();
  };

  const dismissSource = () => {
    setDraft((d) => ({ ...d, from: null }));
    if (recommend) onRecommendDone();
  };

  // Review and send
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [phase, setPhase] = useState<ReviewPhase>("idle");
  const [sent, setSent] = useState<{ id: string; number: string } | null>(null);

  const openReview = () => {
    if (!canSend) return;
    const lines = linesToSend(draft.lines);
    setReview({
      kind: "bl",
      site,
      requestedDate: date,
      author,
      note: draft.note.trim(),
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
        body: {
          kind: "bl",
          site: review.site.slug,
          requestedDate: review.requestedDate ?? undefined,
          note: review.note || undefined,
          lines: review.lines,
        },
      });
      if (typeof res?.id !== "string" || typeof res.number !== "string") throw new ApiError(500, "Réponse inattendue du serveur.");
      clearDraft();
      onRecommendDone();
      setSent({ id: res.id, number: res.number });
      setPhase("sent");
      toast.success(`Bon de livraison ${res.number} envoyé`);
      router.push(`/pdf?id=${encodeURIComponent(res.id)}`);
    } catch (err) {
      setPhase("idle");
      toastError(err, "Le bon n’a pas été envoyé");
    }
  };

  return (
    <>
      <BuilderLayout
        summary={{
          kind: "bl",
          site,
          dateCaption: "Livraison",
          dateLong: formatDateLong(date),
          dateShort: formatDateShort(date),
          author,
          totals,
          hint,
          disabled: !canSend,
          onReview: openReview,
        }}
      >
        {draft.from ? (
          <div role="status" className="flex items-center gap-3 rounded-xl border border-info/30 bg-info/5 py-1.5 pr-1.5 pl-4 text-sm">
            <RotateCcw className="size-4 shrink-0 text-info" aria-hidden />
            <p className="min-w-0 flex-1 py-1.5">
              Repris du bon <span className="tabular font-semibold">{draft.from.number}</span>. Vérifiez les quantités avant
              l’envoi.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-muted-foreground sm:size-9"
              aria-label="Masquer ce message"
              title="Masquer"
              onClick={dismissSource}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}

        <section aria-label="Date de livraison" className="rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor={dateId}>Livraison demandée le</Label>
          <Input
            id={dateId}
            type="date"
            required
            min={dates.today}
            max={dates.max}
            value={date}
            onChange={(e) => {
              const value = e.target.value;
              setDraft((d) => ({ ...d, date: value }));
            }}
            aria-describedby={`${dateId}-long`}
            aria-invalid={dateError ? true : undefined}
            className="tabular mt-2 h-11 w-full sm:w-56"
          />
          <p id={`${dateId}-long`} className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-medium text-foreground">{capitalize(formatDateLong(date))}</span>
              {date === dates.tomorrow ? " · demain" : null}
            </span>
          </p>
          {dateError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {dateError}
            </p>
          ) : null}
        </section>

        <ProductSearch
          products={products}
          frequent={frequent}
          label="Rechercher un produit à commander"
          onPick={list.add}
          onCreate={onCreate}
        />

        <LinesCard
          title="Articles à livrer"
          lines={draft.lines}
          list={list}
          empty={
            <EmptyState
              icon={PackageSearch}
              title="Aucun article pour l’instant"
              description="Recherchez un produit ou touchez un produit fréquent pour l’ajouter au bon."
            />
          }
          clear={{
            title: "Vider le bon ?",
            description: `${
              draft.note.trim()
                ? `${countLabel(draft.lines.length)} et la remarque seront retirés.`
                : `${countLabel(draft.lines.length)} ${plural(draft.lines.length, "sera retiré", "seront retirés")}.`
            } Cette action est définitive.`,
            onConfirm: clearAll,
          }}
        />

        {showNote ? (
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor={noteId}>
                Remarque <span className="font-normal text-muted-foreground">(facultatif)</span>
              </Label>
              <span id={`${noteId}-count`} className="tabular text-xs text-muted-foreground">
                {draft.note.length}/{MAX_NOTE_LENGTH}
              </span>
            </div>
            <Textarea
              id={noteId}
              autoFocus={noteOpen && draft.note === ""}
              value={draft.note}
              maxLength={MAX_NOTE_LENGTH}
              rows={3}
              placeholder="Ex. : livrer avant 10 h, entrée par l’arrière…"
              aria-describedby={`${noteId}-count`}
              onChange={(e) => {
                const value = e.target.value.slice(0, MAX_NOTE_LENGTH);
                setDraft((d) => ({ ...d, note: value }));
              }}
              className="mt-2 min-h-20"
            />
          </section>
        ) : (
          <Button type="button" variant="ghost" className="h-11 px-3 text-muted-foreground" onClick={() => setNoteOpen(true)}>
            <MessageSquarePlus aria-hidden />
            Ajouter une remarque
          </Button>
        )}
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
