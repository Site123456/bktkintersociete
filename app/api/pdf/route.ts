import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/http";
import { getDocument } from "@/lib/deliveries";
import { renderDeliveryNote } from "@/lib/pdf/delivery-note";

export const runtime = "nodejs";

const plain = (body: string, status: number) =>
  new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * GET /api/pdf?id=<id>[&download=1] → the document as PDF.
 * Open without sign-in on purpose: the QR code printed on each document and the links shared by the
 * mobile app point here. Ids are 24 hex characters, requests are rate-limited, pages are not indexed.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "pdf", 60);
  if (limited) return limited;

  const params = new URL(req.url).searchParams;
  const id = params.get("id")?.trim() ?? "";
  if (!id) return plain("Missing ID", 400);
  if (!/^[a-f0-9]{24}$/i.test(id)) return plain("Not found", 404);

  try {
    const doc = await getDocument(id);
    if (!doc) return plain("Not found", 404);

    const pdf = await renderDeliveryNote(doc, { url: `${env.baseUrl}/pdf?id=${doc.id}` });
    const prefix = doc.kind === "stock" ? "etat-des-stocks" : "bon-de-livraison";
    const fileName = `${prefix}-${doc.number}-${doc.siteSlug ?? "BKTK"}.pdf`.replace(/[^A-Za-z0-9._-]/g, "_");
    const disposition = params.get("download") === "1" ? "attachment" : "inline";

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    console.error("pdf", err instanceof Error ? err.message : err);
    return plain("Server error", 500);
  }
}
