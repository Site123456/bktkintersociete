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

    pdf.setFontSize(6).setTextColor(20);
    pdf.text(`Encripted zone, do not write in this zone`, 84, top);
    const boxWidth = 0.8;
    const boxHeight = 0.8;
    let x = 126;
    for (let i = 0; i < id.length; i++) {
        const shade = Math.floor(Math.random() * 151) + 50;
        pdf.setFillColor(shade, shade, shade);

        pdf.roundedRect(x, top - boxHeight + 0.8, boxWidth, boxHeight, 0.4, 0.4, "F");

        x += boxWidth + 0.5;
    }
    x = 126.2;
    pdf.setFontSize(2).setTextColor(20);
    for (let i = 0; i < id.length; i++) {
        pdf.text(id[i], x, 29.5);
        x += 1.3;
    }
    x = 126;
    for (let i = 0; i < id.length; i++) {
        const shade = Math.floor(Math.random() * 151) + 50;
        pdf.setFillColor(shade, shade, shade);

        pdf.roundedRect(x, top - boxHeight + 2, boxWidth, boxHeight, 0.4, 0.4, "F");

        x += boxWidth + 0.5;
    }
    x = 126;
    for (let i = 0; i < id.length; i++) {
        // Set solid black color
        const shade = Math.floor(Math.random() * 151) + 100;
        pdf.setFillColor(shade, shade, shade); // RGB random dark gray

        pdf.roundedRect(x, top - boxHeight + 3.2, boxWidth, boxHeight, 0.4, 0.4, "F");

        x += boxWidth + 0.5; // move to next box
    }


    pdf.setFontSize(9).setTextColor(40);

    pdf.text(`Fait le : ${safe(delivery.date)}`, M, top + 2);
    pdf.setFontSize(20).setTextColor(200);
    pdf.text(`${safe(delivery.username).toUpperCase()}`, 82, top + 6, {
      align: "left",
    });
    pdf.setFontSize(9).setTextColor(100);

    pdf.roundedRect(80, top - 2, 80, 10, 1.2, 1.2);
    pdf.text(`${safe(delivery.signedBy)}`, mid, top + 7, {
      align: "right",
    });
    pdf.setTextColor(40);
    pdf.text(
      `Demandée pour : ${safe(delivery.requestedDeliveryDate)}`,
      M,
      top + 6
    );
    pdf.setFontSize(8);
    pdf.text(`https://bktkintersociete.vercel.app/pdf?id=${id}`, mid, top + 12, {
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
      pdf.setFillColor(245, 245, 245);
    }
  };

  /* ================= RENDER ================= */

  drawHeader();

  /* Table Header */
  pdf.setFontSize(9.5).setTextColor(30);

  // Top separator (very light)
  pdf.setDrawColor(200);
  pdf.line(M, y, W - M, y);
    // 5 solid colors as RGB tuples
  const swatches: [number, number, number][] = [
    [230, 230, 230], // white
    [180, 180, 180], // light gray
    [120, 120, 120], // dark gray
    [0, 0, 0],       // black
  ];

  let sy = 60; // starting Y
  const swatchW = 4;
  const swatchH = 4;

  swatches.forEach(([r, g, b]) => {
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(-1, sy, swatchW, swatchH, 1.2, 1.2, "F");

    sy += swatchH + 2; // spacing between swatches
  });
  sy = 240;
  swatches.forEach(([r, g, b]) => {
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(W-3, sy, swatchW, swatchH, 1.2, 1.2, "F");
    sy += swatchH + 2; // spacing between swatches
  });


  y += 5;

  // Column titles (slightly bolder feel)
  const headerY = y + 1.5; // subtle vertical centering

  pdf.text("#", M + 2, headerY);
  pdf.text("Article", M + 14, headerY);
  pdf.text("Qté", W - M - 2, headerY, { align: "right" });

  y += 6;

  // Bottom separator (slightly darker for structure)
  pdf.setDrawColor(180);
  pdf.line(M, y, W - M, y);

  y += 2;
  /* Items */
  delivery.items.forEach((item: DeliveryItem, i: number) => {
    addPageIfNeeded(14);

    const rowHeight = 14;
    const isGray = i % 2 === 1;

    // Background stripe
    if (isGray) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(M, y - 1, W - M * 2, rowHeight, "F");
    }

    // Vertical centering offset
    const baseY = y + 5; // shifts text slightly down for better centering

    /* === Left index (#) === */
    pdf.setFontSize(9).setTextColor(30);
    pdf.text(String(i + 1), M + 2, baseY);

    /* === Item name === */
    pdf.text(
      pdf.splitTextToSize(item.name, W - 110),
      M + 14,
      baseY
    );

    /* === Unit (slightly below center) === */
    pdf.setFontSize(8).setTextColor(120);
    pdf.text(item.unit, M + 14, baseY + 4);

    /* === Quantity (center aligned vertically) === */
    pdf.setFontSize(9).setTextColor(30);
    pdf.text(String(item.qty), W - M - 2, baseY, { align: "right" });

    y += rowHeight;
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
