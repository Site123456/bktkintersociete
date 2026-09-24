"use client";

import Link from "next/link";
import { SignedIn } from "@clerk/nextjs";
import { Download, ExternalLink, History, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pdfUrl } from "./format";

export type DocumentActionsProps = {
  id: string;
  /** Public address of this page (the one in the QR code). */
  shareUrl: string;
  /** Title given to the share sheet, e.g. "Bon de livraison BL-260924-7F3A2C – INS Paris 15". */
  title: string;
};

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Lien copié");
  } catch {
    toast.error("Impossible de copier le lien", { description: url });
  }
}

/** Download, open (to print) and share a document; link back to the history for signed-in staff. */
export function DocumentActions({ id, shareUrl, title }: DocumentActionsProps) {
  const share = async () => {
    const data: ShareData = { title, url: shareUrl };
    if ("share" in navigator && (!("canShare" in navigator) || navigator.canShare(data))) {
      try {
        await navigator.share(data);
      } catch (err) {
        // Closing the share sheet is not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        await copyLink(shareUrl);
      }
      return;
    }
    await copyLink(shareUrl);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <SignedIn>
        <Button asChild variant="ghost" className="size-11 px-0 text-muted-foreground sm:h-9 sm:w-auto sm:px-3">
          <Link href="/deliveries" aria-label="Historique" title="Historique">
            <History className="size-5 sm:size-4" aria-hidden />
            <span className="hidden sm:inline">Historique</span>
          </Link>
        </Button>
      </SignedIn>

      <Button
        type="button"
        variant="outline"
        onClick={share}
        className="size-11 px-0 sm:h-9 sm:w-auto sm:px-3"
        aria-label="Partager"
        title="Partager le lien"
      >
        <Share2 className="size-5 sm:size-4" aria-hidden />
        <span className="hidden sm:inline">Partager</span>
      </Button>

      <Button asChild variant="outline" className="size-11 px-0 sm:h-9 sm:w-auto sm:px-3">
        <a
          href={pdfUrl(id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ouvrir le PDF (nouvel onglet)"
          title="Ouvrir le PDF pour le lire ou l’imprimer"
        >
          <ExternalLink className="size-5 sm:size-4" aria-hidden />
          <span className="hidden sm:inline">Ouvrir le PDF</span>
        </a>
      </Button>

      <Button asChild className="h-11 px-3 sm:h-9">
        <a href={pdfUrl(id, true)} download aria-label="Télécharger le PDF">
          <Download className="size-5 sm:size-4" aria-hidden />
          <span className="min-[400px]:hidden">PDF</span>
          <span className="hidden min-[400px]:inline sm:hidden">Télécharger</span>
          <span className="hidden sm:inline">Télécharger le PDF</span>
        </a>
      </Button>
    </div>
  );
}
