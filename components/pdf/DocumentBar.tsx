import type { ElementType, ReactNode } from "react";
import { docTotals, kindLabel } from "@/components/history/format";
import { formatDateFr, formatQty, formatUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryView } from "@/types/delivery";

/*
 * Slim bar above the PDF viewer, shared by the public page (/pdf?id=…) and the history preview sheet:
 * back / close on the left, the document name, the actions on the right. Server-safe (no hooks).
 */

/** Site name, or "" for the "—" placeholder of old documents. */
export const known = (s: string | null | undefined): string => (s && s.trim() && s.trim() !== "—" ? s.trim() : "");

/** "INS Paris 15 · 25/09/2026" */
export function docSubtitle(doc: DeliveryView): string {
  return [known(doc.siteShortName), formatDateFr(doc.date)].filter(Boolean).join(" · ");
}

/** "Bon de livraison BL-260924-A26939 – INS Paris 15" (share sheet title). */
export function docShareTitle(doc: DeliveryView): string {
  const site = known(doc.siteShortName);
  return `${kindLabel(doc.kind)} ${doc.number}${site ? ` – ${site}` : ""}`;
}

/** Sentence for screen readers: type, number, site, date(s) and number of articles. */
export function docSummary(doc: DeliveryView): string {
  const { articles } = docTotals(doc);
  const parts = [`${kindLabel(doc.kind)} ${doc.number}`];
  const site = known(doc.siteShortName);
  if (site) parts.push(`site ${site}`);
  if (doc.date) parts.push(`du ${formatDateFr(doc.date)}`);
  if (doc.kind === "bl" && doc.requestedDate) parts.push(`livraison souhaitée le ${formatDateFr(doc.requestedDate)}`);
  parts.push(`${articles} article${articles > 1 ? "s" : ""}`);
  return `${parts.join(", ")}.`;
}

export type DocumentHeadingProps = {
  doc: DeliveryView;
  /** Element of the title (h1 on the page, SheetTitle in the sheet). */
  titleAs?: ElementType;
  /** Element of the second line (p on the page, SheetDescription in the sheet). */
  subtitleAs?: ElementType;
};

/** "Bon de livraison BL-260924-A26939" over "INS Paris 15 · 25/09/2026"; the type is hidden (not for screen readers) on phones. */
export function DocumentHeading({ doc, titleAs: Title = "h1", subtitleAs: Subtitle = "p" }: DocumentHeadingProps) {
  return (
    <div className="min-w-0">
      <Title className="truncate text-[15px] leading-5 font-semibold tracking-tight text-foreground">
        <span className="sr-only font-normal text-muted-foreground sm:not-sr-only">{kindLabel(doc.kind)} </span>
        <span className="tabular">{doc.number}</span>
      </Title>
      <Subtitle className="tabular truncate text-xs leading-4 text-muted-foreground">{docSubtitle(doc)}</Subtitle>
    </div>
  );
}

export type DocumentBarProps = {
  /** Back link or close button. */
  leading?: ReactNode;
  heading: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** 56px bar: leading · heading (truncated) · actions. Fits a 360px screen. */
export function DocumentBar({ leading, heading, actions, className }: DocumentBarProps) {
  return (
    <div className={cn("flex h-14 items-center gap-1 px-1.5 sm:gap-2 sm:px-3", className)}>
      {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
      <div className={cn("min-w-0 flex-1", !leading && "pl-2.5 sm:pl-1")}>{heading}</div>
      {actions ? <div className="flex shrink-0 items-center">{actions}</div> : null}
    </div>
  );
}

/** The lines as text for screen readers (the pages themselves are images). */
export function DocumentLinesText({ doc }: { doc: DeliveryView }) {
  const lines = doc.lines.filter((l) => l.name.trim());
  return (
    <div className="sr-only">
      <ol aria-label="Articles">
        {lines.map((l, i) => (
          <li key={i}>
            {l.name}
            {l.unit ? `, ${formatUnit(l.unit)}` : ""}, quantité {formatQty(l.qty)}
          </li>
        ))}
      </ol>
      {doc.note ? <p>Remarque : {doc.note}</p> : null}
      {doc.author ? <p>Émis par {doc.author}</p> : null}
    </div>
  );
}
