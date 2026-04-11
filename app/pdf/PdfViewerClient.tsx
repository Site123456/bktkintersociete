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
  Moon,
  MoreHorizontal,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page, pdfjs } from "react-pdf";

// CSS for react-pdf (text layers and annotations)
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker - Use a local static URL if possible, or a more stable unpkg link
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAutoFitting, setIsAutoFitting] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Set initial desktop state for thumbnails
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setShowThumbnails(true);
    }
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
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);

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

  // Fit to page logic - Improved for accuracy and height awareness
  useEffect(() => {
    if (numPages > 0 && containerWidth > 0 && isAutoFitting) {
      // Small delay to ensure container transition finished
      const timer = setTimeout(() => {
        const isMobile = containerWidth < 640;
        const padding = isMobile ? 32 : 80;
        const sidebarWidth = (showThumbnails && !isMobile) ? 240 : 0;
        const availableWidth = containerWidth - padding - sidebarWidth;
        const availableHeight = containerHeight - (isMobile ? 120 : 160);

        // Standard A4 aspect ratio 1:1.414 (210/297)
        // PDF units are usually 72 dpi, so A4 is 595x842
        const pageW = 595;
        const pageH = 842;

        const scaleToWidth = availableWidth / pageW;
        const scaleToHeight = availableHeight / pageH;

        // Take the smaller of the two to ensure fit-all-better
        const newScale = Math.min(scaleToWidth, scaleToHeight, 1.25);
        setScale(Math.max(0.4, newScale));
        setIsAutoFitting(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [numPages, containerWidth, containerHeight, showThumbnails, isAutoFitting]);

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
      {/* PROGRESS BAR */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-[60] pointer-events-none">
        <motion.div
          className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* PREMIUM HEADER */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 glass z-50 px-4 sm:px-6 flex items-center justify-between print:hidden"
      >
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => router.push("/")}
            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all"
          >
            <div className="h-8 w-8 rounded-xl bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 group-hover:scale-105 transition">
              <ChevronLeft size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden xs:inline">Dash</span>
          </button>

          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${showThumbnails ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-foreground/5 text-muted-foreground hover:text-foreground'}`}
          >
            <PanelLeftOpen size={16} />
          </button>

          <div className="h-5 w-[1px] bg-border hidden sm:block" />

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 truncate max-w-[80px] sm:max-w-none">{docTitleLabel}</span>
              <div className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest hidden xs:block ${docType === 'stock' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                {docType === 'stock' ? 'Stock' : 'Livraison'}
              </div>
            </div>
            <span className="text-[10px] font-bold tracking-tight text-foreground/70 uppercase truncate max-w-[100px] sm:max-w-[200px]">
              {siteName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Selector - Desktop Only here */}
          <div className="hidden sm:flex bg-foreground/5 rounded-xl p-1 border border-border/50 shadow-inner">
            <button
              onClick={() => setDragMode(false)}
              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${!dragMode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              title="Select Mode"
            >
              <MousePointer2 size={12} />
            </button>
            <button
              onClick={() => setDragMode(true)}
              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${dragMode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              title="Pan Mode"
            >
              <Hand size={12} />
            </button>
          </div>

          <div className="w-[1px] h-5 bg-border/50 mx-1 hidden sm:block" />

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 glass rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all ring-1 ring-border shadow-sm"
            >
              {theme === 'dark' ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-blue-500" />}
            </button>
          )}

          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="h-9 w-9 sm:hidden glass rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all ring-1 ring-border"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </motion.header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* THUMBNAILS SIDEBAR - REDESIGNED */}
        <AnimatePresence>
          {showThumbnails && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute lg:relative inset-y-0 left-0 w-[240px] bg-background/60 backdrop-blur-2xl z-40 border-r border-border/40 flex flex-col pt-4 overflow-hidden shadow-2xl lg:shadow-none"
            >
              <div className="px-6 mb-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Navigation</h3>
                  <span className="text-[8px] font-bold text-primary/60 uppercase">{numPages} Planches</span>
                </div>
                <button 
                  onClick={() => setShowThumbnails(false)} 
                  className="lg:hidden h-8 w-8 rounded-full hover:bg-foreground/5 flex items-center justify-center transition"
                >
                  <PanelLeftClose size={16} className="text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar space-y-6">
                {Array.from(new Array(numPages), (el, index) => (
                  <div
                    key={`thumb_${index}`}
                    onClick={() => {
                      const container = containerRef.current;
                      if (container) {
                        const page = container.querySelectorAll(".react-pdf__Page")[index];
                        page?.scrollIntoView({ behavior: 'smooth' });
                      }
                      if (window.innerWidth < 1024) setShowThumbnails(false);
                    }}
                    className="group cursor-pointer relative"
                  >
                    <div className={`
                      aspect-[1/1.414] rounded-sm overflow-hidden transition-all duration-300
                      ${pageNumber === index + 1 
                        ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-[0.98] shadow-xl' 
                        : 'ring-1 ring-border/50 group-hover:ring-primary/40 group-hover:scale-[1.02] shadow-sm'}
                    `}>
                      <Page
                        pageNumber={index + 1}
                        width={200}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="w-full h-full object-cover"
                        loading={<div className="w-full h-full bg-foreground/[0.03] animate-pulse" />}
                        error={<div className="w-full h-full flex items-center justify-center bg-destructive/5"><X size={12} className="opacity-20" /></div>}
                      />
                      
                      {/* Page Overlay Indicator */}
                      <div className={`
                        absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 flex items-end justify-center pb-2
                        ${pageNumber === index + 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                      `}>
                        <span className="text-[9px] font-black text-white bg-primary px-2 py-0.5 rounded shadow-lg uppercase tracking-tighter">
                          P. {index + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Sidebar Footer */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-foreground/5 border border-border/50 backdrop-blur-md">
                <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest text-center">BKTK Engine v2.4</p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* DOCUMENT ENGINE */}
        <main
          ref={containerRef}
          onMouseDown={handleDragScroll}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 bg-background relative flex justify-center overflow-auto no-scrollbar scroll-smooth transition-colors duration-500 ${dragMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
        >
          <div className="min-h-full pt-8 pb-32 px-4 sm:px-10 flex flex-col items-center">
            {pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error("PDF Load Error:", error);
                  setIsError(true);
                  setErrorMessage(error.message);
                }}
                loading={
                  <div className="flex flex-col items-center gap-12 py-48">
                    <div className="relative h-24 w-24">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1], 
                          opacity: [0.3, 0.6, 0.3],
                          rotate: [0, 90, 180, 270, 360]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-[3px] border-primary/10 rounded-[2rem]"
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "anticipate" }}
                        className="absolute inset-0 border-[3px] border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-[2rem]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="text-primary animate-bounce" size={24} />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[10px] font-black tracking-[0.5em] uppercase text-foreground/40">Initializing Engine</p>
                      <div className="h-1 w-32 bg-foreground/5 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ x: [-128, 128] }} 
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} 
                          className="h-full w-1/2 bg-primary/50" 
                        />
                      </div>
                    </div>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center gap-6 py-40 px-8 text-center glass rounded-[2rem] border-dashed border-2 border-border/50">
                    <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
                      <X size={32} className="text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest mb-2">Erreur de Chargement</h3>
                      <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
                        Impossible de charger le document. Vérifiez votre connexion ou l'ID du document.
                        <br/><span className="opacity-40 italic mt-2 block">{errorMessage}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="h-10 px-6 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition active:scale-95"
                    >
                      Actualiser la page
                    </button>
                  </div>
                }
              >
                <AnimatePresence mode="popLayout">
                  {Array.from(new Array(numPages), (el, index) => (
                    <motion.div
                      key={`page_${index + 1}`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="mb-8 sm:mb-12 last:mb-0 relative group"
                      style={{ transformOrigin: "top center" }}
                    >
                      <div className="shadow-2xl dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] border border-border/50 rounded-sm overflow-hidden bg-white">
                        <Page
                          pageNumber={index + 1}
                          width={containerWidth ? (containerWidth - (containerWidth < 1024 ? 40 : (showThumbnails ? 280 : 120))) * scale : 600}
                          className="transition-all duration-500 ease-[0.22, 1, 0.36, 1]"
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          loading={
                            <div className="flex flex-col gap-4 p-8 w-full animate-pulse">
                              <div className="h-8 bg-foreground/[0.03] rounded w-3/4" />
                              <div className="h-4 bg-foreground/[0.02] rounded w-full" />
                              <div className="h-4 bg-foreground/[0.02] rounded w-5/6" />
                              <div className="h-64 bg-foreground/[0.02] rounded w-full mt-4" />
                              <div className="space-y-3">
                                <div className="h-4 bg-foreground/[0.02] rounded w-full" />
                                <div className="h-4 bg-foreground/[0.02] rounded w-11/12" />
                              </div>
                            </div>
                          }
                        />
                      </div>

                      {/* Floating Page Number */}
                      <div className="absolute top-0 -left-12 hidden xl:flex flex-col items-center gap-2 opacity-10 group-hover:opacity-40 transition-opacity">
                        <span className="text-[10px] font-black font-mono">{index + 1}</span>
                        <div className="w-[1px] h-20 bg-gradient-to-b from-foreground to-transparent" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Document>
            ) : null}
          </div>
        </main>
      </div>

      {/* MORE MENU OVERLAY (MOBILE) */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMoreMenuOpen(false)}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-50 flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm glass rounded-[2rem] p-6 shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Actions</span>
                <button onClick={() => setIsMoreMenuOpen(false)} className="h-8 w-8 rounded-xl hover:bg-foreground/5 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={handlePrint} className="h-12 bg-foreground/5 rounded-2xl flex items-center gap-3 px-4 hover:bg-foreground/10 transition">
                  <Printer size={16} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Print</span>
                </button>
                <a href={pdfUrl} download={downloadName} className="h-12 bg-foreground/5 rounded-2xl flex items-center gap-3 px-4 hover:bg-foreground/10 transition">
                  <Download size={16} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Export</span>
                </a>
              </div>

              <div className="bg-foreground/5 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Vue Mode</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDragMode(false)} className={`h-8 w-8 rounded-lg flex items-center justify-center ${!dragMode ? 'bg-primary text-primary-foreground' : 'bg-background/20'}`}><MousePointer2 size={12} /></button>
                    <button onClick={() => setDragMode(true)} className={`h-8 w-8 rounded-lg flex items-center justify-center ${dragMode ? 'bg-primary text-primary-foreground' : 'bg-background/20'}`}><Hand size={12} /></button>
                  </div>
                </div>
                <button onClick={() => { setScale(1); setIsAutoFitting(true); setIsMoreMenuOpen(false); }} className="w-full h-10 border border-primary/20 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                  <RotateCcw size={12} /> Auto-Fit Page
                </button>
              </div>

              <button onClick={() => { setIsMinimized(false); setIsMoreMenuOpen(false); }} className="w-full h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                <Share2 size={14} /> Share & Invite
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMMAND BAR PILL - ULTRA COMPACT */}
      <div className="fixed bottom-6 inset-x-0 flex flex-col items-center gap-4 z-[45] pointer-events-none print:hidden px-4">

        {/* QR & SHARE OVERLAY (Improved) */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-[300px] glass rounded-[2.5rem] p-6 shadow-2xl pointer-events-auto border border-border/50 mb-2 overflow-hidden relative"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full" />

              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary underline underline-offset-4 decoration-primary/20">Document Access</h3>
                  <button onClick={() => setIsMinimized(true)} className="h-8 w-8 rounded-full hover:bg-foreground/5 flex items-center justify-center transition">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white rounded-3xl flex justify-center w-full max-w-[160px] mx-auto shadow-inner ring-1 ring-border/10">
                  <img src={qrDataUrl} alt="QR" className="w-full h-auto" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleShare} className="h-11 bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-primary/20 hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-2">
                    <Share2 size={12} /> Share
                  </button>
                  <button onClick={handleCopy} className="h-11 bg-foreground/5 text-foreground font-black text-[9px] uppercase tracking-[0.15em] rounded-2xl border border-border/50 hover:bg-foreground/10 transition flex items-center justify-center gap-2">
                    {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copied ? "Link Copied" : "Copy Link"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="glass rounded-full p-1.5 flex items-center gap-1 shadow-2xl pointer-events-auto ring-1 ring-border/50 border border-white/10 backdrop-blur-3xl hover:ring-primary/40 transition-all duration-500"
        >
          {/* Zoom Subgroup */}
          <div className="flex items-center bg-foreground/5 rounded-full p-0.5">
            <button 
              onClick={() => { setScale(prev => Math.max(0.4, prev - 0.1)); setIsAutoFitting(false); }} 
              className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full transition-all active:scale-90" 
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <div className="min-w-[60px] text-center select-none">
              <span className="text-[11px] font-black font-mono tabular-nums tracking-tighter">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <button 
              onClick={() => { setScale(prev => Math.min(2.5, prev + 0.1)); setIsAutoFitting(false); }} 
              className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full transition-all active:scale-90" 
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          <div className="px-4 flex flex-col items-center justify-center border-r border-border/20 h-8">
            <span className="text-[11px] font-black font-mono leading-none tracking-tighter">
              {pageNumber}
              <span className="opacity-20 mx-0.5">/</span>
              <span className="opacity-40">{numPages}</span>
            </span>
          </div>

          {/* Action Subgroup (Desktop Only) */}
          <div className="hidden sm:flex items-center gap-1 ml-1">
            <button 
              onClick={handlePrint} 
              className="h-10 w-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-full transition-all hover:scale-110 active:scale-90"
              title="Print Document"
            >
              <Printer size={16} />
            </button>
            <a 
              href={pdfUrl} 
              download={downloadName} 
              className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full transition-all hover:scale-110 active:scale-90"
              title="Download PDF"
            >
              <Download size={16} />
            </a>
            <button 
              onClick={() => { setIsAutoFitting(true); }} 
              className={`h-10 w-10 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-90 ${isAutoFitting ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`} 
              title="Auto-Fit Page"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-border/20 mx-1 hidden sm:block" />

          {/* Share Button acts as trigger for QR overlay */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`h-10 w-10 flex items-center justify-center rounded-full transition-all duration-300 ${!isMinimized ? 'bg-primary text-primary-foreground shadow-lg scale-110' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:scale-105'}`}
          >
            {isMinimized ? <Share2 size={16} /> : <X size={16} />}
          </button>

          {/* More Actions (Mobile Only) */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className="sm:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full transition-all"
          >
            <MoreHorizontal size={20} />
          </button>
        </motion.div>
      </div>

      <style jsx global>{`
        /* PRINT OPTIMIZATION */
        @page { size: A4; margin: 0; }
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; margin: 0 !important; }
          header, .glass, button, [class*="fixed"], [class*="bottom-"], .no-scrollbar::-webkit-scrollbar { display: none !important; }
          main { display: block !important; position: relative !important; background: #fff !important; width: 100% !important; overflow: visible !important; }
          .react-pdf__Document { display: block !important; width: 100% !important; }
          .react-pdf__Page { margin: 0 !important; page-break-after: always !important; width: 210mm !important; }
          canvas { width: 100% !important; height: auto !important; image-rendering: high-quality; }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Sidebar Scrollbar */
        aside .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        aside .overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(var(--primary), 0.1); border-radius: 10px; }
        aside .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }

        .glass {
          background: rgba(var(--background), 0.5) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
        }

        .dark .glass {
          background: rgba(15, 15, 15, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
