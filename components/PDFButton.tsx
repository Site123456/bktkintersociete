"use client";

import { jsPDF } from "jspdf";
import { Delivery } from "@/types/delivery";
import { SITE_HEADERS } from "@/lib/sites";

type PDFButtonProps = {
  delivery: Delivery;
  full?: boolean; // optional full-width style
};

export default function PDFButton({ delivery, full }: PDFButtonProps) {
  const generatePDF = () => {
    const pdf = new jsPDF();
    let y = 20;

    // Header
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
    pdf.text(`Date: ${delivery.date}`, 190, 32, { align: "right" });
    pdf.text(`Livraison demandé: ${delivery.requestedDeliveryDate}`, 190, 38, {
      align: "right",
    });
    pdf.text(`Signé par: ${delivery.signedBy}`, 190, 50, { align: "right" });

    pdf.setFontSize(6);
    pdf.text(`REF:${delivery.ref}`, 238, 60, {
      align: "right",
      angle: 90,
    });

    // Client
    y = 46;
    pdf.setFontSize(10);
    pdf.text("Pour le site :", 14, y);

    if (delivery.site) {
      const header = SITE_HEADERS[delivery.site.slug];
      let y2 = 50;

      pdf.text(header.name, 14, y2);
      y2 += 5;

      pdf.text(header.line1, 14, y2);
      y2 += 5;

      pdf.text(header.line2, 14, y2);
      y2 += 10;
    }

    // Table header
    y += 30;
    pdf.setFillColor(40, 40, 40);
    pdf.rect(14, y, 182, 8, "F");

    pdf.setTextColor(255);
    pdf.text("#", 16, y + 5);
    pdf.text("Article & Description", 28, y + 5);
    pdf.text("Quantité", 180, y + 5, { align: "right" });

    pdf.setTextColor(0);
    y += 15;

    // Rows
    delivery.items.forEach((l, i) => {
      pdf.text(String(i + 1), 16, y);
      pdf.text(l.name, 28, y);
      pdf.text(l.unit, 28, y + 4);
      pdf.text(`${l.qty}`, 180, y, { align: "right" });
      y += 14;
    });

    pdf.setLineWidth(0.1);
    pdf.roundedRect(10, 10, 190, 60, 4, 4);

    pdf.save(`bon-de-livraison-${delivery._id}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className={`
        px-3 py-1.5 rounded-md text-sm font-medium text-white
        bg-primary hover:bg-primary/90 transition
        ${full ? "w-full justify-center flex" : "inline-flex"}
      `}
    >
      Télécharger PDF
    </button>
  );
}
