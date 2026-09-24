import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { known } from "@/components/pdf/DocumentBar";
import { DocumentPage } from "@/components/pdf/DocumentPage";
import { getDocument } from "@/lib/deliveries";
import { env } from "@/lib/env";

/*
 * Public page of one document: the QR code printed on every bon de livraison / état des stocks and
 * the links shared from the app point here, so it works without signing in (ids are 24 hex characters,
 * pages are not indexed). It shows the real PDF (the same file as /api/pdf) in a minimal viewer.
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
  const site = known(doc.siteShortName);
  return { title: site ? `${doc.number} – ${site}` : doc.number, robots };
}

export default async function PdfPage({ searchParams }: { searchParams: SearchParams }) {
  const id = await readId(searchParams);
  if (!id) notFound();
  const doc = await loadDocument(id);
  if (!doc) notFound();

  return <DocumentPage doc={doc} shareUrl={`${env.baseUrl}/pdf?id=${doc.id}`} />;
}
