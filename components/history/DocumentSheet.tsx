"use client";

import Link from "next/link";
import { Download, ExternalLink, RotateCcw, X } from "lucide-react";
import { DocumentView } from "@/components/app/DocumentView";
import { KindBadge } from "@/components/app/KindBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateFr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryView } from "@/types/delivery";
import { pageUrl, parisDay, parisTime, pdfUrl, reorderUrl } from "./format";
import { useMediaQuery } from "./use-media-query";

export type DocumentSheetProps = {
  doc: DeliveryView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Preview of a document with its actions: from the right on desktop, from the bottom on phones. */
export function DocumentSheet({ doc, open, onOpenChange }: DocumentSheetProps) {
  const desktop = useMediaQuery("(min-width: 640px)");
  const created = doc ? formatDateFr(parisDay(doc.createdAt) || doc.date) : "";
  const time = doc ? parisTime(doc.createdAt) : "";

  return (
    <Sheet open={open && doc !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={cn(
          "gap-0 p-0 [&>button:last-child]:hidden",
          desktop ? "w-full sm:max-w-2xl" : "max-h-[92dvh] rounded-t-2xl",
        )}
      >
        {doc ? (
          <>
            <SheetHeader className="flex-row items-start gap-3 border-b px-4 py-3 sm:px-6">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={doc.kind} />
                </div>
                <SheetTitle className="tabular text-lg tracking-tight">{doc.number}</SheetTitle>
                <SheetDescription className="text-xs">
                  {doc.siteShortName}
                  {created ? ` · créé le ${created}${time ? ` à ${time}` : ""}` : ""}
                  {doc.author ? ` par ${doc.author}` : ""}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="-mr-2 size-11 shrink-0 text-muted-foreground" aria-label="Fermer">
                  <X className="size-5" aria-hidden />
                </Button>
              </SheetClose>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/40 p-3 sm:p-6">
              <DocumentView doc={doc} className="p-4 sm:p-6" />
            </div>

            <SheetFooter className="pb-safe mt-0 grid grid-cols-2 gap-2 border-t bg-background px-4 pt-3 sm:flex sm:flex-row sm:justify-end sm:px-6">
              {doc.kind === "bl" ? (
                <Button asChild variant="outline" className="h-11 sm:h-9">
                  <Link href={reorderUrl(doc.id)} prefetch={false}>
                    <RotateCcw aria-hidden />
                    Recommander
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className={cn("h-11 sm:h-9", doc.kind !== "bl" && "col-span-2")}>
                <Link href={pageUrl(doc.id)} prefetch={false}>
                  <ExternalLink aria-hidden />
                  Voir la page
                </Link>
              </Button>
              <Button asChild className="col-span-2 h-11 sm:h-9">
                <a href={pdfUrl(doc.id, true)} download>
                  <Download aria-hidden />
                  Télécharger le PDF
                </a>
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
