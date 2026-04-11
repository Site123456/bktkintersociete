"use client";

import { useEffect, useState, useRef } from "react";
import {
  Download,
  Share2,
  Copy,
  CheckCircle2,
  ChevronLeft,
  ScanLine,
  X,
  Minimize2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  MousePointer2,
  Printer,
  ChevronUp
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
  const [isMinimized, setIsMinimized] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [dragMode, setDragMode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPdfUrl(`/api/pdf?id=${id}`);
  }, [id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(0.4, prev + delta), 2.5));
  };

  const resetZoom = () => setScale(1.0);
  
  const handlePrint = () => {
    // Create a hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);

    // Wait for the iframe to load
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Optional: Remove the iframe after a delay
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      } catch (e) {
        console.error("Print error:", e);
        // Fallback to basic print if iframe fails
        window.print();
      }
    };
  };

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
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error(err);
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
          title: `BKTK - ${id.slice(0, 6)}`,
          text: "Voici le document de commande / stock de BKTK.",
          url: shareUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col overflow-hidden text-white font-sans selection:bg-primary/30">
      {/* PROFESSIONAL TOP HEADER */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 inset-x-0 h-14 border-b border-white/5 bg-black/40 backdrop-blur-2xl z-50 px-4 flex items-center justify-between print:hidden"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="h-9 px-3 flex items-center gap-2 bg-white/5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition border border-white/5 active:scale-95"
          >
            <ChevronLeft size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Retour</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary leading-none mb-1">Interactive Viewer</span>
            <span className="text-xs font-bold tracking-tight opacity-40 truncate max-w-[150px] sm:max-w-none">Ref: {id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/5 rounded-lg p-0.5 border border-white/5 flex items-center">
            <button
              onClick={() => setDragMode(false)}
              className={`h-8 px-3 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition ${!dragMode ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white"}`}
            >
              <MousePointer2 size={12} /> <span className="hidden sm:inline">Pointeur</span>
            </button>
            <button
              onClick={() => setDragMode(true)}
              className={`h-8 px-3 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition ${dragMode ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white"}`}
            >
              <Hand size={12} /> <span className="hidden sm:inline">Main</span>
            </button>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            className="h-9 px-4 bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition border border-white/5"
          >
            <ExternalLink size={14} /> <span className="hidden sm:inline">Natif</span>
          </a>
        </div>
      </motion.header>

      {/* DOCUMENT ENGINE */}
      <main
        ref={containerRef}
        className={`flex-1 w-full bg-[#050505] relative flex justify-center overflow-auto no-scrollbar scroll-smooth transition-all duration-300 ${dragMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      >
        <div className="min-h-full py-24 sm:py-32 flex flex-col items-center">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center gap-4 py-40">
                  <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black tracking-widest uppercase opacity-40">Initialisation du moteur...</p>
                </div>
              }
              error={<div className="text-white/30 text-xs font-black p-20 uppercase tracking-widest">Document non disponible</div>}
            >
              <AnimatePresence>
                {Array.from(new Array(numPages), (el, index) => (
                  <motion.div
                    key={`page_${index + 1}`}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-10 sm:mb-16 last:mb-0 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.9)] border border-white/5"
                    style={{ transformOrigin: "top center", scale }}
                  >
                    <Page
                      pageNumber={index + 1}
                      width={typeof window !== "undefined" ? (window.innerWidth < 640 ? window.innerWidth : Math.min(window.innerWidth * 0.8, 1100)) : 800}
                      className="transition-transform duration-300"
                      loading={<div className="bg-white/2 h-[800px] w-full animate-pulse blur-xl"></div>}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Document>
          ) : null}
        </div>
      </main>

      {/* MINIMAL COMMAND BAR (FIXED BOTTOM) */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4 z-50 pointer-events-none print:hidden px-4">
        {/* ACTION TOOLTIP / SHEET */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-[360px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-primary border border-white/5">
                      <ScanLine size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/90">Code d'accès</h3>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-tight">Scanner pour confirmer</p>
                    </div>
                  </div>
                  <button onClick={() => setIsMinimized(true)} className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/30 transition">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-3 bg-white rounded-3xl shadow-inner flex justify-center w-full max-w-[160px] mx-auto group ring-4 ring-white/5">
                  <img src={qrDataUrl} alt="QR" className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-110" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleShare} className="h-11 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2">
                    <Share2 size={12} /> Partager
                  </button>
                  <button onClick={handleCopy} className="h-11 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
                    {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied ? "Link OK" : "Copier"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* THE COMMAND BAR PILL */}
        <motion.div
           layout
           className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl pointer-events-auto ring-1 ring-white/5"
        >
          <div className="flex items-center bg-white/5 rounded-[0.6rem] p-0.5 mr-1">
            <button onClick={() => handleZoom(-0.1)} className="h-9 w-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <div className="min-w-[50px] text-center border-x border-white/5">
              <span className="text-[10px] font-black tracking-tighter tabular-nums px-2">{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={() => handleZoom(0.1)} className="h-9 w-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition" title="Zoom In">
              <ZoomIn size={16} />
            </button>
          </div>

          <button onClick={resetZoom} className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-2 text-white/40 hover:text-white hover:bg-white/10 rounded-[0.6rem] transition" title="Reset View">
            <RotateCcw size={14} /> <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Reset</span>
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button onClick={handlePrint} className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-2 text-white/40 hover:text-primary hover:bg-primary/10 rounded-[0.6rem] transition group" title="Print">
            <Printer size={14} className="group-hover:scale-110 transition" /> <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Imprimer</span>
          </button>

          <a href={pdfUrl} download={`BKTK-${id.slice(0, 6)}.pdf`} className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-2 text-white/40 hover:text-white hover:bg-white/10 rounded-[0.6rem] transition" title="Download Source">
            <Download size={14} /> <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Source</span>
          </a>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className={`h-9 w-9 flex items-center justify-center rounded-[0.6rem] transition-all ${!isMinimized ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
            title="Options / QR"
          >
            {isMinimized ? <ScanLine size={16} /> : <ChevronUp size={16} />}
          </button>
        </motion.div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-hidden,
          header, 
          [class*="bottom-"],
          button {
            display: none !important;
          }
          /* This resets the layout specifically for the printable Document if needed */
          div.fixed.inset-0 {
            position: static !important;
            display: block !important;
            background: white !important;
            overflow: visible !important;
          }
          main {
            display: block !important;
            position: static !important;
            background: white !important;
            overflow: visible !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .react-pdf__Page {
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            width: 100% !important;
          }
          .react-pdf__Document {
            display: block !important;
            width: 100% !important;
          }
          canvas {
            width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
