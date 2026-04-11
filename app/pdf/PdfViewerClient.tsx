"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Maximize2,
  LayoutGrid,
  ArrowLeftRight,
  ArrowUpDown,
  Check
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page, pdfjs } from "react-pdf";

// CSS for react-pdf (text layers and annotations)
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker
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

  // States
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(typeof window !== 'undefined' && window.innerWidth < 1024 ? 0.6 : 1.0);
  const [baseWidth, setBaseWidth] = useState<number>(600); // Fixed base width for accurate zooming
  const [dragMode, setDragMode] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // UI Panels
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Layout & Scroll
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  useEffect(() => { setMounted(true); setPdfUrl(`/api/pdf?id=${id}`); }, [id]);

  useEffect(() => {
    if (window.innerWidth >= 1024) setShowThumbnails(true);
  }, []);

  // Responsive observation
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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Compute Base Width correctly for Autofit
  useEffect(() => {
    if (containerWidth > 0 && containerHeight > 0 && numPages > 0) {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      const sidebarWidth = (showThumbnails && !isMobile) ? 260 : 0;

      // Exact 100% available width accounting for safe physical margins
      // Generous 64px padding on mobile ensures the page doesn't bump into the screen edges
      const paddingX = isMobile ? 64 : 80;
      const availableWidth = containerWidth - sidebarWidth - paddingX;

      // Exact 100% available height minus absolute floating UI elements
      // We must be very generous here because we assume A4 ratio. If a PDF is taller, it might bleed out.
      const paddingY = isMobile ? 220 : 260;
      const availableHeight = containerHeight > paddingY ? containerHeight - paddingY : containerHeight;

      const pageRatio = 595 / 842; // standard A4 aspect ratio -> w/h
      const heightBasedWidth = availableHeight * pageRatio;

      // Auto-fit strictly bound to 100% of the exact calculated reading zone
      // This ensures the height and width both cleanly fit within the viewport without scrolling.
      setBaseWidth(Math.min(availableWidth, heightBasedWidth, 1200));
    }
  }, [containerWidth, containerHeight, showThumbnails, numPages]);

  const handlePrint = useCallback(async (e?: React.MouseEvent | KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!pdfUrl) return;
    setIsPrinting(true);
    try {
      // Pre-fetch to ensure the server has generated the document fully
      await fetch(pdfUrl);

      let iframe = document.getElementById("pdf-print-iframe") as HTMLIFrameElement;
      if (iframe) {
        document.body.removeChild(iframe);
      }

      iframe = document.createElement("iframe");
      iframe.id = "pdf-print-iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
          setIsPrinting(false);
        }, 500);
      };

      iframe.src = pdfUrl;
    } catch (error) {
      console.error(error);
      setIsPrinting(false);
    }
  }, [pdfUrl]);

  // Intercept Ctrl + P to print the high-fidelity PDF instead of the webpage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrint]);

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsDownloading(true);
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsDownloading(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setIsDownloading(false);
    }
  };

  // Scroll Sync
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setScrollProgress((scrollTop / (scrollHeight - clientHeight)) * 100 || 0);

      const pages = container.querySelectorAll(".react-pdf__Page");
      let currentPage = pageNumber;
      pages.forEach((page, index) => {
        const rect = page.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          currentPage = index + 1;
        }
      });
      if (currentPage !== pageNumber) setPageNumber(currentPage);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages, pageNumber]);

  const handleCopy = () => {
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `BKTK Docs`, url: shareUrl }); } catch { }
    } else handleCopy();
  };

  // Interactive Drag Scroll
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
      container.scrollLeft = scrollLeft - (x - startX);
      container.scrollTop = scrollTop - (y - startY);
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
      setScale(prev => prev > 1.0 ? 1.0 : 1.5);
    }
    setLastTap(now);
  };

  const handleFitToWidth = () => {
    setIsZoomMenuOpen(false);
    const isMobile = window.innerWidth < 1024;
    const sidebarWidth = (showThumbnails && !isMobile) ? 260 : 0;
    const paddingX = isMobile ? 32 : 80;
    const availableWidth = window.innerWidth - sidebarWidth - paddingX;
    setScale(Math.min(availableWidth / baseWidth, 3.0));
  };

  const handleFitToHeight = () => {
    setIsZoomMenuOpen(false);
    const isMobile = window.innerWidth < 1024;
    const paddingY = isMobile ? 180 : 200;
    const availableHeight = window.innerHeight > paddingY ? window.innerHeight - paddingY : window.innerHeight;
    const heightBasedWidth = availableHeight * (595 / 842);
    setScale(Math.min(heightBasedWidth / baseWidth, 3.0));
  };

  const docTitleLabel = docType === "stock" ? "STOCK" : "LIVRAISON";
  const downloadName = `${siteName.replace(/\s+/g, "_")}--${refId}.pdf`;

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden text-foreground font-sans selection:bg-primary/30">
      {/* GLOBAL PROGRESS BAR */}
      <div className="fixed top-0 left-0 w-full h-1 z-[70] pointer-events-none">
        <motion.div className="h-full bg-primary/80 backdrop-blur" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* PRINT & EXPORT LOADING OVERLAYS */}
      <AnimatePresence>
        {(isPrinting || isDownloading) && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[110] bg-background/60 flex flex-col items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass p-8 sm:p-10 rounded-[2.5rem] flex flex-col items-center shadow-2xl border border-primary/20 max-w-sm w-[90%] text-center"
            >
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                <Loader2 size={32} className="text-primary animate-spin absolute" />
                {isPrinting ? <Printer size={16} className="text-primary/50" /> : <Download size={16} className="text-primary/50" />}
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest text-primary mb-2">
                {isPrinting ? "Préparation" : "Téléchargement"}
              </h2>
              <p className="text-xs sm:text-sm text-foreground/70 font-medium">
                {isPrinting ? "Création de la version haute définition pour l'impression..." : "Récupération du fichier PDF original..."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING TOP-LEFT NAV BACK */}
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center gap-2 sm:gap-3 print:hidden"
      >
        <button
          onClick={() => router.push("/")}
          className="h-10 w-10 sm:h-12 sm:w-12 glass rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 shadow-xl border border-border/40 hover:bg-foreground/5 hover:scale-105 active:scale-95"
        >
          <ChevronLeft size={18} className="sm:hidden" />
          <ChevronLeft size={20} className="hidden sm:block" />
        </button>

        {/* Document Mini-Pill */}
        <div className="glass flex h-10 sm:h-12 items-center px-3 sm:px-4 rounded-2xl border border-border/40 shadow-xl max-w-[calc(100vw-140px)] sm:max-w-none">
          <div className={`px-1.5 sm:px-2 py-1 rounded-md text-[7px] sm:text-[8px] font-black uppercase tracking-widest shrink-0 ${docType === 'stock' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {docTitleLabel}
          </div>
          <div className="w-[1px] h-4 bg-border/50 mx-2 sm:mx-3 shrink-0" />
          <span className="text-[9px] sm:text-[11px] font-bold tracking-wide truncate">{siteName}</span>
        </div>
      </motion.div>

      {/* FLOATING TOP-RIGHT THEME & THUMBNAILS COMPACT */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3 print:hidden"
      >
        <button
          onClick={() => setShowThumbnails(!showThumbnails)}
          className={`h-10 w-10 sm:h-12 sm:w-12 glass rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl border border-border/40 hover:scale-105 active:scale-95 ${showThumbnails ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LayoutGrid size={16} className="sm:hidden" />
          <LayoutGrid size={18} className="hidden sm:block" />
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-10 w-10 sm:h-12 sm:w-12 glass flex rounded-2xl items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 shadow-xl border border-border/40 hover:scale-105 active:scale-95"
          >
            {theme === 'dark' ? <Sun size={16} className="text-yellow-500 sm:hidden" /> : <Moon size={16} className="text-blue-500 sm:hidden" />}
            {theme === 'dark' ? <Sun size={18} className="text-yellow-500 hidden sm:block" /> : <Moon size={18} className="text-blue-500 hidden sm:block" />}
          </button>
        )}
      </motion.div>

      {pdfUrl && (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(e) => { setIsError(true); setErrorMessage(e.message); }}
          className="flex-1 flex overflow-hidden relative w-full h-full"
          loading={
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[100]" />
          }
          error={
            <div className="w-full h-full flex items-center justify-center bg-background z-50 p-8">
              <div className="flex flex-col items-center justify-center gap-6 p-8 text-center glass rounded-3xl border border-destructive/20 max-w-sm">
                <X size={40} className="text-destructive mb-2" />
                <h3 className="text-sm font-black uppercase tracking-widest text-destructive">Load Erreur</h3>
                <p className="text-xs text-muted-foreground italic">{errorMessage}</p>
              </div>
            </div>
          }
        >
          {/* MODERN THUMBNAIL OVERLAY / SIDEBAR */}
          <AnimatePresence>
            {showThumbnails && (
              <motion.aside
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-3xl flex flex-col pt-8 pointer-events-auto lg:relative lg:z-40 lg:inset-auto lg:w-[260px] lg:bg-background/80 lg:border-r lg:border-border/30 lg:pt-24 lg:shadow-none"
              >
                <div className="px-6 mb-6 flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-foreground/50">Aperçu ({numPages})</span>
                  <button onClick={() => setShowThumbnails(false)} className="lg:hidden h-10 w-10 bg-foreground/10 flex items-center justify-center rounded-2xl active:scale-90 transition"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-4 content-start">
                  {Array.from(new Array(numPages), (el, index) => (
                    <div
                      key={`thumb_${index}`}
                      onClick={() => {
                        const pages = containerRef.current?.querySelectorAll(".react-pdf__Page");
                        pages?.[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        if (window.innerWidth < 1024) setShowThumbnails(false);
                      }}
                      className="group relative cursor-pointer"
                    >
                      <div className={`aspect-[1/1.414] rounded-lg overflow-hidden transition-all duration-300 flex items-center justify-center bg-white ${pageNumber === index + 1 ? 'ring-2 ring-primary shadow-2xl scale-[0.98]' : 'ring-1 ring-border/20 shadow-md group-hover:shadow-xl group-hover:-translate-y-1'}`}>
                        <Page
                          pageNumber={index + 1}
                          width={200}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="w-full h-full object-cover"
                          loading={
                            <div className="w-full h-full bg-foreground/[0.03] animate-pulse flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-foreground/20 animate-spin" />
                            </div>
                          }
                        />
                      </div>
                      {/* Center Hover page number indicator */}
                      <div className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${pageNumber === index + 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className={`px-4 py-2 rounded-full shadow-2xl text-[10px] sm:text-xs font-black tracking-widest uppercase backdrop-blur-md ${pageNumber === index + 1 ? 'bg-primary text-primary-foreground' : 'bg-black/60 text-white'}`}>
                          Page {index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* MAIN PDF CANVAS */}
          <main
            ref={containerRef}
            onMouseDown={handleDragScroll}
            onTouchEnd={handleTouchEnd}
            className={`flex-1 relative overflow-auto no-scrollbar scroll-smooth bg-muted/20 transition-colors duration-500 ${dragMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
          >
            {/* Elegant Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10 h-full min-h-[200vh] w-full" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)", backgroundSize: "32px 32px" }}></div>

            <div className="min-h-full py-28 px-4 sm:px-12 flex flex-col items-center pointer-events-auto relative z-10">
              <AnimatePresence mode="popLayout">
                {Array.from(new Array(numPages), (el, index) => (
                  <motion.div
                    key={`page_${index + 1}`}
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 relative group"
                  >
                    <div className="shadow-xl dark:shadow-black border-none rounded-xl overflow-hidden bg-white ring-1 ring-border/20 transition-shadow hover:shadow-2xl">
                      {/* Apply baseWidth fixed strictly, let scale multiply the native canvas internally via react-pdf */}
                      <Page
                        pageNumber={index + 1}
                        width={baseWidth}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="transition-transform duration-300 ease-out"
                        loading={<div className="animate-pulse bg-muted w-full aspect-[1/1.414]" />}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </main>
        </Document>
      )}

      {/* =========================================================================
          UNIFIED GLASSMORPHISM COMMAND BAR (BOTTOM)
          ========================================================================= */}
      <AnimatePresence>
        {!isPrinting && pdfUrl && (
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 inset-x-0 z-[60] flex flex-col items-center pointer-events-none px-4"
          >

            {/* Share / Export Popover Layer */}
            <AnimatePresence>
              {isShareMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="w-full max-w-sm glass rounded-[2rem] p-5 shadow-2xl pointer-events-auto border border-border/40 mb-3"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Export Options</span>
                    <button onClick={() => setIsShareMenuOpen(false)} className="p-1 rounded-full hover:bg-foreground/10"><X size={14} /></button>
                  </div>

                  <div className="bg-white rounded-2xl p-3 mb-4 max-w-[140px] mx-auto shadow-inner">
                    <img src={qrDataUrl} alt="QR" className="w-full h-auto" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleShare} className="h-10 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 flex items-center justify-center gap-2 transition">
                      <Share2 size={14} /> Send
                    </button>
                    <button onClick={handleCopy} className="h-10 border border-border/50 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-foreground/5 flex items-center justify-center gap-2 transition">
                      {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />} Copy
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            {/* The Main Pill */}
            {/* sm:overflow-visible is CRITICAL here so the desktop Zoom Popover can break out of the pill box without being clipped! */}
            <div className="glass rounded-full p-1.5 flex items-center shadow-2xl pointer-events-auto border border-border/20 backdrop-blur-3xl overflow-x-auto sm:overflow-visible max-w-full no-scrollbar">

              {/* Zoom Group */}
              <div className="flex items-center shrink-0 bg-background/40 dark:bg-background/20 rounded-full p-1 border border-border/10 relative">
                <button onClick={() => setScale(p => Math.max(0.4, p - 0.2))} className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Zoom Out"><ZoomOut size={14} className="sm:w-4 sm:h-4" /></button>

                {/* Zoom Preset Trigger */}
                <button
                  onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                  className={`w-14 sm:w-16 h-9 sm:h-10 flex items-center justify-center rounded-full transition-colors hover:bg-background/80 ${isZoomMenuOpen ? 'bg-background shadow-inner' : ''}`}
                >
                  <span className="text-[11px] sm:text-[12px] font-black font-mono tracking-tighter">{Math.round(scale * 100)}%</span>
                </button>

                <button onClick={() => setScale(p => Math.min(2.5, p + 0.2))} className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Zoom In"><ZoomIn size={14} className="sm:w-4 sm:h-4" /></button>

                {/* ZOOM DROPDOWN POPOVER (DESKTOP ONLY) */}
                <AnimatePresence>
                  {isZoomMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="hidden sm:block absolute bottom-full left-0 mb-4 w-52 bg-background/95 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-border/40 pointer-events-auto"
                    >
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => { setScale(1.0); setIsZoomMenuOpen(false); }} className={`w-full text-left px-4 py-2 hover:bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-3 transition-colors ${scale === 1.0 ? 'text-primary bg-primary/5' : ''}`}>
                          <Maximize2 size={14} className="opacity-50" />
                          <span className="flex-1">Ajuster (100%)</span>
                          {scale === 1.0 && <Check size={14} />}
                        </button>
                        <button onClick={handleFitToWidth} className="w-full text-left px-4 py-2 hover:bg-foreground/5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-3 transition-colors">
                          <ArrowLeftRight size={14} className="opacity-50" />
                          <span className="flex-1">Ajuster Largeur</span>
                        </button>
                        <button onClick={handleFitToHeight} className="w-full text-left px-4 py-2 hover:bg-foreground/5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-3 transition-colors">
                          <ArrowUpDown size={14} className="opacity-50" />
                          <span className="flex-1">Ajuster Hauteur</span>
                        </button>

                        <div className="h-[1px] bg-border/40 my-1 mx-2" />

                        <div className="grid grid-cols-5 gap-1.5 px-2 pb-1">
                          {[0.5, 0.75, 1.0, 1.5, 2.0].map((v) => (
                            <button key={v} onClick={() => { setScale(v); setIsZoomMenuOpen(false); }} className={`py-2 flex items-center justify-center rounded-lg text-[10px] font-mono tracking-tighter transition ${scale === v ? 'bg-primary text-primary-foreground shadow-md font-black' : 'hover:bg-foreground/10 text-muted-foreground hover:text-foreground'}`}>
                              {v * 100}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Cursor Modes */}
              <div className="hidden sm:flex shrink-0 items-center bg-background/40 dark:bg-background/20 rounded-full p-1 ml-2 border border-border/10">
                <button onClick={() => setDragMode(false)} className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${!dragMode ? 'bg-primary text-primary-foreground shadow-sm scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-background'}`} title="Select Text"><MousePointer2 size={16} /></button>
                <button onClick={() => setDragMode(true)} className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${dragMode ? 'bg-primary text-primary-foreground shadow-sm scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-background'}`} title="Pan / Grab"><Hand size={16} /></button>
              </div>

              <div className="w-[1px] h-6 bg-border mx-2 shrink-0" />

              {/* Counter Indicator */}
              <div className="px-1 sm:px-2 flex items-center justify-center shrink-0">
                <span className="text-[10px] sm:text-xs font-black font-mono">{pageNumber} <span className="opacity-40 font-bold">/ {numPages}</span></span>
              </div>

              <div className="w-[1px] h-6 bg-border mx-2 shrink-0" />

              {/* Primary Actions Workspace */}
              <div className="flex shrink-0 items-center gap-1 bg-background/40 dark:bg-background/20 rounded-full p-1 border border-border/10">
                <button onClick={() => { setScale(1.0); }} className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Reset Zoom / Fit"><Maximize2 size={14} className="sm:w-4 sm:h-4" /></button>
                <button onClick={handlePrint} className="hidden lg:flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Print Quality PDF"><Printer size={16} /></button>
                <button onClick={handleDownload} className="hidden lg:flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Download Document"><Download size={16} /></button>
                <button onClick={() => setIsShareMenuOpen(!isShareMenuOpen)} className={`h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition active:scale-90 ${isShareMenuOpen ? 'bg-primary text-primary-foreground shadow-md scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-background'}`} title="Share Document">
                  <Share2 size={14} className="sm:w-4 sm:h-4" />
                </button>

                {/* Mobile Overflow Menu */}
                <button onClick={() => setIsMoreMenuOpen(true)} className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90">
                  <MoreHorizontal size={16} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMoreMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100] p-4 flex items-end sm:hidden pointer-events-auto">
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="w-full glass rounded-[2rem] p-5 shadow-2xl border border-border/40 pointer-events-auto">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest">Document Actions</span>
                <button onClick={() => setIsMoreMenuOpen(false)} className="h-8 w-8 bg-foreground/10 flex items-center justify-center rounded-xl"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => { handlePrint(); setIsMoreMenuOpen(false); }} className="h-12 glass border border-border/30 rounded-2xl flex items-center gap-3 px-4 active:scale-95 transition"><Printer size={16} className="text-primary" /> <span className="text-[10px] font-black uppercase tracking-widest">Print</span></button>
                <button onClick={() => { handleDownload(); setIsMoreMenuOpen(false); }} className="h-12 glass border border-border/30 rounded-2xl flex items-center gap-3 px-4 active:scale-95 transition"><Download size={16} className="text-primary" /> <span className="text-[10px] font-black uppercase tracking-widest">Export</span></button>
              </div>
              <div className="glass border border-border/30 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Interaction Mode</span>
                <div className="flex bg-foreground/10 p-1 rounded-xl">
                  <button onClick={() => setDragMode(false)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${!dragMode ? 'bg-primary text-primary-foreground shadow-sm' : ''}`}><MousePointer2 size={12} /></button>
                  <button onClick={() => setDragMode(true)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${dragMode ? 'bg-primary text-primary-foreground shadow-sm' : ''}`}><Hand size={12} /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isZoomMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] p-4 flex items-end sm:hidden pointer-events-auto" onClick={() => setIsZoomMenuOpen(false)}>
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} onClick={(e) => e.stopPropagation()} className="w-full glass rounded-[2rem] p-6 shadow-2xl border border-border/40 pointer-events-auto flex flex-col gap-2">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-primary">Niveau de Zoom</span>
                <button onClick={() => setIsZoomMenuOpen(false)} className="h-10 w-10 bg-foreground/10 flex items-center justify-center rounded-2xl"><X size={16} /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <button onClick={() => { handleFitToWidth(); setIsZoomMenuOpen(false); }} className="h-16 glass rounded-2xl border border-border/30 text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 active:scale-95 transition hover:bg-foreground/5">
                  <ArrowLeftRight size={18} className="text-primary/60" />
                  Ajuster Largeur
                </button>
                <button onClick={() => { handleFitToHeight(); setIsZoomMenuOpen(false); }} className="h-16 glass rounded-2xl border border-border/30 text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 active:scale-95 transition hover:bg-foreground/5">
                  <ArrowUpDown size={18} className="text-primary/60" />
                  Ajuster Hauteur
                </button>
              </div>

              <button onClick={() => { setScale(1.0); setIsZoomMenuOpen(false); }} className={`w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition flex items-center justify-center gap-3 mb-2 ${scale === 1.0 ? 'bg-primary text-primary-foreground shadow-xl' : 'glass border border-border/50 text-foreground hover:bg-foreground/5'}`}>
                <Maximize2 size={16} className={scale === 1.0 ? "opacity-80" : "text-primary"} />
                Vue Standard (100%)
              </button>

              <div className="grid grid-cols-5 gap-2">
                {[0.5, 0.75, 1.0, 1.5, 2.0].map((v) => (
                  <button key={v} onClick={() => { setScale(v); setIsZoomMenuOpen(false); }} className={`h-12 flex items-center justify-center rounded-xl text-[10px] sm:text-xs font-mono font-bold transition active:scale-90 ${scale === v ? 'bg-primary text-primary-foreground shadow-xl ring-2 ring-primary ring-offset-2 ring-offset-background' : 'bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground'}`}>
                    {v * 100}%
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        /* PRINT OPTIMIZATION - ABSOLUTE FIDELITY */
        @page { size: A4; margin: 0; }
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; margin: 0 !important; }
          .glass, button, [class*="fixed"], [class*="absolute"], aside, .no-scrollbar::-webkit-scrollbar { display: none !important; }
          main { display: block !important; position: static !important; background: #fff !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .react-pdf__Document { display: block !important; width: 100% !important; }
          .react-pdf__Page { margin: 0 !important; page-break-after: always !important; width: 210mm !important; box-shadow: none !important; max-width: 100% !important; border: none !important; }
          .react-pdf__Page__canvas { width: 100% !important; height: auto !important; image-rendering: high-quality; margin: 0 !important; border: none !important; box-shadow: none !important; }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .glass {
          background: rgba(var(--background), 0.6) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
        }

        .dark .glass {
          background: rgba(10, 10, 10, 0.6) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
        }
      `}</style>
    </div>
  );
}
