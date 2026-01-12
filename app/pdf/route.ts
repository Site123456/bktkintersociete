import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";
import jsPDF from "jspdf";
import { SITE_HEADERS } from "@/lib/sites";

type DeliveryItem = {
  name: string;
  qty: number;
  unit: string;
};

type Delivery = {
  _id: string;
  date: string;
  requestedDeliveryDate: string;
  signedBy: string;
  ref: string;
  site: { slug: string } | null;
  items: DeliveryItem[];
};

const safe = (v: unknown): string =>
  typeof v === "string" || typeof v === "number" ? String(v) : "";

function getSiteHeader(slug: string | undefined | null) {
  if (!slug) return null;
  if (slug in SITE_HEADERS) {
    return SITE_HEADERS[slug as keyof typeof SITE_HEADERS];
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing ID", { status: 400 });
  }

  await connectDB();
  const db = mongoose.connection.db!;
  if (!mongoose.Types.ObjectId.isValid(id)) { return new NextResponse("Invalid delivery ID", { status: 404 }); }
  const delivery = await db
    .collection("deliveries")
    .findOne({ _id: new mongoose.Types.ObjectId(id) });

  if (!delivery) {
    return new NextResponse("Delivery not found", { status: 404 });
  }

  const pdf = new jsPDF();
  let y = 20;

  /* ------------------------------ HEADER ------------------------------ */

  pdf.setFontSize(10);
  pdf.text("BKTK INTERNATIONAL", 14, y);
  y += 6;
  pdf.text("1 Avenue Louis Blériot, Local: A22", 14, y);
  y += 5;
  pdf.text("La Courneuve, 93120 – France", 14, y);
  y += 5;
  pdf.text("+33 9 77 37 61 67", 14, y);

  pdf.setFontSize(20);
  pdf.text("BON DE LIVRAISON", 190, 24, { align: "right" });

  pdf.setFontSize(10);
  pdf.text(`Date: ${safe(delivery.date)}`, 190, 32, { align: "right" });
  pdf.text(
    `Livraison demandé: ${safe(delivery.requestedDeliveryDate)}`,
    190,
    38,
    { align: "right" }
  );
  pdf.text(`Signé par: ${safe(delivery.signedBy)}`, 190, 50, {
    align: "right",
  });

  pdf.setFontSize(6);
  pdf.text(`REF:${safe(delivery.ref)}`, 238, 60, {
    align: "right",
    angle: 90,
  });

  /* ------------------------------ SITE ------------------------------ */

  y = 46;
  pdf.setFontSize(10);
  pdf.text("Pour le site :", 14, y);

  const header = getSiteHeader(delivery.site?.slug);

  if (header) {
    let y2 = 50;

    pdf.text(safe(header.name), 14, y2);
    y2 += 5;

    pdf.text(safe(header.line1), 14, y2);
    y2 += 5;

    pdf.text(safe(header.line2), 14, y2);
    y2 += 10;
  }

  /* ------------------------------ TABLE HEADER ------------------------------ */

  y += 30;
  pdf.setFillColor(40, 40, 40);
  pdf.rect(14, y, 182, 8, "F");

  pdf.setTextColor(255);
  pdf.text("#", 16, y + 5);
  pdf.text("Article & Description", 28, y + 5);
  pdf.text("Quantité", 180, y + 5, { align: "right" });

  pdf.setTextColor(0);
  y += 15;

  /* ------------------------------ ITEMS ------------------------------ */
  delivery.items.forEach((l: DeliveryItem, i: number) => {
    pdf.text(String(i + 1), 16, y);
    pdf.text(safe(l.name), 28, y);
    pdf.text(safe(l.unit), 28, y + 4);
    pdf.text(safe(l.qty), 180, y, { align: "right" });
    y += 14;
  });


  pdf.setLineWidth(0.1);
  pdf.roundedRect(10, 10, 190, 60, 4, 4);

  const buffer = pdf.output("arraybuffer");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=delivery.pdf",
    },
  });
}
