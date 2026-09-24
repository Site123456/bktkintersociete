"use client";

import Link from "next/link";
import { Download, Eye, MoreVertical, RotateCcw } from "lucide-react";
import { KindBadge } from "@/components/app/KindBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateFr, formatQty, formatUnit, matchesQuery } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryView } from "@/types/delivery";
import { countLabel, docTotals, pageUrl, parisTime, pdfUrl, reorderUrl } from "./format";

export type HistoryRowProps = {
  doc: DeliveryView;
  /** Current search, used to show which products matched. */
  query?: string;
  onOpen: (doc: DeliveryView) => void;
};

/**
 * One document of the history list. The number is a button stretched over the whole row (opens the
 * preview sheet); the actions sit above it. Renders an <li>.
 */
export function HistoryRow({ doc, query = "", onOpen }: HistoryRowProps) {
  const { articles, units } = docTotals(doc);
  const time = parisTime(doc.createdAt);
  const isBl = doc.kind === "bl";
  const matched = query.trim() ? doc.lines.filter((l) => l.name && matchesQuery(l.name, query)).slice(0, 3) : [];

  return (
    <li
      className={cn(
        "relative -mx-2 flex items-center gap-2 px-2 py-3 transition-colors hover:bg-accent/60 sm:gap-4 sm:py-3.5",
        "has-[[data-row-open]:focus-visible]:ring-2 has-[[data-row-open]:focus-visible]:ring-ring has-[[data-row-open]:focus-visible]:ring-inset",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <KindBadge kind={doc.kind} compact className="shrink-0" />
          <button
            type="button"
            data-row-open
            onClick={() => onOpen(doc)}
            aria-haspopup="dialog"
            aria-label={`Aperçu de ${doc.number}, ${doc.siteShortName}`}
            className="tabular min-w-0 truncate text-left text-sm font-semibold focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
          >
            {doc.number}
          </button>
          {time ? (
            <time dateTime={doc.createdAt} className="tabular ml-auto shrink-0 pl-1 text-xs text-muted-foreground">
              {time}
            </time>
          ) : null}
        </div>

        <p className="mt-1 truncate text-sm">
          <span className="font-medium">{doc.siteShortName}</span>
          {isBl && doc.requestedDate ? (
            <span className="text-muted-foreground">
              {" · "}Livraison <span className="tabular">{formatDateFr(doc.requestedDate)}</span>
            </span>
          ) : null}
        </p>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="tabular">
            {countLabel(articles, "article")} · {countLabel(units, "unité")}
          </span>
          {doc.author ? ` · ${doc.author}` : null}
        </p>

        {matched.length ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Produits trouvés">
            {matched.map((l, i) => (
              <li key={i} className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs">
                <span className="font-medium">{l.name}</span>
                {formatUnit(l.unit) ? <span className="text-muted-foreground"> · {formatUnit(l.unit)}</span> : null}
                <span className="tabular font-semibold"> × {formatQty(l.qty)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Desktop: all actions visible */}
      <div className="relative z-10 hidden shrink-0 items-center gap-1 sm:flex">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link href={pageUrl(doc.id)} prefetch={false} aria-label={`Voir ${doc.number}`}>
            <Eye aria-hidden />
            Voir
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <a href={pdfUrl(doc.id, true)} download aria-label={`Télécharger le PDF de ${doc.number}`}>
            <Download aria-hidden />
            PDF
          </a>
        </Button>
        {isBl ? (
          <Button asChild variant="ghost" size="sm" className="text-foreground hover:text-foreground">
            <Link href={reorderUrl(doc.id)} prefetch={false} aria-label={`Recommander ${doc.number}`}>
              <RotateCcw aria-hidden />
              Recommander
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Mobile: tapping the row opens the preview, the other actions are in a menu */}
      <div className="relative z-10 shrink-0 sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11 text-muted-foreground" aria-label={`Actions pour ${doc.number}`}>
              <MoreVertical className="size-5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="tabular text-xs font-medium text-muted-foreground">{doc.number}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="min-h-11">
              <Link href={pageUrl(doc.id)} prefetch={false}>
                <Eye aria-hidden />
                Voir le document
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="min-h-11">
              <a href={pdfUrl(doc.id, true)} download>
                <Download aria-hidden />
                Télécharger le PDF
              </a>
            </DropdownMenuItem>
            {isBl ? (
              <DropdownMenuItem asChild className="min-h-11">
                <Link href={reorderUrl(doc.id)} prefetch={false}>
                  <RotateCcw aria-hidden />
                  Recommander
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
