"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Info, MapPin, Send } from "lucide-react";
import { KindBadge } from "@/components/app/KindBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { formatDateFr, formatQty, formatUnit } from "@/lib/format";
import type { DeliveryLine, DocKind, SiteOption } from "@/types/delivery";
import { capitalize, countLabel, plural, weekdayOf } from "./lines";
import { useMediaQuery } from "./use-media-query";

/** Snapshot of what will be sent (taken when the review opens). */
export type ReviewData = {
  kind: DocKind;
  site: SiteOption;
  /** Bons de livraison only. */
  requestedDate: string | null;
  /** Inventaires only, e.g. "septembre 2026". */
  monthLabel?: string;
  author: string;
  note: string;
  lines: DeliveryLine[];
  /** Lines at 0 that are left out. */
  dropped: number;
};

export type ReviewPhase = "idle" | "sending" | "sent";

export type ReviewDialogProps = {
  open: boolean;
  data: ReviewData | null;
  phase: ReviewPhase;
  sent: { id: string; number: string } | null;
  onClose: () => void;
  onConfirm: () => void;
};

const TEXT = {
  bl: { title: "Vérifier le bon de livraison", send: "Envoyer le bon", done: "Bon de livraison envoyé" },
  stock: { title: "Vérifier l’inventaire", send: "Envoyer l’inventaire", done: "Inventaire envoyé" },
} as const;

function Caption({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</p>;
}

/** Compact version of the document: recipient, date, lines and totals. */
function ReviewBody({ data }: { data: ReviewData }) {
  const total = data.lines.reduce((s, l) => s + l.qty, 0);
  const address = [data.site.line1, data.site.line2].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <Caption>{data.kind === "bl" ? "Livrer à" : "Site"}</Caption>
          <p className="mt-1 text-sm font-semibold">{data.site.shortName}</p>
          {address.length ? (
            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-px size-3.5 shrink-0" aria-hidden />
              <span>{address.join(", ")}</span>
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border p-3">
          <Caption>{data.kind === "bl" ? "Livraison demandée" : "Inventaire de"}</Caption>
          {data.kind === "bl" && data.requestedDate ? (
            <p className="mt-1 text-sm">
              <span className="tabular font-semibold">{formatDateFr(data.requestedDate)}</span>
              <span className="text-muted-foreground"> · {weekdayOf(data.requestedDate)}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold">{capitalize(data.monthLabel ?? "")}</p>
          )}
          {data.author ? <p className="mt-0.5 text-xs text-muted-foreground">Émis par {data.author}</p> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <ol className="divide-y" aria-label="Articles">
          {data.lines.map((l, i) => {
            const unit = formatUnit(l.unit);
            return (
              <li key={`${i}-${l.name}|${l.unit}`} className="flex items-start gap-3 px-3 py-2.5">
                <span className="tabular w-5 shrink-0 pt-0.5 text-right text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">{l.name}</p>
                  {unit ? <p className="text-xs text-muted-foreground">{unit}</p> : null}
                </div>
                <span className="tabular shrink-0 text-sm font-semibold">{formatQty(l.qty)}</span>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center justify-between gap-3 border-t bg-muted/60 px-3 py-2.5 text-sm font-semibold">
          <span>Total · {countLabel(data.lines.length)}</span>
          <span className="tabular">{formatQty(total)}</span>
        </div>
      </div>

      {data.note ? (
        <div className="rounded-lg border p-3">
          <Caption>Remarque</Caption>
          <p className="mt-1 text-sm whitespace-pre-line break-words">{data.note}</p>
        </div>
      ) : null}

      {data.dropped > 0 ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            {countLabel(data.dropped)} à 0 {plural(data.dropped, "n’est pas envoyé", "ne sont pas envoyés")} : seules les
            quantités supérieures à 0 figurent sur le document.
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Shown once the document is saved, while the PDF page opens. */
function SentBody({ kind, sent }: { kind: DocKind; sent: { id: string; number: string } }) {
  return (
    <div className="flex flex-col items-center py-6 text-center" role="status">
      <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success" aria-hidden>
        <CheckCircle2 className="size-6" />
      </span>
      <p className="mt-4 text-base font-semibold">{TEXT[kind].done}</p>
      <p className="tabular mt-1 text-sm text-muted-foreground">N° {sent.number}</p>
      <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" aria-hidden />
        Ouverture du document…
      </p>
      <Button asChild variant="outline" className="mt-5 h-11 sm:h-9">
        <Link href={`/pdf?id=${encodeURIComponent(sent.id)}`}>
          <FileText aria-hidden />
          Ouvrir le document
        </Link>
      </Button>
    </div>
  );
}

/** Review step before sending: a dialog from 768px, a bottom drawer on phones. */
export function ReviewDialog({ open, data, phase, sent, onClose, onConfirm }: ReviewDialogProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  if (!data) return null;

  const text = TEXT[data.kind];
  const sending = phase === "sending";
  const done = phase === "sent" && sent;
  const description = done
    ? "Le document est enregistré."
    : `${countLabel(data.lines.length)} pour ${data.site.shortName}. Relisez avant l’envoi.`;

  const onOpenChange = (next: boolean) => {
    if (!next && phase === "idle") onClose();
  };

  const body = done ? <SentBody kind={data.kind} sent={sent} /> : <ReviewBody data={data} />;

  const buttons = done ? null : (
    <>
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onClose} disabled={sending}>
        Modifier
      </Button>
      <Button type="button" className="h-11 sm:h-9" onClick={onConfirm} disabled={sending} aria-busy={sending}>
        {sending ? <Spinner aria-hidden /> : <Send aria-hidden />}
        {sending ? "Envoi…" : text.send}
      </Button>
    </>
  );

  const heading = (
    <span className="inline-flex flex-wrap items-center justify-center gap-2 md:justify-start">
      {done ? text.done : text.title}
      <KindBadge kind={data.kind} compact />
    </span>
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[min(90dvh,48rem)] flex-col gap-0 p-0 sm:max-w-xl"
          showCloseButton={phase === "idle"}
          onEscapeKeyDown={(e) => {
            if (phase !== "idle") e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (phase !== "idle") e.preventDefault();
          }}
        >
          <DialogHeader className="border-b px-6 pt-6 pb-4">
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{body}</div>
          {buttons ? <DialogFooter className="border-t px-6 py-4">{buttons}</DialogFooter> : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={phase === "idle"}>
      <DrawerContent>
        <DrawerHeader className="border-b pt-2">
          <DrawerTitle>{heading}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{body}</div>
        {buttons ? <DrawerFooter className="flex-col-reverse border-t pt-3 pb-safe">{buttons}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}
