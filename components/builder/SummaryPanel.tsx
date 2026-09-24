"use client";

import type { ReactNode } from "react";
import { ArrowRight, Info } from "lucide-react";
import { KindBadge } from "@/components/app/KindBadge";
import { Button } from "@/components/ui/button";
import { formatQty } from "@/lib/format";
import type { DocKind, SiteOption } from "@/types/delivery";
import { countLabel, type Totals } from "./lines";

export type SummaryPanelProps = {
  kind: DocKind;
  site: SiteOption;
  /** e.g. "Livraison" / "Inventaire de" */
  dateCaption: string;
  /** Long form for the desktop card, e.g. "jeudi 25 septembre 2026". */
  dateLong: string;
  /** Short form for the mobile bar, e.g. "jeu. 25 sept." */
  dateShort: string;
  author?: string;
  totals: Totals;
  /** Why the button is disabled, or what will happen (zero lines dropped…). */
  hint?: ReactNode;
  disabled: boolean;
  onReview: () => void;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words first-letter:uppercase">{children}</dd>
    </div>
  );
}

const ACTION = "Vérifier et envoyer";

/** Totals and the main action in a sticky side card (from 1024px; place it in the right grid column). */
export function SummaryAside({ kind, site, dateCaption, dateLong, author, totals, hint, disabled, onReview }: SummaryPanelProps) {
  return (
    <aside aria-label="Récapitulatif" className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Récapitulatif</h2>
            <KindBadge kind={kind} compact />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3" aria-live="polite">
            <div className="rounded-lg bg-muted/60 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Articles</p>
              <p className="tabular text-2xl font-semibold">{totals.articles}</p>
            </div>
            <div className="rounded-lg bg-muted/60 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Quantité totale</p>
              <p className="tabular text-2xl font-semibold">{formatQty(totals.quantity)}</p>
            </div>
          </div>

          <dl className="mt-3 divide-y text-sm">
            <Row label="Site">{site.shortName}</Row>
            <Row label={dateCaption}>{dateLong}</Row>
            {author ? <Row label="Émis par">{author}</Row> : null}
          </dl>

          <Button type="button" className="mt-4 h-11 w-full" disabled={disabled} onClick={onReview}>
            {ACTION}
            <ArrowRight aria-hidden />
          </Button>
          {hint ? (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              <span>{hint}</span>
            </p>
          ) : null}
        </div>
    </aside>
  );
}

/**
 * Same summary as a bar stuck to the bottom of the screen under 1024px (thumb reach).
 * Must be the last child of the builder's flex column.
 */
export function SummaryBar({ totals, dateShort, hint, disabled, onReview }: SummaryPanelProps) {
  return (
      <div className="sticky bottom-0 z-30 -mx-4 mt-auto border-t bg-background/95 px-4 pt-3 pb-safe sm:-mx-6 sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="tabular text-sm font-semibold">{countLabel(totals.articles)}</p>
            <p className="truncate text-xs text-muted-foreground">
              <span className="tabular">Qté {formatQty(totals.quantity)}</span>
              <span aria-hidden> · </span>
              <span>{dateShort}</span>
            </p>
          </div>
          <Button type="button" className="h-11 shrink-0 px-4" disabled={disabled} onClick={onReview}>
            {ACTION}
          </Button>
        </div>
        {hint ? <p className="mx-auto mt-1.5 max-w-3xl text-xs text-muted-foreground">{hint}</p> : null}
      </div>
  );
}
