import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/app/Logo";
import { DocumentActions } from "@/components/history/DocumentActions";
import { pdfUrl } from "@/components/history/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeliveryView } from "@/types/delivery";
import { DocumentBar, DocumentHeading, DocumentLinesText, docShareTitle, docSummary } from "./DocumentBar";
import { PdfPages } from "./PdfPages";
import { pdfBackdropClass } from "./PdfSkeleton";

export type DocumentPageProps = {
  doc: DeliveryView;
  /** Public address of this page (the one in the QR code). */
  shareUrl: string;
  /** PDF shown in the viewer; /api/pdf?id=… by default. */
  src?: string;
};

/**
 * Layout of the public document page: slim sticky bar (back to the history for signed-in staff, the logo
 * for visitors · document name · actions) over the PDF viewer. No hooks: rendered by the server page.
 */
export function DocumentPage({ doc, shareUrl, src = pdfUrl(doc.id) }: DocumentPageProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col", pdfBackdropClass)}>
      <header className="no-print sticky top-0 z-40 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <DocumentBar
          leading={
            <>
              <SignedIn>
                <Button asChild variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-foreground sm:size-9">
                  <Link href="/deliveries" aria-label="Retour à l’historique" title="Historique">
                    <ArrowLeft className="size-5" aria-hidden />
                  </Link>
                </Button>
              </SignedIn>
              <SignedOut>
                <Link href="/" aria-label="BKTK International, accueil" className="flex size-11 items-center justify-center rounded-md sm:size-10">
                  <Logo showText={false} alt="" />
                </Link>
              </SignedOut>
            </>
          }
          heading={<DocumentHeading doc={doc} />}
          actions={
            <DocumentActions
              id={doc.id}
              kind={doc.kind}
              shareUrl={shareUrl}
              title={docShareTitle(doc)}
              showReorder
            />
          }
        />
      </header>

      <main id="main" className="flex flex-1 flex-col">
        <p className="sr-only">{docSummary(doc)}</p>
        <DocumentLinesText doc={doc} />
        <PdfPages src={src} downloadHref={pdfUrl(doc.id, true)} className="flex-1" />
      </main>
    </div>
  );
}
