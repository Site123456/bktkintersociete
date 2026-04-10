"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Download, Share2, Copy, CheckCircle2, ChevronLeft, ScanLine, 
  X, Minimize2, ExternalLink, ZoomIn, ZoomOut, 
  RotateCcw, Hand, MousePointer2 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page, pdfjs } from "react-pdf";

// CSS for react-pdf (text layers and annotations)
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [dragMode, setDragMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPdfUrl(`/api/pdf?id=${id}`);
  }, [id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 3.0));
  };

  const resetZoom = () => setScale(1.0);

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
          title: `BKTK - ${id.slice(0, 6)}`,
          text: "Voici le document de commande / stock de BKTK.",
          url: shareUrl,
        });
      } catch (err) { console.error(err); }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#070707] flex flex-col overflow-hidden">
      
      {/* IMMERSIVE HEADER */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 inset-x-0 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 bg-gradient-to-b from-black/90 to-transparent z-50 pointer-events-none"
      >
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => router.push("/")}
            className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-xl text-white hover:bg-white/10 transition-all border border-white/10"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-white text-[10px] sm:text-[11px] font-black tracking-[0.2em] uppercase opacity-60">Operations Portal</h1>
            <span className="text-white text-xs sm:text-sm font-bold tracking-tight">Doc ID: {id.slice(0, 12)}...</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex items-center bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/5 mr-4">
             <button 
              onClick={() => setDragMode(false)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg transition ${!dragMode ? 'bg-primary text-primary-foreground shadow-lg' : 'text-white/40 hover:text-white'}`}
              title="Sélection"
            >
              <MousePointer2 size={16} />
            </button>
            <button 
              onClick={() => setDragMode(true)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg transition ${dragMode ? 'bg-primary text-primary-foreground shadow-lg' : 'text-white/40 hover:text-white'}`}
              title="Main (Drag)"
            >
              <Hand size={16} />
            </button>
          </div>
          <a 
            href={pdfUrl} target="_blank"
            className="h-9 px-3 sm:px-4 bg-primary text-primary-foreground rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <ExternalLink size={14} /> <span className="hidden sm:inline">PDF Natif</span>
          </a>
        </div>
      </motion.header>

      {/* INTERACTIVE PDF VIEWPORT */}
      <main 
        ref={containerRef}
        className={`flex-1 w-full bg-[#070707] relative flex justify-center overflow-auto no-scrollbar scroll-smooth ${dragMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      >
        <div className="min-h-full py-20 px-4 sm:px-10 flex flex-col items-center">
          {pdfUrl ? (
             <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center gap-3 py-40 opacity-40">
                  <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white text-[10px] font-black tracking-widest uppercase">Chargement du moteur...</p>
                </div>
              }
              error={<p className="text-white/50 text-sm font-bold p-20">Erreur lors de l'affichage du PDF.</p>}
            >
              {Array.from(new Array(numPages), (el, index) => (
                <motion.div
                  key={`page_${index + 1}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] rounded-sm overflow-hidden border border-white/5"
                  style={{ transformOrigin: "top center", scale }}
                >
                  <Page 
                    pageNumber={index + 1} 
                    width={typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.9, 1000) : 800}
                    loading={<div className="bg-white/5 h-[800px] w-full animate-pulse"></div>}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </motion.div>
              ))}
            </Document>
          ) : null}
        </div>
      </main>

      {/* FLOATING CONTROL HUD (ZOOM + ACTIONS) */}
      <div className="absolute bottom-6 inset-x-4 sm:inset-x-auto sm:right-8 sm:bottom-8 z-50 flex flex-col items-center sm:items-end gap-3 pointer-events-none">
        
        {/* Zoom Controls Overlay */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-black/40 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl flex items-center gap-1 shadow-2xl pointer-events-auto mb-2"
            >
               <button 
                onClick={() => handleZoom(-0.1)}
                className="h-10 w-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Dézoomer"
              >
                <ZoomOut size={18} />
              </button>
              <div className="px-3 min-w-[60px] text-center">
                <span className="text-white text-xs font-black tracking-tighter">{Math.round(scale * 100)}%</span>
              </div>
              <button 
                onClick={() => handleZoom(0.1)}
                className="h-10 w-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Zoomer"
              >
                <ZoomIn size={18} />
              </button>
              <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
              <button 
                onClick={resetZoom}
                className="h-10 w-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Réinitialiser"
              >
                <RotateCcw size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-black/80 backdrop-blur-3xl border border-white/20 p-5 sm:p-6 rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] w-full max-w-[320px] pointer-events-auto overflow-hidden relative mx-auto sm:mx-0"
            >
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none"></div>

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsMinimized(true)}>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary border border-white/5">
                      <ScanLine size={24} />
                    </div>
                    <div>
                      <h2 className="text-white font-black text-sm uppercase tracking-tight">Accès Rapide</h2>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Partager le document</p>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition group-hover:bg-white/10">
                    <Minimize2 size={14} />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-[2rem] shadow-2xl flex justify-center w-full max-w-[180px] mx-auto group ring-8 ring-white/5">
                   <img 
                    src={qrDataUrl} 
                    alt="QR Code" 
                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105" 
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button 
                      onClick={handleShare}
                      className="h-12 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                    >
                      <Share2 size={14} /> Partager
                    </button>
                    <button 
                      onClick={handleCopy}
                      className="h-12 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all border border-white/10"
                    >
                      {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                      {copied ? "Lien OK" : "Copier"}
                    </button>
                  </div>
                  <a 
                    href={pdfUrl}
                    download={`BKTK-${id.slice(0,6)}.pdf`}
                    className="h-12 w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5"
                  >
                    <Download size={14} /> Télécharger
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          layout
          onClick={() => setIsMinimized(!isMinimized)}
          className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 pointer-events-auto flex items-center justify-center text-white shadow-2xl transition-all hover:border-primary/50 group ${isMinimized ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"} ml-auto sm:ml-0`}
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
