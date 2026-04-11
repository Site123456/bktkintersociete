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
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  MousePointer2,
  Printer,
  ChevronUp,
  FileText,
  Loader2
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
  const [isPrinting, setIsPrinting] = useState(false);
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
    setIsPrinting(true);
    // Let the UI state update before printing
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
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
      {/* PREMIUM HEADER - ULTRA MINIMAL */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 inset-x-0 h-16 glass z-50 px-6 flex items-center justify-between print:hidden"
      >
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/")}
            className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition">
              <ChevronLeft size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dashboard</span>
          </button>
          
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Preview</span>
            </div>
            <span className="text-[9px] font-medium tracking-tight opacity-30 font-mono mt-0.5">{id}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 rounded-full p-1 border border-white/5 flex items-center">
            <button
              onClick={() => setDragMode(false)}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${!dragMode ? "bg-primary text-white shadow-lg" : "text-white/30 hover:text-white"}`}
              title="Select Mode"
            >
              <MousePointer2 size={14} />
            </button>
            <button
              onClick={() => setDragMode(true)}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${dragMode ? "bg-primary text-white shadow-lg" : "text-white/30 hover:text-white"}`}
              title="Pan Mode"
            >
              <Hand size={14} />
            </button>
          </div>
          
          <a
            href={pdfUrl}
            target="_blank"
            className="h-10 px-5 glass rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition ring-1 ring-white/5"
          >
            <ExternalLink size={14} /> <span className="hidden sm:inline">Nativ PDF</span>
          </a>
        </div>
      </motion.header>

      {/* DOCUMENT ENGINE */}
      <main
        ref={containerRef}
        className={`flex-1 w-full bg-[#050505] relative flex justify-center overflow-auto no-scrollbar scroll-smooth transition-all duration-500 overflow-x-hidden ${dragMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      >
        <div className="min-h-full pt-28 pb-40 px-4 sm:px-10 flex flex-col items-center">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center gap-6 py-48">
                  <div className="relative">
                     <div className="h-16 w-16 border-4 border-primary/20 rounded-full"></div>
                     <div className="absolute top-0 left-0 h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary">Charging Document</p>
                    <p className="text-[9px] font-medium opacity-30 uppercase tracking-widest">High Fidelity Engine</p>
                  </div>
                </div>
              }
              error={
                <div className="text-white/30 flex flex-col items-center gap-4 py-40">
                  <X size={40} className="opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest">Document Unavailable</p>
                </div>
              }
            >
              <AnimatePresence mode="popLayout">
                {Array.from(new Array(numPages), (el, index) => (
                  <motion.div
                    key={`page_${index + 1}`}
                    initial={{ opacity: 0, scale: 0.98, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ 
                      duration: 0.8, 
                      ease: [0.16, 1, 0.3, 1],
                      delay: index < 3 ? index * 0.1 : 0 
                    }}
                    className="mb-12 sm:mb-20 last:mb-0 relative group"
                    style={{ transformOrigin: "top center", scale }}
                  >
                    {/* Page Shadow Glow */}
                    <div className="absolute -inset-1 bg-white/[0.02] blur-xl rounded-sm -z-10 group-hover:bg-white/[0.05] transition-colors" />
                    
                    <div className="shadow-[0_45px_100px_-20px_rgba(0,0,0,0.95)] border border-white/10 rounded-sm overflow-hidden bg-white/5 backdrop-blur-sm">
                      <Page
                        pageNumber={index + 1}
                        width={typeof window !== "undefined" ? (window.innerWidth < 640 ? window.innerWidth - 32 : Math.min(window.innerWidth * 0.75, 1000)) : 800}
                        className="transition-all duration-500"
                        loading={<div className="bg-white/[0.02] h-[800px] w-full animate-pulse"></div>}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </div>
                    
                    {/* Floating Page Number */}
                    <div className="absolute top-4 -left-12 hidden lg:flex flex-col items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black font-mono">{String(index + 1).padStart(2, '0')}</span>
                      <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Document>
          ) : null}
        </div>
      </main>

      {/* COMMAND BAR PILL - FLOATING AT BOTTOM */}
      <div className="fixed bottom-8 inset-x-0 flex flex-col items-center gap-4 z-50 pointer-events-none print:hidden px-4">
        
        {/* QR & SHARE OVERLAY */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-[340px] glass rounded-[2.5rem] p-8 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] pointer-events-auto border border-white/10 mb-2 relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Accès Rapide</h3>
                    <p className="text-[9px] font-medium text-white/40 uppercase tracking-widest mt-0.5">Scannez pour confirmer</p>
                  </div>
                  <button onClick={() => setIsMinimized(true)} className="h-9 w-9 rounded-full hover:bg-white/5 flex items-center justify-center text-white/30 transition hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 bg-white rounded-3xl flex justify-center w-full max-w-[180px] mx-auto ring-8 ring-white/[0.03] group transition-all duration-500 hover:ring-white/[0.08]">
                  <img src={qrDataUrl} alt="QR" className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleShare} className="h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:brightness-110 transition active:scale-95 flex items-center justify-center gap-2">
                    <Share2 size={12} /> Partager
                  </button>
                  <button onClick={handleCopy} className="h-12 glass text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
                    {copied ? <CheckCircle2 size={12} className="text-green-400 animate-pulse" /> : <Copy size={12} />}
                    {copied ? "Link OK" : "Copier"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPACT FLOATING CONTROLS */}
        <motion.div
           layout
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="glass rounded-2xl p-2 flex items-center gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto ring-1 ring-white/10 border border-white/5"
        >
          {/* Zoom Subgroup */}
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 mr-1 group/zoom">
            <button onClick={() => handleZoom(-0.1)} className="h-10 w-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <div className="min-w-[56px] text-center">
              <span className="text-[10px] font-black font-mono tracking-tighter tabular-nums px-2">{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={() => handleZoom(0.1)} className="h-10 w-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Zoom In">
              <ZoomIn size={16} />
            </button>
          </div>

          <button onClick={resetZoom} className="h-10 px-4 flex items-center gap-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition" title="Reset View">
            <RotateCcw size={14} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Normal</span>
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Action Subgroup */}
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrint} 
              disabled={isPrinting}
              className={`h-10 px-4 flex items-center gap-2 rounded-xl transition-all group ${isPrinting ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-primary hover:bg-primary/10'}`} 
              title="Print"
            >
              {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} className="group-hover:scale-110 transition" />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                {isPrinting ? "Preparation..." : "Imprimer"}
              </span>
            </button>

            <a 
              href={pdfUrl} 
              download={`BKTK-${id.slice(0, 6)}.pdf`} 
              className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition" 
              title="Download Source"
            >
              <Download size={14} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Source</span>
            </a>

            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            <button 
              onClick={() => setIsMinimized(!isMinimized)} 
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${!isMinimized ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
              title="Options / QR"
            >
              {isMinimized ? <ScanLine size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        /* PRINT OPTIMIZATION - THE TRUE PDF EXPERIENCE */
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide everything except the PDF container */
          header, 
          [class*="bottom-"], 
          [class*="fixed"], 
          button, 
          .print-hidden {
            display: none !important;
          }

          /* Ensure Document and pages are visible and formatted correctly */
          div.fixed.inset-0 {
            position: relative !important;
            display: block !important;
            background: #fff !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }

          main {
            display: block !important;
            position: relative !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Center content on the printed page */
          .react-pdf__Document {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
          }

          /* Each page should be a full A4 sheet */
          .react-pdf__Page {
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            width: 210mm !important; /* Standard A4 Width */
            height: auto !important;
            display: block !important;
          }

          /* Scale the content to fit the print area */
          canvas {
            width: 100% !important;
            height: auto !important;
            display: block !important;
            image-rendering: high-quality;
          }

          /* Hide interactive layers on print */
          .react-pdf__Page__textContent,
          .react-pdf__Page__annotations {
            display: none !important;
          }
        }

        /* Prevent scrollbars from showing during layout shifts */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
