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
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAutoFitting, setIsAutoFitting] = useState(true);

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

  // Fit to page logic
  useEffect(() => {
    if (numPages > 0 && containerWidth > 0 && isAutoFitting) {
      const isMobile = containerWidth < 640;
      const padding = isMobile ? 32 : 80;
      const availableWidth = containerWidth - padding - (showThumbnails && !isMobile ? 240 : 0);
      const availableHeight = containerHeight - (isMobile ? 120 : 160);

      // A4 aspect ratio 1:1.414 or 210/297
      const pageAspectRatio = 1.414;

      const scaleToWidth = availableWidth / 595; // Default PDF page width approx 595
      const scaleToHeight = availableHeight / (595 * pageAspectRatio);

      const newScale = Math.min(scaleToWidth, scaleToHeight, 1.5);
      setScale(Math.max(0.4, newScale));
      setIsAutoFitting(false);
    }
  }, [numPages, containerWidth, containerHeight, showThumbnails]);

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
        {/* THUMBNAILS SIDEBAR */}
        <AnimatePresence>
          {showThumbnails && (
            <motion.aside
              initial={{ x: -240, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -240, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute lg:relative inset-y-0 left-0 w-[240px] glass z-40 border-r border-border/50 flex flex-col pt-4 overflow-hidden"
            >
              <div className="px-6 mb-4 flex items-center justify-between">
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Pages</h3>
                <button onClick={() => setShowThumbnails(false)} className="lg:hidden h-6 w-6 rounded-full hover:bg-foreground/5 flex items-center justify-center">
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar space-y-4">
                {Array.from(new Array(numPages), (el, index) => (
                  <div
                    key={`thumb_${index}`}
                    onClick={() => {
                      const page = containerRef.current?.querySelectorAll(".react-pdf__Page")[index];
                      page?.scrollIntoView({ behavior: 'smooth' });
                      if (window.innerWidth < 1024) setShowThumbnails(false);
                    }}
                    className={`group cursor-pointer rounded-xl transition-all p-2 relative ${pageNumber === index + 1 ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-foreground/5'}`}
                  >
                    <div className="aspect-[3/4] bg-foreground/5 rounded-lg overflow-hidden border border-border/50 transition-transform group-hover:scale-[1.02] relative shadow-sm">
                      <Page
                        pageNumber={index + 1}
                        width={180}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="scale-[1.2] origin-top"
                      />
                      <div className={`absolute inset-0 bg-primary/20 transition-opacity flex items-center justify-center ${pageNumber === index + 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                        <span className="text-[10px] font-black text-white bg-primary px-2 py-1 rounded shadow-lg">{index + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
                        className="absolute top-0 left-0 h-16 w-16 border-2 border-primary border-t-transparent rounded-full"
                      ></motion.div>
                    </div>
                    <p className="text-[9px] font-black tracking-[0.4em] uppercase text-primary animate-pulse">Initializing Engine</p>
                  </div>
                }
                error={
                  <div className="text-white/30 flex flex-col items-center gap-4 py-40">
                    <X size={40} className="opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">Error Loading PDF</p>
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
                          width={containerWidth ? (containerWidth - (containerWidth < 1024 ? 40 : (showThumbnails ? 300 : 100))) * scale : 600}
                          className="transition-all duration-300"
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          loading={<div className="bg-foreground/[0.02] h-[800px] w-full animate-pulse"></div>}
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
          className="glass rounded-[1.5rem] p-1.5 flex items-center gap-1 shadow-2xl pointer-events-auto ring-1 ring-border/50 border border-white/5"
        >
          {/* Zoom Subgroup */}
          <div className="flex items-center bg-foreground/5 rounded-[1rem] p-0.5">
            <button onClick={() => { setScale(prev => Math.max(0.4, prev - 0.1)); setIsAutoFitting(false); }} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition" title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <div className="min-w-[50px] text-center">
              <span className="text-[10px] font-black font-mono tabular-nums">{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={() => { setScale(prev => Math.min(2.5, prev + 0.1)); setIsAutoFitting(false); }} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition" title="Zoom In">
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="px-3 flex flex-col items-center justify-center border-r border-border/30 h-8">
            <span className="text-[10px] font-black font-mono leading-none tracking-tighter">{pageNumber}<span className="opacity-30">/{numPages}</span></span>
          </div>

          {/* Action Subgroup (Desktop Only) */}
          <div className="hidden sm:flex items-center gap-1 ml-1">
            <button onClick={handlePrint} className="h-10 w-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-xl transition">
              <Printer size={15} />
            </button>
            <a href={pdfUrl} download={downloadName} className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition">
              <Download size={15} />
            </a>
            <button onClick={() => { setScale(1); setIsAutoFitting(true); }} className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition" title="Reset View">
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-border/30 mx-1 hidden sm:block" />

          {/* Share Button acts as trigger for QR overlay */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${!isMinimized ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
          >
            {isMinimized ? <Share2 size={15} /> : <X size={15} />}
          </button>

          {/* More Actions (Mobile Only) */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className="sm:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition"
          >
            <MoreHorizontal size={18} />
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
        aside .overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(var(--primary), 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
