"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatUnit } from "@/lib/format";
import type { BuiltInProduct } from "./types";

export type BuiltInCatalogProps = {
  /** Products matching the search of the Produits tab (all of them when not searching). */
  visible: BuiltInProduct[];
  total: number;
  searching: boolean;
};

/** The catalogue shipped with the app (data/produits.json): read-only, folded by default. */
export function BuiltInCatalog({ visible, total, searching }: BuiltInCatalogProps) {
  const [open, setOpen] = useState(false);
  const summary = searching
    ? `${visible.length} sur ${total} produit${total > 1 ? "s" : ""}`
    : `${total} produit${total > 1 ? "s" : ""} · fait partie de l’application`;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <CollapsibleTrigger className="group flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
          <BookOpen className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Catalogue intégré</span>
          <span className="tabular block text-xs text-muted-foreground">{summary}</span>
        </span>
        <Badge variant="outline" className="hidden text-muted-foreground sm:inline-flex">
          <Lock aria-hidden />
          Lecture seule
        </Badge>
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <p className="border-t bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Cette liste fait partie de l’application : elle ne se modifie pas ici. Un produit saisi dans un bon et absent de
          cette liste s’ajoute automatiquement aux produits de l’équipe.
        </p>
        {visible.length === 0 ? (
          <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">Aucun produit du catalogue ne correspond.</p>
        ) : (
          <ul className="max-h-[28rem] divide-y overflow-y-auto border-t" aria-label="Produits du catalogue intégré">
            {visible.map((p, i) => (
              <li key={`${p.name}|${p.unit}|${i}`} className="flex min-h-11 items-center justify-between gap-4 px-4 py-2 text-sm">
                <span className="min-w-0 break-words">{p.name}</span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">{formatUnit(p.unit)}</span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
