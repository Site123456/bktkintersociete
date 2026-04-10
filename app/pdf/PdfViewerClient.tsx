"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Copy, CheckCircle2, ChevronLeft, ScanLine, X, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  id: string;
  shareUrl: string;
  qrDataUrl: string;
}

export default function PdfViewerClient({ id, shareUrl, qrDataUrl }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setPdfUrl(`/api/pdf?id=${id}`);
  }, [id]);

  const handleCopy = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); } catch (err) { console.error(err); }
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
      } catch (err) { console.error(err); }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">

      {/* IMMERSIVE HEADER */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 inset-x-0 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 bg-gradient-to-b from-black/80 to-transparent z-50 pointer-events-none"
      >
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => router.push("/")}
            className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-white/20 transition-all border border-white/10"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-white text-xs sm:text-sm font-black tracking-tight uppercase">Document Portal</h1>
            <span className="text-white/50 text-[10px] sm:text-xs font-bold font-mono">ID: {id.slice(0, 10)}...</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <a
            href={pdfUrl} target="_blank"
            className="h-9 px-3 sm:px-4 bg-white/10 backdrop-blur-md rounded-xl text-white text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/20 transition-all border border-white/10"
          >
            <ExternalLink size={14} /> <span className="hidden sm:inline">Plein Écran</span>
          </a>
        </div>
      </motion.header>

      {/* PDF VIEWPORT (FULL IMMERSION) */}
      <main className="flex-1 w-full bg-[#0a0a0a] relative flex items-center justify-center overflow-hidden">
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0`}
            className="w-full h-full border-none lg:max-w-7xl mx-auto shadow-2xl"
            title="PDF Document"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-40">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white text-sm font-bold tracking-widest uppercase">Initialisation...</p>
          </div>
        )}
      </main>

      {/* FLOATING ACTION PANEL (MINIMIZABLE) */}
      <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-3 pointer-events-none">
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-black/60 backdrop-blur-2xl border border-white/20 p-5 sm:p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[280px] sm:w-[320px] pointer-events-auto overflow-hidden relative"
            >
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none"></div>

              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsMinimized(true)}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                      <ScanLine size={20} />
                    </div>
                    <div>
                      <h2 className="text-white font-black text-sm uppercase tracking-tight">Accès Rapide</h2>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Scannez & Partagez</p>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition group-hover:bg-white/10">
                    <Minimize2 size={14} />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-3xl shadow-2xl flex justify-center w-full max-w-[180px] mx-auto group">
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleShare}
                      className="h-12 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                    >
                      <Share2 size={14} /> Partager
                    </button>
                    <button
                      onClick={handleCopy}
                      className="h-12 bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all border border-white/10"
                    >
                      {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                      {copied ? "Prêt!" : "Copier"}
                    </button>
                  </div>
                  <a
                    href={pdfUrl}
                    download={`BKTK-${id.slice(0, 6)}.pdf`}
                    className="h-12 w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5"
                  >
                    <Download size={14} /> Télécharger PDF
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          layout
          onClick={() => setIsMinimized(!isMinimized)}
          className={`h-14 w-14 sm:h-16 sm:w-16 rounded-[2rem] bg-black/60 backdrop-blur-xl border border-white/20 pointer-events-auto flex items-center justify-center text-white shadow-2xl transition-all hover:border-primary/50 group ${isMinimized ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}`}
        >
          {isMinimized ? (
            <div className="relative">
              <ScanLine size={24} className="group-hover:text-primary transition-colors" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-black animate-pulse"></div>
            </div>
          ) : <X size={20} />}
        </motion.button>
      </div>

    </div>
  );
}

