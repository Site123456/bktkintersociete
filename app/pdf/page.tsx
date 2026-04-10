import QRCode from "qrcode";
import PdfViewerClient from "./PdfViewerClient";

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

  return (
    <PdfViewerClient 
      id={id} 
      shareUrl={shareUrl} 
      qrDataUrl={qrDataUrl} 
    />
  );
}
