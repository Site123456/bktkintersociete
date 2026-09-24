"use client";

import type { ReactNode } from "react";
import { ArrowRight, Info } from "lucide-react";
import { KindBadge } from "@/components/app/KindBadge";
import { Button } from "@/components/ui/button";
import { formatQty } from "@/lib/format";
import type { DocKind, SiteOption } from "@/types/delivery";
import { countLabel, plural, type Totals } from "./lines";

export type SummaryPanelProps = {
  kind: DocKind;
  site: SiteOption;
  /** Row label of the date in the side card, e.g. "Livraison" / "Inventaire". */
  dateCaption: string;
  /** e.g. "25/09/2026" (JJ/MM/AAAA) or "Septembre 2026". */
  dateValue: string;
  /** Extra context under the date, e.g. "Vendredi · demain". */
  dateDetail?: string;
  /** Short text for the mobile bar, e.g. "Livraison 25/09/2026". */
  barDate: string;
  author?: string;
  totals: Totals;
  /** Why the button is disabled, or what will happen (zero lines dropped…). */
  hint?: ReactNode;
  disabled: boolean;
  onReview: () => void;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  );
}

const ACTION = "Vérifier et envoyer";

/** Totals and the main action in a sticky side card (from 1024px; place it in the right grid column). */
export function SummaryAside({
  kind,
  site,
  dateCaption,
  dateValue,
  dateDetail,
  author,
  totals,
  hint,
  disabled,
  onReview,
}: SummaryPanelProps) {
  return (
    <aside aria-label="Récapitulatif" className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Récapitulatif</h2>
          <KindBadge kind={kind} compact />
        </div>

        <div className="mt-4" aria-live="polite">
          <p className="flex items-baseline gap-2">
            <span className="tabular text-3xl font-semibold tracking-tight">{totals.articles}</span>
            <span className="text-sm text-muted-foreground">{plural(totals.articles, "article")}</span>
          </p>
          <p className="tabular mt-0.5 text-sm text-muted-foreground">Quantité totale {formatQty(totals.quantity)}</p>
        </div>

        <dl className="mt-4 space-y-2.5 border-t pt-4 text-sm">
          <Row label="Site">{site.shortName}</Row>
          <Row label={dateCaption}>
            <span className="tabular">{dateValue}</span>
            {dateDetail ? <span className="block text-xs font-normal text-muted-foreground">{dateDetail}</span> : null}
          </Row>
          {author ? <Row label="Émis par">{author}</Row> : null}
        </dl>

        <Button type="button" className="mt-5 h-11 w-full" disabled={disabled} onClick={onReview}>
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
 * Same summary as a bar stuck to the bottom of the screen under 1024px (thumb reach). It stays in the page flow
 * (sticky, with the safe-area inset), so at the end of the page it sits under the last line instead of covering it.
 * Must be the last child of the builder's flex column.
 */
export function SummaryBar({ totals, barDate, hint, disabled, onReview }: SummaryPanelProps) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-auto border-t bg-background/95 px-4 pt-2.5 pb-safe backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="truncate text-sm">
            <span className="tabular font-semibold">{countLabel(totals.articles)}</span>
            <span className="text-muted-foreground">
              <span aria-hidden> · </span>
              <span className="tabular">Qté {formatQty(totals.quantity)}</span>
            </span>
          </p>
          <p className="tabular truncate text-xs text-muted-foreground">{barDate}</p>
        </div>
        <Button type="button" className="h-11 shrink-0 px-4" disabled={disabled} onClick={onReview}>
          {ACTION}
        </Button>
      </div>
      {hint ? <p className="mx-auto mt-1.5 max-w-3xl text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
