"use client";

import Link from "next/link";
import { RotateCcw, X } from "lucide-react";
import { DocumentBar, DocumentHeading, DocumentLinesText, docShareTitle, docSummary } from "@/components/pdf/DocumentBar";
import { PdfPages } from "@/components/pdf/PdfPages";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { DeliveryView } from "@/types/delivery";
import { DocumentActions } from "./DocumentActions";
import { pdfUrl, reorderUrl } from "./format";
import { useMediaQuery } from "./use-media-query";

export type DocumentSheetProps = {
  doc: DeliveryView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Preview of a document: the real PDF (pdf.js) under the same bar as the public page.
 * Full screen on phones, wide panel from the right on desktop. "Recommander" stays at the bottom.
 */
export function DocumentSheet({ doc, open, onOpenChange }: DocumentSheetProps) {
  const desktop = useMediaQuery("(min-width: 640px)");

  return (
    <Sheet open={open && doc !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-hidden p-0 [&>button:last-child]:hidden",
          desktop ? "w-full sm:max-w-3xl lg:max-w-[56rem]" : "h-dvh max-h-dvh border-t-0 pt-[env(safe-area-inset-top)]",
        )}
      >
        {doc ? (
          <>
            <SheetHeader className="gap-0 border-b bg-background p-0">
              <DocumentBar
                leading={
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-muted-foreground hover:text-foreground sm:size-9"
                      aria-label="Fermer l’aperçu"
                      title="Fermer"
                    >
                      <X className="size-5" aria-hidden />
                    </Button>
                  </SheetClose>
                }
                heading={<DocumentHeading doc={doc} titleAs={SheetTitle} subtitleAs={SheetDescription} />}
                actions={
                  <DocumentActions id={doc.id} kind={doc.kind} title={docShareTitle(doc)} showPageLink />
                }
              />
              <p className="sr-only">{docSummary(doc)}</p>
        <DocumentLinesText doc={doc} />
            </SheetHeader>

            <PdfPages
              key={doc.id}
              src={pdfUrl(doc.id)}
              downloadHref={pdfUrl(doc.id, true)}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            />

            {doc.kind === "bl" ? (
              <SheetFooter className="pb-safe mt-0 flex-row justify-end border-t bg-background px-3 pt-3 sm:px-4">
                <Button asChild variant="outline" className="h-11 w-full sm:h-9 sm:w-auto">
                  <Link href={reorderUrl(doc.id)} prefetch={false}>
                    <RotateCcw aria-hidden />
                    Recommander
                  </Link>
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
