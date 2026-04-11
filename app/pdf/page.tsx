import QRCode from "qrcode";
import PdfViewerClient from "./PdfViewerClient";
import connectDB from "@/lib/connectDB";
import mongoose from "mongoose";

export default async function PdfPage({ searchParams }: { searchParams: { id?: string } }) {
  const { id } = await searchParams; // In Next 15 searchParams is a Promise
  
  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-xl font-bold">Document introuvable (Error 404)</p>
      </div>
    );
  }

  const shareUrl = `https://bktk.indian-nepaliswad.fr/pdf?id=${id}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 200, color: { dark: "#000000", light: "#ffffff" } });

  // Fetch delivery details for UI context
  await connectDB();
  const db = mongoose.connection.db!;
  const delivery = await db.collection("deliveries").findOne({ _id: new mongoose.Types.ObjectId(id) });

  const siteName = delivery?.site?.name || delivery?.username || "BKTK";
  const docType = delivery?.docType || "delivery";
  const ref = delivery?.ref || id.slice(0, 8);

  return (
    <PdfViewerClient 
      id={id} 
      shareUrl={shareUrl} 
      qrDataUrl={qrDataUrl} 
      siteName={siteName}
      docType={docType}
      refId={ref}
    />
  );
}
