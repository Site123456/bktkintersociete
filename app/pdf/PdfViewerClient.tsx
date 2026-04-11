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
  Loader2,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "next-themes";
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
  siteName: string;
  docType: string;
  refId: string;
}

export default function PdfViewerClient({ id, shareUrl, qrDataUrl, siteName, docType, refId }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isMinimized, setIsMinimized] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [dragMode, setDragMode] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [fitToWidth, setFitToWidth] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
    
    // Create hidden iframe if it doesn't exist
    let iframe = document.getElementById("pdf-print-iframe") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "pdf-print-iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    iframe.src = pdfUrl;
    
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setIsPrinting(false);
      }, 500);
    };
  };

  // Keep track of current page on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const pages = container.querySelectorAll(".react-pdf__Page");
      let currentPage = 1;
      
      pages.forEach((page, index) => {
        const rect = page.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2) {
          currentPage = index + 1;
        }
      });
      
      setPageNumber(currentPage);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages]);

  const docTitleLabel = docType === "stock" ? "ÉTAT DES STOCKS" : "BON DE LIVRAISON";
  const downloadName = `${siteName.replace(/\s+/g, "_")}--${refId}.pdf`;

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

  const handleDragScroll = (e: React.MouseEvent) => {
    if (!dragMode || !containerRef.current) return;
    const container = containerRef.current;
    
    const startX = e.pageX - container.offsetLeft;
    const startY = e.pageY - container.offsetTop;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.pageX - container.offsetLeft;
      const y = moveEvent.pageY - container.offsetTop;
      const walkX = (x - startX);
      const walkY = (y - startY);
      container.scrollLeft = scrollLeft - walkX;
      container.scrollTop = scrollTop - walkY;
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const [lastTap, setLastTap] = useState(0);
  const handleTouchEnd = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setScale(prev => prev > 1.0 ? 1.0 : 2.0);
    }
    setLastTap(now);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden text-foreground font-sans selection:bg-primary/30">
      {/* PREMIUM HEADER - ULTRA MINIMAL */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 inset-x-0 h-14 glass z-50 px-4 sm:px-6 flex items-center justify-between print:hidden"
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => router.push("/")}
            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="h-7 w-7 rounded-lg bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition">
              <ChevronLeft size={16} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] hidden xs:inline">Dash</span>
          </button>
          
          <div className="h-5 w-[1px] bg-border hidden sm:block" />
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <FileText size={10} className="text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">{docTitleLabel}</span>
              <div className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${docType === 'stock' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                {docType === 'stock' ? 'Archive' : 'Logistic'}
              </div>
            </div>
            <span className="text-[10px] font-bold tracking-tight text-foreground/70 uppercase truncate max-w-[120px] sm:max-w-none">
              {siteName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-foreground/5 rounded-full p-1 border border-border/50 flex items-center shadow-inner">
            <button
              onClick={() => setDragMode(false)}
              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${!dragMode ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
              title="Select Mode"
            >
              <MousePointer2 size={12} />
            </button>
            <button
              onClick={() => setDragMode(true)}
              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${dragMode ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
              title="Pan Mode"
            >
              <Hand size={12} />
            </button>
          </div>
          
          <a
            href={pdfUrl}
            target="_blank"
            className="h-9 px-4 glass rounded-full flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:bg-foreground/5 transition ring-1 ring-border"
          >
            <ExternalLink size={12} /> <span className="hidden sm:inline">Native</span>
          </a>

          <div className="w-[1px] h-5 bg-border/50 mx-1 hidden sm:block" />

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 glass rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all ring-1 ring-border shadow-sm border border-foreground/5"
            >
              {theme === 'dark' ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-blue-500" />}
            </button>
          )}
        </div>
      </motion.header>

      {/* DOCUMENT ENGINE */}
      <main
        ref={containerRef}
        onMouseDown={handleDragScroll}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 w-full bg-background relative flex justify-center overflow-auto no-scrollbar scroll-smooth transition-colors duration-500 ${dragMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      >
        <div className="min-h-full pt-20 pb-32 px-4 sm:px-10 flex flex-col items-center">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center gap-6 py-48">
                  <div className="relative">
                     <motion.div 
                       animate={{ scale: [1, 1.1, 1], opacity: [0.3, 1, 0.3] }}
                       transition={{ duration: 2, repeat: Infinity }}
                       className="h-16 w-16 border-2 border-primary/20 rounded-full"
                     ></motion.div>
                     <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                       className="absolute top-0 left-0 h-16 w-16 border-2 border-primary border-t-transparent rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                     ></motion.div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black tracking-[0.4em] uppercase text-primary animate-pulse">Optimizing Canvas</p>
                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    <p className="text-[8px] font-bold opacity-30 uppercase tracking-[0.2em]">Secure Document Engine v4.0</p>
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
                    style={{ transformOrigin: "top center" }}
                  >
                    {/* Page Shadow Glow */}
                    <div className="absolute -inset-2 bg-primary/5 blur-3xl rounded-full -z-10 group-hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100" />
                    
                    <div className="shadow-[0_60px_120px_-30px_rgba(0,0,0,0.3)] dark:shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)] border border-border/50 rounded-sm overflow-hidden bg-white/5 dark:bg-white/[0.02] backdrop-blur-[2px]">
                      <Page
                        pageNumber={index + 1}
                        width={containerWidth ? (containerWidth - (containerWidth < 640 ? 32 : 80)) * scale : 800}
                        className="transition-all duration-300"
                        loading={<div className="bg-foreground/[0.02] h-[800px] w-full animate-pulse"></div>}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </div>
                    
                    {/* Floating Page Number */}
                    <div className="absolute top-4 -left-12 hidden lg:flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                      <span className="text-[9px] font-black font-mono">{String(index + 1).padStart(2, '0')}</span>
                      <div className="w-[1px] h-12 bg-gradient-to-b from-foreground to-transparent" />
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
              className="w-full max-w-[320px] glass rounded-[2rem] p-6 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] pointer-events-auto border border-border mb-2 relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Accès Rapide</h3>
                    <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest mt-0.5">Scannez pour confirmer</p>
                  </div>
                  <button onClick={() => setIsMinimized(true)} className="h-8 w-8 rounded-full hover:bg-foreground/5 flex items-center justify-center text-muted-foreground transition hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-3 bg-white rounded-2xl flex justify-center w-full max-w-[140px] mx-auto ring-4 ring-foreground/[0.03] group transition-all duration-500 hover:ring-foreground/[0.08]">
                  <img src={qrDataUrl} alt="QR" className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleShare} className="h-10 bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition active:scale-95 flex items-center justify-center gap-2">
                    <Share2 size={10} /> Partager
                  </button>
                  <button onClick={handleCopy} className="h-10 glass text-foreground font-black text-[9px] uppercase tracking-[0.2em] rounded-xl border border-border hover:bg-foreground/5 transition flex items-center justify-center gap-2">
                    {copied ? <CheckCircle2 size={10} className="text-green-500 animate-pulse" /> : <Copy size={10} />}
                    {copied ? "Link OK" : "Copier"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPACT FLOATING CONTROLS */}        <motion.div
           layout
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="glass rounded-2xl p-2 flex items-center gap-2 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.4)] pointer-events-auto ring-1 ring-border/50 border border-foreground/10"
        >
          {/* Zoom Subgroup */}
          <div className="flex items-center bg-foreground/5 rounded-xl p-1 group/zoom">
            <button onClick={() => handleZoom(-0.1)} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition" title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <div className="min-w-[54px] text-center border-x border-border/20">
              <span className="text-[10px] font-black font-mono tracking-tighter tabular-nums px-1">{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={() => handleZoom(0.1)} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition" title="Zoom In">
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="px-3 flex flex-col items-center justify-center border-r border-border/50">
            <span className="text-[8px] font-black font-mono tracking-tighter tabular-nums opacity-50 uppercase">Page</span>
            <span className="text-[11px] font-black font-mono leading-none">{pageNumber}<span className="opacity-30">/{numPages}</span></span>
          </div>

          <button 
            onClick={() => {
              setScale(1.0);
              const container = containerRef.current;
              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="h-10 px-3 sm:px-4 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all hover:shadow-inner" 
            title="Reset View / Fit to Width"
          >
            <RotateCcw size={13} /> <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Reset</span>
          </button>

          <div className="w-[1px] h-6 bg-border/40 mx-1" />

          {/* Action Subgroup */}
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrint} 
              disabled={isPrinting}
              className={`h-10 px-4 flex items-center gap-2 rounded-xl transition-all group shadow-sm ${isPrinting ? 'bg-primary/20 text-primary animate-pulse' : 'text-primary hover:bg-primary hover:text-primary-foreground shadow-primary/10'}`} 
              title="Print"
            >
              {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} className="group-hover:scale-110 transition" />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                {isPrinting ? "Printing..." : "Print"}
              </span>
            </button>

            <a 
              href={pdfUrl} 
              download={downloadName} 
              className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all" 
              title="Download Source"
            >
              <Download size={13} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export</span>
            </a>

            <div className="w-[1px] h-6 bg-border/40 mx-1" />

            <button 
              onClick={() => setIsMinimized(!isMinimized)} 
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${!isMinimized ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
              title="Options / QR"
            >
              {isMinimized ? <Share2 size={13} /> : <X size={13} />}
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

          /* Bypass framer-motion animations during print */
          div[style*="opacity"] {
            opacity: 1 !important;
            transform: none !important;
            visibility: visible !important;
          }

          /* Reset root container */
          #__next,
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
            display: block !important;
            width: 100% !important;
            height: auto !important;
          }

          /* Each page should be a full A4 sheet */
          .react-pdf__Page {
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            width: 210mm !important; /* Standard A4 Width */
            height: auto !important;
            display: block !important;
            position: relative !important;
          }
          
          .react-pdf__Page:not(:last-child) {
            page-break-after: always !important;
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
