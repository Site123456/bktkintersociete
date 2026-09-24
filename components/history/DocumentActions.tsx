"use client";

import Link from "next/link";
import { SignedIn } from "@clerk/nextjs";
import { Download, Ellipsis, ExternalLink, FileText, Link2, Printer, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DocKind } from "@/types/delivery";
import { pageUrl, pdfUrl, reorderUrl } from "./format";
import { useMediaQuery } from "./use-media-query";

export type DocumentActionsProps = {
  id: string;
  kind: DocKind;
  /** Title given to the share sheet, e.g. "Bon de livraison BL-260924-7F3A2C – INS Paris 15". */
  title: string;
  /** Public address of the document page (the one in the QR code); defaults to this site's /pdf?id=…. */
  shareUrl?: string;
  /** Adds "Page du document" to the menu (history preview). */
  showPageLink?: boolean;
  /** Adds "Recommander" to the menu for signed-in staff (bons de livraison only). */
  showReorder?: boolean;
};

const PRINT_FRAME_ID = "pdf-print-frame";

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Lien copié");
  } catch {
    toast.error("Impossible de copier le lien", { description: url });
  }
}

const openInNewTab = (url: string) => window.open(url, "_blank", "noopener");

/**
 * Prints the real PDF: loads it in a hidden frame and opens the print dialog of the browser's PDF viewer.
 * Safari prints PDF frames blank, so it gets the PDF in a new tab (print from there).
 */
function printPdf(url: string) {
  const ua = navigator.userAgent;
  if (/^((?!chrome|chromium|crios|fxios|edg|android).)*safari/i.test(ua)) {
    openInNewTab(url);
    return;
  }
  const failed = () => {
    document.getElementById(PRINT_FRAME_ID)?.remove();
    toast.error("Impression impossible depuis cette page", {
      description: "Ouvrez le PDF, puis imprimez-le depuis l’onglet.",
      action: { label: "Ouvrir le PDF", onClick: () => openInNewTab(url) },
    });
  };
  document.getElementById(PRINT_FRAME_ID)?.remove();
  const frame = document.createElement("iframe");
  frame.id = PRINT_FRAME_ID;
  frame.title = "Impression du PDF";
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
  const timer = setTimeout(failed, 20_000);
  frame.addEventListener("load", () => {
    clearTimeout(timer);
    try {
      const win = frame.contentWindow;
      if (!win) throw new Error("no frame window");
      win.focus();
      win.print();
    } catch {
      failed();
    }
  });
  frame.src = url;
  document.body.appendChild(frame);
}

/**
 * Actions on a document, for the bar above the PDF viewer: share (share sheet or copied link),
 * download (the one main action, icon only under 640px) and a menu (open the PDF, print, copy the link…).
 * Touch targets are 44px on phones.
 */
export function DocumentActions({ id, kind, title, shareUrl, showPageLink = false, showReorder = false }: DocumentActionsProps) {
  // Printing from a hidden frame only makes sense with a desktop browser; phones print from the opened PDF.
  const canPrint = useMediaQuery("(hover: hover) and (pointer: fine)");
  const link = () => shareUrl ?? new URL(pageUrl(id), window.location.origin).href;

  const share = async () => {
    const url = link();
    const data: ShareData = { title, url };
    if ("share" in navigator && (!("canShare" in navigator) || navigator.canShare(data))) {
      try {
        await navigator.share(data);
      } catch (err) {
        // Closing the share sheet is not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        await copyLink(url);
      }
      return;
    }
    await copyLink(url);
  };

  const item = "min-h-11 gap-3 px-3 sm:min-h-9";

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Button
        type="button"
        variant="ghost"
        onClick={share}
        className="hidden size-11 px-0 text-muted-foreground hover:text-foreground min-[360px]:inline-flex sm:h-9 sm:w-auto sm:px-3"
        aria-label="Partager"
        title="Partager le lien"
      >
        <Share2 className="size-5 sm:size-4" aria-hidden />
        <span className="hidden sm:inline">Partager</span>
      </Button>

      <Button asChild className="size-11 px-0 sm:h-9 sm:w-auto sm:px-3.5">
        <a href={pdfUrl(id, true)} download aria-label="Télécharger le PDF" title="Télécharger le PDF">
          <Download className="size-5 sm:size-4" aria-hidden />
          <span className="hidden sm:inline">Télécharger</span>
        </a>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground hover:text-foreground sm:size-9"
            aria-label="Plus d’actions"
            title="Plus d’actions"
          >
            <Ellipsis className="size-5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Under 360px the share button leaves the bar so the document number stays readable. */}
          <DropdownMenuItem className={cn(item, "min-[360px]:hidden")} onSelect={() => void share()}>
            <Share2 aria-hidden />
            Partager
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={item}>
            <a href={pdfUrl(id)} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              Ouvrir le PDF
            </a>
          </DropdownMenuItem>
          {canPrint ? (
            <DropdownMenuItem className={item} onSelect={() => printPdf(pdfUrl(id))}>
              <Printer aria-hidden />
              Imprimer
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className={item} onSelect={() => void copyLink(link())}>
            <Link2 aria-hidden />
            Copier le lien
          </DropdownMenuItem>
          {showPageLink ? (
            <DropdownMenuItem asChild className={item}>
              <Link href={pageUrl(id)} prefetch={false}>
                <FileText aria-hidden />
                Page du document
              </Link>
            </DropdownMenuItem>
          ) : null}
          {showReorder && kind === "bl" ? (
            <SignedIn>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className={item}>
                <Link href={reorderUrl(id)} prefetch={false}>
                  <RotateCcw aria-hidden />
                  Recommander
                </Link>
              </DropdownMenuItem>
            </SignedIn>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
