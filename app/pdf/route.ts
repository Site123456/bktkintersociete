import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { SITE_HEADERS } from "@/lib/sites";

/* ================= HELPERS ================= */

const safe = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : "";

const getSiteHeader = (slug?: string) =>
  slug ? SITE_HEADERS[slug as keyof typeof SITE_HEADERS] ?? null : null;

type DeliveryItem = {
  name: string;
  qty: number;
  unit: string;
};


export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");

  if (!id) return new NextResponse("Missing ID", { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(id))
    return new NextResponse("Invalid ID", { status: 404 });

  await connectDB();
  const db = mongoose.connection.db!;
  const delivery = await db
    .collection("deliveries")
    .findOne({ _id: new mongoose.Types.ObjectId(id) });

  if (!delivery) return new NextResponse("Not found", { status: 404 });

  /* ================= PDF SETUP ================= */

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 16;

  let y = 20;

  /* ================= QR ================= */

  const qrDataUrl = await QRCode.toDataURL(
    `https://bktkintersociete.vercel.app/pdf?id=${id}`,
    { margin: 0, width: 160 }
  );

  /* ================= HEADER (PAGE 1) ================= */

  const drawHeader = () => {
    pdf.setFontSize(10).setTextColor(30);
    pdf.text("BKTK INTERNATIONAL", M, 14);
    
    pdf.setFontSize(8).setTextColor(110);
    pdf.text("1 Avenue Louis Blériot, Local A22", M, 18);
    pdf.text("93120 La Courneuve – France", M, 22);

    pdf.setFontSize(23).setTextColor(20);
    pdf.text("BON DE LIVRAISON", W - M, 16, { align: "right" });

    pdf.setFontSize(8.5).setTextColor(110);
    pdf.text(`REF : ${safe(delivery.ref)}`, W - M, 22, { align: "right" });

    pdf.setDrawColor(220);
    pdf.line(M, 26, W - M, 26);

    /* Metadata grid */
    const mid = W - (W / 4);
    const top = 30;

    pdf.setFontSize(9).setTextColor(40);

    pdf.text(`Fait le : ${safe(delivery.date)}`, M, top + 2);
    pdf.text(`Utilisateur : ${safe(delivery.username).toUpperCase()}`, mid, top + 2, {
      align: "right",
    });

    pdf.text(
      `Demandée pour : ${safe(delivery.requestedDeliveryDate)}`,
      M,
      top + 6
    );
    pdf.text(`Mail : ${safe(delivery.signedBy)}`, mid, top + 6, {
      align: "right",
    });
    pdf.setFontSize(8);
    pdf.text(`Verify in : https://bktkintersociete.vercel.app/pdf?id=${id}`, mid, top + 12, {
      align: "right",
    });

    const site = getSiteHeader(delivery.site?.slug);
    if (site) {
      pdf.setFontSize(10);
      pdf.text(`${site.name}`, M, top + 18);
      pdf.setFontSize(9).setTextColor(110);
      pdf.text(site.line1, M, top + 22);
      pdf.text(site.line2, M, top + 26);
    }

    /* QR */
    pdf.addImage(qrDataUrl, "PNG", W - M - 30, top - 2, 30, 30);

    pdf.setDrawColor(225);

    y = 64;
  };

  /* ================= COMPACT HEADER (OTHER PAGES) ================= */

  const drawCompactHeader = () => {
    pdf.setFontSize(10).setTextColor(30);
    pdf.text("BON DE LIVRAISON", M, 14);

    pdf.setFontSize(8).setTextColor(110);
    pdf.text(`REF : ${safe(delivery.ref)}`, W - M, 14, { align: "right" });

    pdf.setDrawColor(220);
    pdf.line(M, 18, W - M, 18);

    y = 28;
  };

  /* ================= FOOTER ================= */

  const drawFooter = (page: number, total: number) => {
    pdf.setDrawColor(230);
    pdf.line(M, H - 18, W - M, H - 18);

    pdf.setFontSize(7.5).setTextColor(120);
    pdf.text(`Page ${page} / ${total}`, W / 2, H - 10, { align: "center" });
    pdf.text("BKTK INTERNATIONAL", W - M, H - 10, { align: "right" });
  };

  /* ================= PAGE FLOW ================= */

  const addPageIfNeeded = (h = 12) => {
    if (y + h > H - 12) {
      pdf.addPage();
      drawCompactHeader();
    }
  };

  /* ================= RENDER ================= */

  drawHeader();

  /* Table header */
  pdf.setFontSize(9).setTextColor(40);
  pdf.setDrawColor(225);
  pdf.line(M, y, W - M, y);
  y += 6;

  pdf.text("#", M + 2, y);
  pdf.text("Article", M + 14, y);
  pdf.text("Qté", W - M - 2, y, { align: "right" });

  y += 3;
  pdf.setDrawColor(235);
  pdf.line(M, y, W - M, y);
  y += 7;

  /* Items */
  delivery.items.forEach((item: DeliveryItem, i: number) => {
    addPageIfNeeded(12);

    pdf.setFontSize(9).setTextColor(30);
    pdf.text(String(i + 1), M + 2, y);

    pdf.text(pdf.splitTextToSize(item.name, W - 110), M + 14, y);

    pdf.setFontSize(8).setTextColor(120);
    pdf.text(item.unit, M + 14, y + 4);

    pdf.setFontSize(9).setTextColor(30);
    pdf.text(String(item.qty), W - M - 2, y, { align: "right" });

    y += 12;
  });

  /* Footer on all pages */
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  /* ================= RESPONSE ================= */

  return new NextResponse(pdf.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=delivery.pdf",
    },
  });
}
