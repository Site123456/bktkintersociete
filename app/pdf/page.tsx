import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { DocumentView } from "@/components/app/DocumentView";
import { Logo } from "@/components/app/Logo";
import { DocumentActions } from "@/components/history/DocumentActions";
import { kindLabel } from "@/components/history/format";
import { getDocument } from "@/lib/deliveries";
import { env } from "@/lib/env";

/*
 * Public page of one document: the QR code printed on every bon de livraison / état des stocks and
 * the links shared from the app point here, so it works without signing in (ids are 24 hex characters,
 * pages are not indexed).
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ID_RE = /^[a-f0-9]{24}$/i;

async function readId(searchParams: SearchParams): Promise<string | null> {
  const raw = (await searchParams).id;
  const id = typeof raw === "string" ? raw.trim() : "";
  return ID_RE.test(id) ? id : null;
}

/** One database read per request, shared by generateMetadata and the page. */
const loadDocument = cache(async (id: string) => getDocument(id));

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const robots = { index: false, follow: false };
  const id = await readId(searchParams);
  const doc = id ? await loadDocument(id) : null;
  if (!doc) return { title: "Document introuvable", robots };
  return { title: `${doc.number} – ${doc.siteShortName}`, robots };
}

export default async function PdfPage({ searchParams }: { searchParams: SearchParams }) {
  const id = await readId(searchParams);
  if (!id) notFound();
  const doc = await loadDocument(id);
  if (!doc) notFound();

  const shareUrl = `${env.baseUrl}/pdf?id=${doc.id}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 240 });

  return (
    <div className="min-h-dvh bg-background print:bg-transparent">
      <header className="no-print sticky top-0 z-40 border-b bg-background/95">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
          <Link href="/" aria-label="BKTK International, accueil" className="shrink-0 rounded-md">
            <Logo showText="sm" />
          </Link>
          <div className="ml-auto">
            <DocumentActions id={doc.id} shareUrl={shareUrl} title={`${kindLabel(doc.kind)} ${doc.number} – ${doc.siteShortName}`} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-10 print:max-w-none print:p-0">
        <DocumentView doc={doc} qrDataUrl={qrDataUrl} />
        <p className="no-print mx-auto mt-4 max-w-3xl px-1 text-center text-xs text-muted-foreground">
          Pour imprimer, ouvrez le PDF puis utilisez l’impression de votre appareil.
        </p>
      </main>
    </div>
  );
}
