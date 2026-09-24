"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, MessageSquarePlus, PackageSearch, RotateCcw, X } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import type { FrequentItem } from "@/components/app/ProductPicker";
import { QuickAddRail } from "@/components/app/QuickAddRail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { formatDateFr } from "@/lib/format";
import type { DeliveryLine, Product, SiteOption } from "@/types/delivery";
import { ApiError, apiFetch, isNetworkError, saveProductInBackground, toastError } from "./api";
import { BuilderLayout, ProductSearch, SEARCH_ID } from "./BuilderLayout";
import { LinesCard } from "./LinesCard";
import {
  countLabel,
  dayContext,
  isDeliveryDraft,
  isYmd,
  linesToSend,
  MAX_NOTE_LENGTH,
  newRequestId,
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
  /** Fresh dates are being fetched (the day changed while the page was open). */
  datesPending: boolean;
  /** true when the dates are out of date: a refresh started, wait for the new `dates`. */
  checkDates: () => boolean;
  recommend: Recommend | null;
  /** The copy was dismissed, cleared or sent: forget it (and drop it from the address). */
  onRecommendDone: () => void;
  onProductCreated: (p: Product) => void;
};

const EMPTY: DeliveryDraft = { v: 1, date: "", note: "", lines: [], from: null };

/** Frequent products loaded for the quick-add cards. */
const FREQUENT_LIMIT = 20;
/** Last frequent products per site, so the cards show at once when coming back to the screen (refreshed anyway). */
const frequentCache = new Map<string, FrequentItem[]>();

type Created = { ok: true; id: string; number: string };

/** What POST /api/documents receives for this review (without the requestId). */
function bodyOf(r: ReviewData) {
  return {
    kind: "bl" as const,
    site: r.site.slug,
    requestedDate: r.requestedDate ?? undefined,
    note: r.note || undefined,
    lines: r.lines,
  };
}

/** Error for a date typed in the field (null when valid, empty or not being edited). */
function dateProblem(value: string | null, dates: BuilderDates): string | null {
  if (!value || !isYmd(value)) return null;
  if (value < dates.today) return "La date ne peut pas être passée.";
  if (value > dates.max) return `Date trop lointaine : au plus tard le ${formatDateFr(dates.max)}.`;
  return null;
}

/** Builder of a bon de livraison (order the central kitchen delivers to the site). */
export function DeliveryBuilder({
  site,
  products,
  author,
  dates,
  datesPending,
  checkDates,
  recommend,
  onRecommendDone,
  onProductCreated,
}: DeliveryBuilderProps) {
  const router = useRouter();
  const dateId = useId();
  const noteId = useId();

  // "Recommander": the copied lines, used at once when no draft is in progress. A saved draft with lines
  // (other than this copy, edited) is kept until the person chooses to replace it (see `conflict`).
  const recommendId = recommend?.id ?? null;
  const copy: DeliveryDraft | null = recommend
    ? {
        ...EMPTY,
        lines: withIds(recommend.lines, `r${recommend.id.slice(-6)}`),
        from: { id: recommend.id, number: recommend.number },
      }
    : null;
  const validate = (v: unknown): v is DeliveryDraft =>
    isDeliveryDraft(v) && (!recommendId || v.lines.length > 0 || v.from?.id === recommendId);
  const [draft, setDraft, clearDraft, reloadDraft] = useLocalDraft<DeliveryDraft>(
    `bktk:draft:bl:${site.slug}`,
    copy ?? EMPTY,
    validate,
  );
  const conflict = recommend !== null && draft.lines.length > 0 && draft.from?.id !== recommend.id;

  // "Recommander" over (sent, cleared, kept, or left with "Nouveau"): show the saved draft again, not a copy that
  // was only on screen. Changes made to the copy were saved as the draft and stay.
  const shownRecommend = useRef(recommendId);
  useEffect(() => {
    const was = shownRecommend.current;
    shownRecommend.current = recommendId;
    if (was && !recommendId) reloadDraft();
  }, [recommendId, reloadDraft]);

  const updateLines: UpdateLines = (fn) => setDraft((d) => ({ ...d, lines: fn(d.lines) }));
  const { list, listRef } = useLineList(draft.lines, updateLines, "order");
  useSlashFocus(SEARCH_ID);

  // Products this site orders most (errors are ignored: it is only a shortcut).
  const [frequent, setFrequent] = useState<FrequentItem[]>(() => frequentCache.get(site.slug) ?? []);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/frequent?site=${encodeURIComponent(site.slug)}&limit=${FREQUENT_LIMIT}`, {
      signal: ctrl.signal,
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        if (!body || typeof body !== "object") return;
        const items = parseFrequent((body as { products?: unknown }).products);
        frequentCache.set(site.slug, items);
        setFrequent(items);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [site.slug]);

  // Only valid dates are saved; a saved date now in the past (old draft) falls back to tomorrow.
  const date = isYmd(draft.date) && draft.date >= dates.today && draft.date <= dates.max ? draft.date : dates.tomorrow;
  // What is being typed in the date field (null when not editing), so partial input is not overwritten.
  const [dateInput, setDateInput] = useState<string | null>(null);
  const dateError = dateProblem(dateInput, dates);

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

  const quickAdd = (p: { name: string; unit: string }) => list.add(p, { reveal: false });

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

  const replaceWithCopy = () => {
    if (!copy) return;
    setDraft(copy);
    setNoteOpen(false);
    setDateInput(null);
  };

  // Review and send
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [phase, setPhase] = useState<ReviewPhase>("idle");
  const [sent, setSent] = useState<{ id: string; number: string } | null>(null);
  // Same id for every retry of one review: a lost answer never creates the bon twice.
  const [requestId, setRequestId] = useState("");
  // Last attempt that failed: reopening the review with the same content keeps its id (never a second bon).
  const [lastAttempt, setLastAttempt] = useState<{ id: string; body: string } | null>(null);
  // Review asked for while fresh dates were loading (day changed): opened once they arrived.
  const [queued, setQueued] = useState<string | null>(null);

  const showReview = (id: string) => {
    const lines = linesToSend(draft.lines);
    const data: ReviewData = {
      kind: "bl",
      site,
      requestedDate: date,
      author,
      note: draft.note.trim(),
      lines,
      dropped: draft.lines.length - lines.length,
    };
    setRequestId(lastAttempt?.body === JSON.stringify(bodyOf(data)) ? lastAttempt.id : id);
    setReview(data);
    setPhase("idle");
    setReviewOpen(true);
  };

  if (queued !== null && !datesPending) {
    setQueued(null);
    if (canSend) showReview(queued);
  }

  const openReview = () => {
    if (!canSend) return;
    const id = newRequestId();
    if (checkDates()) setQueued(id);
    else showReview(id);
  };

  const send = async () => {
    if (!review || phase !== "idle") return;
    setPhase("sending");
    try {
      const res = await apiFetch<Created>("/api/documents", { method: "POST", body: { ...bodyOf(review), requestId } });
      if (typeof res?.id !== "string" || typeof res.number !== "string")
        throw new ApiError(500, "Réponse inattendue du serveur.");
      clearDraft();
      onRecommendDone();
      setSent({ id: res.id, number: res.number });
      setPhase("sent");
      toast.success(`Bon de livraison ${res.number} envoyé`);
      router.push(`/pdf?id=${encodeURIComponent(res.id)}`);
    } catch (err) {
      setPhase("idle");
      setLastAttempt({ id: requestId, body: JSON.stringify(bodyOf(review)) });
      if (isNetworkError(err)) toast.error("Envoi non confirmé : réessayez, le bon ne sera pas créé deux fois.");
      else toastError(err, "Le bon n’a pas été envoyé");
    }
  };

  return (
    <>
      <BuilderLayout
        summary={{
          kind: "bl",
          site,
          dateCaption: "Livraison",
          dateValue: formatDateFr(date),
          dateDetail: dayContext(date, dates.today),
          barDate: `Livraison ${formatDateFr(date)}`,
          author,
          totals,
          hint,
          disabled: !canSend,
          onReview: openReview,
        }}
      >
        {draft.from ? (
          <div role="status" className="flex items-center gap-3 rounded-xl bg-accent/70 py-1 pr-1 pl-4 text-sm text-accent-foreground">
            <RotateCcw className="size-4 shrink-0 text-info" aria-hidden />
            <p className="min-w-0 flex-1 py-1.5">
              Repris du bon <span className="tabular font-semibold">{draft.from.number}</span>. Vérifiez les quantités avant
              l’envoi.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-accent-foreground/80 pointer-fine:size-9"
              aria-label="Masquer ce message"
              title="Masquer"
              onClick={dismissSource}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}

        <section aria-label="Date de livraison">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor={dateId}>Livraison le</Label>
              <p id={`${dateId}-hint`} className="mt-1 text-sm text-muted-foreground">
                {dayContext(date, dates.today)}
              </p>
            </div>
            {/* Always shows JJ/MM/AAAA (the native field follows the phone's language, e.g. MM/DD in English);
                the transparent native field on top still opens the phone's own date picker. */}
            <div
              className={
                "relative flex h-11 w-40 shrink-0 items-center justify-between rounded-md border border-input bg-card px-3 shadow-xs " +
                "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 pointer-fine:h-10 " +
                (dateError ? "border-destructive" : "")
              }
            >
              <span className="tabular text-base font-medium" aria-hidden>
                {formatDateFr(dateInput ?? date) || "JJ/MM/AAAA"}
              </span>
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
              <Input
                id={dateId}
                type="date"
                required
                min={dates.today}
                max={dates.max}
                value={dateInput ?? date}
                onChange={(e) => {
                  const value = e.target.value;
                  setDateInput(value);
                  if (!dateProblem(value, dates) && isYmd(value)) setDraft((d) => ({ ...d, date: value }));
                }}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {
                    /* the browser opens its own picker */
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {
                      /* ignore */
                    }
                  }
                }}
                onBlur={() => setDateInput(null)}
                aria-describedby={`${dateId}-hint`}
                aria-invalid={dateError ? true : undefined}
                className="absolute inset-0 h-full w-full cursor-pointer border-0 opacity-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          {dateError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {dateError}
            </p>
          ) : null}
        </section>

        <ProductSearch
          products={products}
          label="Rechercher un produit à commander"
          onPick={list.add}
          onCreate={onCreate}
        />

        <QuickAddRail
          items={frequent}
          lines={draft.lines}
          onAdd={quickAdd}
          subtitle={`Fréquents à ${site.shortName}`}
        />

        <LinesCard
          title="Articles à livrer"
          lines={draft.lines}
          list={list}
          listRef={listRef}
          empty={
            <EmptyState
              icon={PackageSearch}
              title="Aucun article pour l’instant"
              description={
                frequent.length
                  ? "Recherchez un produit ou touchez une carte de l’accès rapide pour l’ajouter au bon."
                  : "Recherchez un produit pour l’ajouter au bon."
              }
              className="border-0 bg-transparent px-4 py-8"
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
          <section>
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
              className="mt-2 min-h-20 bg-card"
            />
          </section>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-11 self-start px-3 text-muted-foreground"
            onClick={() => setNoteOpen(true)}
          >
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

      <AlertDialog
        open={conflict}
        onOpenChange={(open) => {
          if (!open) onRecommendDone();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer le brouillon en cours ({countLabel(draft.lines.length)}) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un bon de livraison est déjà en préparation pour {site.shortName}. Le remplacer par la copie du bon{" "}
              {recommend?.number} effacera ce brouillon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 sm:h-9">Garder mon brouillon</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 sm:h-9"
              onClick={(e) => {
                // Closed by the new draft itself (not by onOpenChange, which means "keep").
                e.preventDefault();
                replaceWithCopy();
              }}
            >
              Remplacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
