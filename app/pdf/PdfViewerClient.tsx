"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Copy, CheckCircle2, ChevronLeft, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  shareUrl: string;
  qrDataUrl: string;
}

export default function PdfViewerClient({ id, shareUrl, qrDataUrl }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    setPdfUrl(`/api/pdf?id=${id}`);
  }, [id]);

  const handleCopy = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for insecure contexts
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BKTK Document",
          text: "Voici le document de commande / stock de BKTK.",
          url: shareUrl,
        });
      } catch (err) {
        console.error("Erreur de partage:", err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative">
      
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 border-b lg:border-r border-border/50 bg-card/80 backdrop-blur-xl shrink-0 p-6 flex flex-col gap-8 shadow-2xl z-10 lg:order-1 order-2">
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition mr-auto bg-muted/40 p-2 pr-4 rounded-xl border"
        >
          <ChevronLeft size={16} /> Retour au menu
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ScanLine size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Accès Rapide</h2>
              <p className="text-xs text-muted-foreground">Scannez ou partagez</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow-sm border border-border/10 flex justify-center w-full max-w-[200px] mx-auto">
            <img src={qrDataUrl} alt="QR Code" className="w-full h-auto object-contain" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={handleShare}
              className="px-4 py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition"
            >
              <Share2 size={16} /> Partager
            </button>
            <button 
              onClick={handleCopy}
              className="px-4 py-3 bg-muted font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-muted/80 active:scale-95 transition border"
            >
              {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? "Copié!" : "Copier"}
            </button>
          </div>
        </div>

        <div className="mt-auto pt-8">
           <a 
            href={pdfUrl}
            download={`Document-${id}.pdf`}
            className="w-full px-4 py-4 bg-background border border-border font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-sm group"
          >
            <Download size={18} className="text-muted-foreground group-hover:text-primary transition" /> Télécharger ({id.slice(0,6)})
          </a>
        </div>
      </div>

      {/* PDF Viewport */}
      <div className="flex-1 h-[60vh] lg:h-screen w-full bg-muted/10 relative order-1 lg:order-2 overflow-hidden">
        {pdfUrl ? (
           <iframe 
            src={`${pdfUrl}#view=FitH`} 
            className="w-full h-full border-none"
            title="PDF Document"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full opacity-50 animate-pulse">
             <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold">Chargement...</p>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}
