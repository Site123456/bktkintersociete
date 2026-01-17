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
interface SiteInfo {
  name: string;
  line1: string;
  line2: string;
}


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
    const boxWidth = 0.8;
    const boxHeight = 0.8;
    let x = 82;
    for (let i = 0; i < id.length; i++) {
        const shade = Math.floor(Math.random() * 151) + 50;
        pdf.setFillColor(shade, shade, shade);

        pdf.roundedRect(x, top - boxHeight + 6, boxWidth, boxHeight, 0.4, 0.4, "F");

        x += boxWidth + 0.5;
    }
    x = 82.2;
    pdf.setFontSize(2).setTextColor(20);
    for (let i = 0; i < id.length; i++) {
        pdf.text(id[i], x, 36.8);
        x += 1.3;
    }
    x = 82;
    for (let i = 0; i < id.length; i++) {
        const shade = Math.floor(Math.random() * 151) + 50;
        pdf.setFillColor(shade, shade, shade);

        pdf.roundedRect(x, top - boxHeight + 7.8, boxWidth, boxHeight, 0.4, 0.4, "F");

        x += boxWidth + 0.5;
    }


    pdf.setFontSize(9).setTextColor(40);

    pdf.text(`Fait le : ${safe(delivery.date)}`, M, top + 2);
    pdf.setFontSize(18).setTextColor(200);
    pdf.text(`${safe(delivery.username).toUpperCase().slice(0, 20)}`, 82, top + 4, {
      align: "left",
    });
    pdf.setFontSize(8).setTextColor(0);

    pdf.roundedRect(80, top - 2, 80, 10, 1.2, 1.2);
    
    pdf.text(`Expedition date / Date d'envoi`, 82, 48, {
      align: "left",
    });
    pdf.roundedRect(70, 44, 90, 20, 1.2, 1.2);
    pdf.setFontSize(8).setTextColor(100);
    pdf.text(`${safe(delivery.signedBy)}`, mid, top + 7, {
      align: "right",
    });
    pdf.setFontSize(9).setTextColor(40);
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
  if (delivery.items.length > 20) {
    const ROW_H = 12;
    const FIRST_PAGE_TOP_Y = 70;
    const OTHER_PAGE_TOP_Y = 20;
    const BOTTOM_MARGIN = 20;
    function getRowsPerPage(topY: number) {
      return Math.floor((H - topY - BOTTOM_MARGIN) / ROW_H);
    }

    /* ================= PAGE HEADER ================= */
    function drawPageHeader(page: number, delivery: string, site: SiteInfo, deliverydate: string) {
      const headerTop = 6;
      const headerHeight = 18;

      /* ===== Bottom Divider ===== */
      pdf.setDrawColor(200);
      pdf.line(M, headerTop + headerHeight - 6, W - M, headerTop + headerHeight - 6);

      /* ===== Left Block: Site + Title ===== */
      pdf.setFontSize(14).setTextColor(40);
      pdf.text(
        `BKTK INTL. `,
        M,
        headerTop + 6
      );
      pdf.setFontSize(9).setTextColor(80);
      pdf.text(
        `- Bon de livraison pour ` + deliverydate,
        M + 28,
        headerTop + 5.5
      );

      pdf.text(
        `${site.name}`,
        W-M-14,
        headerTop + 9,
        { align: "right" }
      );
      /* ===== Right Block: Delivery Ref + Page ===== */
      pdf.setFontSize(9).setTextColor(60);
      pdf.text(
        `Ref: ${safe(delivery)}`,
        W - M,
        headerTop + 4,
        { align: "right" }
      );

      pdf.setFontSize(8).setTextColor(120);
      pdf.text(
        `Page ${page + 1}`,
        W - M,
        headerTop + 9,
        { align: "right" }
      );
    }


    /* ================= TABLE HEADER ================= */
    function drawTableHeader() {
      const headerY = y + 1.5;

      pdf.setFontSize(9).setTextColor(40);

      pdf.text("#", M + 2, headerY);
      pdf.text("Article", M + 16, headerY);
      pdf.text("Qté", W / 2 - 4, headerY, { align: "right" });

      pdf.text("#", W / 2 + 2, headerY);
      pdf.text("Article", W / 2 + 16, headerY);
      pdf.text("Qté", W - M - 2, headerY, { align: "right" });

      y += 6;
      pdf.setDrawColor(180);
      pdf.line(M, y, W - M, y);
      y += 2;
    }

    const items = delivery.items;

    let globalIndex = 1;
    let itemCursor = 0;
    let page = 0;

    while (itemCursor < items.length) {
      const isFirstPage = page === 0;
      const TOP_Y = isFirstPage ? FIRST_PAGE_TOP_Y : OTHER_PAGE_TOP_Y;
      const ROWS_PER_PAGE = getRowsPerPage(TOP_Y);
      const itemsPerPage = ROWS_PER_PAGE * 2;
      if (page > 0) pdf.addPage();
      const site = getSiteHeader(delivery.site?.slug);
      if(site && !isFirstPage) drawPageHeader(page, delivery.ref, site, delivery.date);
      

      y = TOP_Y;
      drawTableHeader();

      const pageItems = items.slice(
        itemCursor,
        itemCursor + itemsPerPage
      );

      const half = Math.ceil(pageItems.length / 2);
      const leftCol = pageItems.slice(0, half);
      const rightCol = pageItems.slice(half);

      const maxRows = Math.max(leftCol.length, rightCol.length);

      for (let i = 0; i < maxRows; i++) {
        const rowY = y + 4;
        const isGray = i % 2 === 1;

        if (isGray) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(M, y - 1, W - M * 2, ROW_H, "F");
        }

        pdf.setDrawColor(200);
        pdf.line(116, y - 14, 116, y - 3 + ROW_H);
        pdf.line(W / 2, y - 14, W / 2, y - 3 + ROW_H);

        /* LEFT */
        const left = leftCol[i];
        if (left) {
          pdf.setFontSize(9).setTextColor(30);
          pdf.text(String(globalIndex), M + 2, rowY);
          pdf.text(
            pdf.splitTextToSize(left.name, (W / 2) - M - 30),
            M + 16,
            rowY
          );
          pdf.setFontSize(8).setTextColor(120);
          pdf.text(left.unit, M + 16, rowY + 4);
          pdf.setFontSize(9).setTextColor(30);
          pdf.text(String(left.qty), W / 2 - 4, rowY, { align: "right" });
          globalIndex++;
        }

        /* RIGHT */
        const right = rightCol[i];
        if (right) {
          pdf.setFontSize(9).setTextColor(30);
          pdf.text(String(globalIndex), W / 2 + 2, rowY);
          pdf.text(
            pdf.splitTextToSize(right.name, (W / 2) - M - 30),
            W / 2 + 16,
            rowY
          );
          pdf.setFontSize(8).setTextColor(120);
          pdf.text(right.unit, W / 2 + 16, rowY + 4);
          pdf.setFontSize(9).setTextColor(30);
          pdf.text(String(right.qty), W - M - 2, rowY, { align: "right" });
          globalIndex++;
        }

        y += ROW_H;
      }

      itemCursor += itemsPerPage;
      page++;
    }
  }

 else {

    // Column titles (slightly bolder feel)
    const headerY = y + 1.5; // subtle vertical centering

    pdf.text("#", M + 2, headerY);
    pdf.text("Article", M + 16, headerY);
    pdf.text("Qté", W - M - 24, headerY, { align: "right" });

    y += 6;

    // Bottom separator (slightly darker for structure)
    pdf.setDrawColor(180);
    pdf.line(M, y, W - M, y);

    y += 2;
    delivery.items.forEach((item: DeliveryItem, i: number) => {
      addPageIfNeeded(10);

      const rowH = 10;
      const baseY = y + 3;
      const isGray = i % 2 === 1;

      // Background stripe
      if (isGray) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(M, y - 1, W - M * 2, rowH, "F");
      }

      // Shared text styles
      pdf.setTextColor(30);

      // Index
      pdf.setFontSize(9);
      pdf.text(String(i + 1), M + 2, baseY);

      // Item name
      pdf.text(pdf.splitTextToSize(item.name, W - 110), M + 14, baseY);

      // Unit (sub‑label)
      pdf.setFontSize(8).setTextColor(120);
      pdf.text(item.unit, M + 16, baseY + 4);

      // Quantity
      pdf.setFontSize(9).setTextColor(30);
      pdf.text(String(item.qty), W - M - 26, baseY, { align: "right" });

      y += rowH;
    });
  }


  /* Footer on all pages */
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }
  const fileName = `bon-de-livraison-${delivery.site?.slug}-${safe(delivery.ref)}.pdf`;
  return new NextResponse(pdf.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });

}
