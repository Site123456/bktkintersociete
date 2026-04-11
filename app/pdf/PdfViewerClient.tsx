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
import { motion, AnimatePresence, useDragControls } from "framer-motion";
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
  const sheetDragControls = useDragControls();
  const moreDragControls = useDragControls();
  const zoomDragControls = useDragControls();
  const shareDragControls = useDragControls();
  const [copied, setCopied] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  // States
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  // Initialize baseWidth to fit screen width on mobile immediately, avoiding a flash of wrong-size content
  const [baseWidth, setBaseWidth] = useState<number>(
    typeof window !== 'undefined' && window.innerWidth < 1024 ? window.innerWidth - 20 : 600
  );
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

      if (isMobile) {
        // Mobile: fit-to-width with only 20px total horizontal margin
        // This gives maximum reading real-estate on small screens
        setBaseWidth(containerWidth - 20);
      } else {
        // Desktop: balanced fit considering sidebar and height
        const sidebarWidth = showThumbnails ? 260 : 0;
        const paddingX = 80;
        const availableWidth = containerWidth - sidebarWidth - paddingX;

        const paddingY = 260;
        const availableHeight = containerHeight > paddingY ? containerHeight - paddingY : containerHeight;
        const pageRatio = 595 / 842; // standard A4 aspect ratio -> w/h
        const heightBasedWidth = availableHeight * pageRatio;

        setBaseWidth(Math.min(availableWidth, heightBasedWidth, 1200));
      }
    }
  }, [containerWidth, containerHeight, showThumbnails, numPages]);

  const handlePrint = useCallback(async (e?: React.MouseEvent | KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!pdfUrl) return;

    // WebKit/Safari suffers from a known multi-page clipping bug for hidden iframes.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    setIsPrinting(true);
    try {
      if (isSafari) {
        // Synchronously open tab immediately to bypass popup blocker, then fetch
        const newWin = window.open("", "_blank");
        await fetch(pdfUrl);
        if (newWin) {
          newWin.location.href = pdfUrl;
        } else {
          window.location.href = pdfUrl; // fallback if popup strictly blocked
        }
        setIsPrinting(false);
        return;
      }

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
    if (isMobile) {
      // On mobile, baseWidth IS already fit-to-width, so just reset scale to 1.0
      setScale(1.0);
    } else {
      const sidebarWidth = showThumbnails ? 260 : 0;
      const paddingX = 80;
      const availableWidth = window.innerWidth - sidebarWidth - paddingX;
      setScale(Math.min(availableWidth / baseWidth, 3.0));
    }
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
          className="h-10 w-10 sm:h-12 sm:w-12 glass rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/10 hover:bg-foreground/5 hover:scale-105 active:scale-95 backdrop-blur-[40px]"
        >
          <ChevronLeft size={18} className="sm:hidden" />
          <ChevronLeft size={20} className="hidden sm:block" />
        </button>

        {/* Document Mini-Pill */}
        <div className="glass flex h-10 sm:h-12 items-center px-3 sm:px-4 rounded-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-w-[calc(100vw-140px)] sm:max-w-none backdrop-blur-[60px] transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <div className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-black/5 dark:border-white/5 ${docType === 'stock' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
            {docTitleLabel}
          </div>
          <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-3 shrink-0" />
          <span className="text-[10px] sm:text-[12px] font-extrabold tracking-wide truncate opacity-90 drop-shadow-sm">{siteName}</span>
        </div>
      </motion.div>

      {/* FLOATING TOP-RIGHT THEME & THUMBNAILS COMPACT */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3 print:hidden"
      >
        <button
          onClick={() => setShowThumbnails(!showThumbnails)}
          className={`h-10 w-10 sm:h-12 sm:w-12 glass rounded-2xl flex items-center justify-center transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border hover:scale-105 active:scale-95 backdrop-blur-[40px] ${showThumbnails ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground hover:text-foreground border-white/20 dark:border-white/10'}`}
        >
          <LayoutGrid size={16} className="sm:hidden" />
          <LayoutGrid size={18} className="hidden sm:block" />
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-10 w-10 sm:h-12 sm:w-12 glass flex rounded-2xl items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/10 hover:scale-105 active:scale-95 backdrop-blur-[40px]"
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
              <>
                {/* MOBILE: Premium Bottom-Sheet Drawer */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[79] bg-black/20 backdrop-blur-sm pointer-events-auto lg:hidden"
                  onClick={() => setShowThumbnails(false)}
                />
                <motion.aside
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  drag="y"
                  dragControls={sheetDragControls}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={(_e, info) => {
                    if (info.offset.y > 80 || info.velocity.y > 200) {
                      setShowThumbnails(false);
                    }
                  }}
                  className="fixed bottom-0 left-0 right-0 z-[80] max-h-[72vh] bg-background/80 backdrop-blur-[60px] border-t border-white/20 dark:border-white/10 rounded-t-[2rem] flex flex-col pointer-events-auto lg:hidden shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
                >
                  {/* Subtle Grid Background for mobile drawer */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0v40H0V0h40zM39 1H1v38h39V1z' fill='currentColor' fill-rule='evenodd'/%3E%3C/svg%3E")` }} />

                  {/* Drag Handle — swipe down to dismiss */}
                  <div
                    className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none relative z-10"
                    onPointerDown={(e) => sheetDragControls.start(e)}
                    style={{ touchAction: 'none' }}
                  >
                    <div className="w-12 h-1.5 bg-foreground/25 rounded-full transition-colors active:bg-foreground/40" />
                  </div>

                  {/* Header */}
                  <div className="px-5 py-3 flex items-center justify-between border-b border-foreground/5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
                        <LayoutGrid size={14} className="text-primary" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/80">Aperçu</span>
                        <span className="text-[10px] text-foreground/40 ml-2 font-bold">{numPages} pages</span>
                      </div>
                    </div>
                    <button onClick={() => setShowThumbnails(false)} className="h-9 w-9 bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center rounded-xl active:scale-90 transition-all">
                      <X size={16} className="text-foreground/60" />
                    </button>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="flex-1 overflow-y-auto px-3 py-4 pb-[env(safe-area-inset-bottom,24px)] no-scrollbar grid grid-cols-3 gap-3 content-start">
                    {Array.from(new Array(numPages), (el, index) => (
                      <motion.div
                        key={`thumb_m_${index}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => {
                          const pages = containerRef.current?.querySelectorAll(".react-pdf__Page");
                          pages?.[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setShowThumbnails(false);
                        }}
                        className="group relative cursor-pointer flex flex-col items-center"
                      >
                        <div className={`w-full aspect-[1/1.414] rounded-xl overflow-hidden transition-all duration-300 flex items-center justify-center bg-white dark:bg-white relative ${pageNumber === index + 1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_8px_28px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] scale-[0.97]' : 'border border-black/8 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] group-active:scale-[0.95] group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)]'}`}>
                          <Page
                            pageNumber={index + 1}
                            width={220}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="w-full h-full object-cover"
                            loading={
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-100 dark:to-slate-200 relative overflow-hidden">
                                <div className="absolute inset-0 shimmer-sweep" />
                                <FileText className="w-5 h-5 text-slate-300" />
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-12 h-1 bg-slate-200 rounded-full" />
                                  <div className="w-8 h-1 bg-slate-200 rounded-full" />
                                </div>
                              </div>
                            }
                          />
                          {/* Active check badge */}
                          {pageNumber === index + 1 && (
                            <div className="absolute top-1.5 right-1.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center shadow-lg z-10">
                              <Check size={10} className="text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <span className={`mt-2 text-[10px] font-bold tracking-wide transition-colors ${pageNumber === index + 1 ? 'text-primary font-black' : 'text-foreground/40 group-hover:text-foreground/60'}`}>
                          {index + 1}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.aside>

                {/* DESKTOP: Refined Sidebar */}
                <motion.aside
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="hidden lg:flex relative z-40 w-[260px] flex-col pt-24 transition-all duration-500 overflow-hidden"
                >
                  {/* Background: solid left fading to transparent right */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, hsl(var(--background) / 0.6) 0%, hsl(var(--background) / 0.35) 60%, transparent 100%)' }} />
                  <div className="absolute inset-0 pointer-events-none backdrop-blur-[60px]" style={{ maskImage: 'linear-gradient(to right, black 0%, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 0%, black 50%, transparent 100%)' }} />

                  {/* Subtle Grid Background for sidebar */}
                  <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0v40H0V0h40zM39 1H1v38h39V1z' fill='currentColor' fill-rule='evenodd'/%3E%3C/svg%3E")`, maskImage: 'linear-gradient(to right, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)' }} />

                  {/* Soft right edge fade line */}
                  <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-foreground/[0.04] to-transparent" />

                  {/* Header */}
                  <div className="px-5 pb-4 flex items-center gap-2.5 relative z-10">
                    <div className="h-7 w-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <LayoutGrid size={12} className="text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45">Aperçu</span>
                    <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-md font-black text-primary ml-auto">{numPages}</span>
                  </div>

                  {/* Thumbnails */}
                  <div className="flex-1 overflow-y-auto px-3 pb-28 no-scrollbar flex flex-col gap-2 content-start">
                    {Array.from(new Array(numPages), (el, index) => (
                      <motion.div
                        key={`thumb_d_${index}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => {
                          const pages = containerRef.current?.querySelectorAll(".react-pdf__Page");
                          pages?.[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className={`group relative cursor-pointer flex items-center gap-3 p-2 rounded-xl transition-all duration-300 ${pageNumber === index + 1 ? 'bg-primary/5 dark:bg-primary/8' : 'hover:bg-foreground/[0.03]'}`}
                      >
                        {/* Active indicator bar */}
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300 ${pageNumber === index + 1 ? 'h-10 bg-primary' : 'h-0 bg-transparent'}`} />

                        <div className={`w-[80px] shrink-0 aspect-[1/1.414] rounded-lg overflow-hidden transition-all duration-300 flex items-center justify-center bg-white dark:bg-white relative ${pageNumber === index + 1 ? 'ring-[1.5px] ring-primary shadow-[0_6px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.35)]' : 'border border-black/6 dark:border-white/8 shadow-[0_1px_4px_rgba(0,0,0,0.04)] group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] group-hover:-translate-y-0.5'}`}>
                          <Page
                            pageNumber={index + 1}
                            width={200}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="w-full h-full object-cover"
                            loading={
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-100 dark:to-slate-200 relative overflow-hidden">
                                <div className="absolute inset-0 shimmer-sweep" />
                                <FileText className="w-4 h-4 text-slate-300" />
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="w-8 h-0.5 bg-slate-200 rounded-full" />
                                  <div className="w-6 h-0.5 bg-slate-200 rounded-full" />
                                </div>
                              </div>
                            }
                          />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className={`text-[11px] font-bold transition-colors ${pageNumber === index + 1 ? 'text-primary font-extrabold' : 'text-foreground/55 group-hover:text-foreground/75'}`}>
                            Page {index + 1}
                          </span>
                          {pageNumber === index + 1 && (
                            <span className="text-[9px] text-primary/50 font-semibold mt-0.5 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                              Lecture en cours
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
          <main
            ref={containerRef}
            onMouseDown={handleDragScroll}
            onTouchEnd={handleTouchEnd}
            className={`flex-1 relative overflow-auto no-scrollbar scroll-smooth bg-slate-50 dark:bg-[#050505] transition-colors duration-700 ${dragMode ? "cursor-grab active:cursor-grabbing select-none" : "cursor-default"}`}
          >
            <div className={`min-h-full py-20 sm:py-28 px-[10px] sm:px-12 flex flex-col items-center relative z-10 ${dragMode ? 'pointer-events-none' : 'pointer-events-auto'}`}>
              {/* Cinematic Background & Grid (Expansion-aware) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-[-1]">
                {/* Dynamic Aura Orbs with Floating Animation */}
                <motion.div
                  animate={{
                    x: [0, 40, 0],
                    y: [0, -60, 0],
                    rotate: [0, 10, 0]
                  }}
                  transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-[-5%] left-[-15%] w-[110vw] h-[110vw] rounded-full bg-orange-500/15 dark:bg-orange-500/20 blur-[140px] mix-blend-normal opacity-80"
                />
                <motion.div
                  animate={{
                    x: [0, -60, 0],
                    y: [0, 30, 0],
                    rotate: [0, -10, 0]
                  }}
                  transition={{ duration: 40, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className="absolute top-[30%] right-[-15%] w-[90vw] h-[90vw] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] mix-blend-normal opacity-50"
                />
                <motion.div
                  animate={{
                    x: [30, 70, 30],
                    y: [0, 40, 0]
                  }}
                  transition={{ duration: 45, repeat: Infinity, ease: "easeInOut", delay: 5 }}
                  className="absolute bottom-[10%] left-[5%] w-[100vw] h-[100vw] rounded-full bg-blue-600/15 dark:bg-blue-600/20 blur-[150px] mix-blend-normal opacity-70"
                />

                {/* Fine Repeating Grid Pattern */}
                <div
                  className="absolute inset-0 opacity-[0.06] dark:hidden h-full w-full"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0v60H0V0h60zM59 1H1v58h58V1z' fill='%23000000' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat'
                  }}
                />
                <div
                  className="absolute inset-0 opacity-[0.03] hidden dark:block h-full w-full"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0v60H0V0h60zM59 1H1v58h58V1z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat'
                  }}
                />
              </div>

              <AnimatePresence mode="popLayout">
                {Array.from(new Array(numPages), (el, index) => {
                  // Ambient color palette — cycles through warm/cool tones per page
                  const ambientColors = [
                    { light: 'rgba(251,146,60,0.12)', dark: 'rgba(251,146,60,0.18)' },   // orange
                    { light: 'rgba(52,211,153,0.10)', dark: 'rgba(52,211,153,0.15)' },    // emerald
                    { light: 'rgba(96,165,250,0.12)', dark: 'rgba(96,165,250,0.18)' },    // blue
                    { light: 'rgba(192,132,252,0.10)', dark: 'rgba(167,139,250,0.15)' },  // violet
                    { light: 'rgba(251,113,133,0.10)', dark: 'rgba(251,113,133,0.15)' },  // rose
                  ];
                  const ambient = ambientColors[index % ambientColors.length];

                  return (
                    <motion.div
                      key={`page_${index + 1}`}
                      initial={{ opacity: 0, y: 50, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.05, 0.3) }}
                      className="mb-8 sm:mb-12 relative group"
                    >
                      {/* Per-page ambient glow */}
                      <div
                        className="absolute -inset-8 sm:-inset-12 rounded-[3rem] blur-[60px] sm:blur-[80px] opacity-70 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-0"
                        style={{ background: `radial-gradient(ellipse at center, var(--ambient-color) 0%, transparent 70%)`, ['--ambient-color' as string]: ambient.light }}
                      />
                      <div
                        className="absolute -inset-8 sm:-inset-12 rounded-[3rem] blur-[60px] sm:blur-[80px] opacity-0 dark:opacity-70 dark:group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-0"
                        style={{ background: `radial-gradient(ellipse at center, ${ambient.dark} 0%, transparent 70%)` }}
                      />

                      <div className="relative z-10 shadow-[0_0_40px_rgba(0,0,0,0.06)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-black/5 dark:border-white/10 rounded-sm overflow-hidden bg-white transition-all duration-700 ease-out group-hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.18)] dark:group-hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.7)] group-hover:-translate-y-1 sm:group-hover:-translate-y-2 group-hover:scale-[1.005] sm:group-hover:scale-[1.01]">
                        {/* Apply baseWidth fixed strictly, let scale multiply the native canvas internally via react-pdf */}
                        <Page
                          pageNumber={index + 1}
                          width={baseWidth}
                          scale={scale}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="transition-transform duration-300 ease-out"
                          loading={
                            <div className="w-full aspect-[1/1.414] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-950 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                              <div className="absolute inset-0 shimmer-sweep" />
                              <FileText className="w-8 h-8 text-slate-200 dark:text-neutral-700" />
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="w-20 h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full" />
                                <div className="w-14 h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full" />
                                <div className="w-10 h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full" />
                              </div>
                              <span className="text-[9px] font-bold text-slate-300 dark:text-neutral-600 uppercase tracking-widest mt-1">Page {index + 1}</span>
                            </div>
                          }
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </main>
        </Document>
      )}

      <AnimatePresence>
        {!isPrinting && pdfUrl && (
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-3 sm:bottom-6 inset-x-0 z-[60] flex flex-col items-center pointer-events-none px-2 sm:px-4"
          >

            {/* Share / Export Popover Layer — desktop: popover, mobile: handled in dedicated bottom-sheet below */}
            <AnimatePresence>
              {isShareMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="hidden sm:block w-full max-w-sm glass rounded-[2rem] p-5 shadow-2xl pointer-events-auto border border-border/40 mb-3"
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
            <div className="glass rounded-[1.25rem] sm:rounded-[2rem] p-1 sm:p-1.5 flex items-center shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] pointer-events-auto border border-white/30 dark:border-white/10 backdrop-blur-[60px] overflow-x-auto sm:overflow-visible max-w-full no-scrollbar transition-shadow duration-500 hover:shadow-[0_30px_80px_-10px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_30px_80px_-10px_rgba(0,0,0,0.8)] gap-0.5 sm:gap-0">

              {/* Zoom Group */}
              <div className="flex items-center shrink-0 bg-white/40 dark:bg-black/40 rounded-full p-0.5 sm:p-1 border border-black/5 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] relative">
                <button onClick={() => setScale(p => Math.max(0.4, p - 0.2))} className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Zoom Out"><ZoomOut size={13} className="sm:w-4 sm:h-4" /></button>

                {/* Zoom Preset Trigger */}
                <button
                  onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                  className={`w-11 sm:w-16 h-8 sm:h-10 flex items-center justify-center rounded-full transition-colors hover:bg-background/80 ${isZoomMenuOpen ? 'bg-background shadow-inner' : ''}`}
                >
                  <span className="text-[10px] sm:text-[12px] font-black font-mono tracking-tighter">{Math.round(scale * 100)}%</span>
                </button>

                <button onClick={() => setScale(p => Math.min(2.5, p + 0.2))} className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Zoom In"><ZoomIn size={13} className="sm:w-4 sm:h-4" /></button>

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
              <div className="hidden sm:flex shrink-0 items-center bg-white/40 dark:bg-black/40 rounded-full p-1 ml-2 border border-black/5 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                <button onClick={() => setDragMode(false)} className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${!dragMode ? 'bg-primary text-primary-foreground shadow-sm scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-background'}`} title="Select Text"><MousePointer2 size={16} /></button>
                <button onClick={() => setDragMode(true)} className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${dragMode ? 'bg-primary text-primary-foreground shadow-sm scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-background'}`} title="Pan / Grab"><Hand size={16} /></button>
              </div>

              <div className="w-[1px] h-5 sm:h-6 bg-border mx-1 sm:mx-2 shrink-0" />

              {/* Counter Indicator */}
              <div className="px-2 sm:px-4 flex items-center justify-center shrink-0 h-10 group/counter">
                <div className="flex items-center gap-2 bg-foreground/[0.03] dark:bg-white/5 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5 transition-colors group-hover/counter:border-primary/20">
                  <span className="text-[10px] sm:text-[11px] font-black font-mono text-primary flex items-center gap-1.5">
                    {pageNumber}
                  </span>
                  <div className="w-[1px] h-3 bg-foreground/10 dark:bg-white/10" />
                  <span className="text-[10px] sm:text-[11px] font-black font-mono text-foreground/30">{numPages}</span>
                </div>
              </div>

              <div className="w-[1px] h-5 sm:h-6 bg-border mx-1 sm:mx-2 shrink-0" />

              {/* Primary Actions Workspace */}
              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 bg-white/40 dark:bg-black/40 rounded-full p-0.5 sm:p-1 border border-black/5 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                <button onClick={() => { setScale(1.0); }} className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Reset Zoom / Fit"><Maximize2 size={13} className="sm:w-4 sm:h-4" /></button>
                <button onClick={handlePrint} className="hidden lg:flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Print Quality PDF"><Printer size={16} /></button>
                <button onClick={handleDownload} className="hidden lg:flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90" title="Download Document"><Download size={16} /></button>
                <button onClick={() => setIsShareMenuOpen(!isShareMenuOpen)} className={`h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition active:scale-90 ${isShareMenuOpen ? 'bg-primary text-primary-foreground shadow-md scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-background'}`} title="Share Document">
                  <Share2 size={13} className="sm:w-4 sm:h-4" />
                </button>

                {/* Mobile Overflow Menu */}
                <button onClick={() => setIsMoreMenuOpen(true)} className="lg:hidden h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-90">
                  <MoreHorizontal size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE: Document Actions Bottom Sheet */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99] sm:hidden pointer-events-auto" onClick={() => setIsMoreMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              drag="y"
              dragControls={moreDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_e, info) => { if (info.offset.y > 80 || info.velocity.y > 200) setIsMoreMenuOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-[60px] rounded-t-[2rem] border-t border-white/20 dark:border-white/10 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5)] p-5 pt-0 sm:hidden pointer-events-auto"
            >
              <div className="flex justify-center pt-3 pb-2 select-none" onPointerDown={(e) => moreDragControls.start(e)} style={{ touchAction: 'none' }}>
                <div className="w-12 h-1.5 bg-foreground/25 rounded-full transition-colors active:bg-foreground/40" />
              </div>
              <div className="flex justify-between items-center mb-5">
                <span className="text-[10px] font-black uppercase tracking-widest">Document Actions</span>
                <button onClick={() => setIsMoreMenuOpen(false)} className="h-8 w-8 bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center rounded-xl transition-all"><X size={14} className="text-foreground/60" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => { handlePrint(); setIsMoreMenuOpen(false); }} className="h-14 bg-foreground/[0.03] border border-border/30 rounded-2xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition"><Printer size={18} className="text-primary" /> <span className="text-[9px] font-black uppercase tracking-widest">Imprimer</span></button>
                <button onClick={() => { handleDownload(); setIsMoreMenuOpen(false); }} className="h-14 bg-foreground/[0.03] border border-border/30 rounded-2xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition"><Download size={18} className="text-primary" /> <span className="text-[9px] font-black uppercase tracking-widest">Exporter</span></button>
              </div>
              <div className="bg-foreground/[0.02] border border-border/30 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Mode Interaction</span>
                <div className="flex bg-foreground/5 p-1 rounded-xl gap-0.5">
                  <button onClick={() => setDragMode(false)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${!dragMode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/50'}`}><MousePointer2 size={12} /></button>
                  <button onClick={() => setDragMode(true)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${dragMode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/50'}`}><Hand size={12} /></button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MOBILE: Export / Share Bottom Sheet */}
      <AnimatePresence>
        {isShareMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99] sm:hidden pointer-events-auto" onClick={() => setIsShareMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              drag="y"
              dragControls={shareDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_e, info) => { if (info.offset.y > 80 || info.velocity.y > 200) setIsShareMenuOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-[60px] rounded-t-[2rem] border-t border-white/20 dark:border-white/10 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5)] p-5 pt-0 sm:hidden pointer-events-auto"
            >
              <div className="flex justify-center pt-3 pb-2 select-none" onPointerDown={(e) => shareDragControls.start(e)} style={{ touchAction: 'none' }}>
                <div className="w-12 h-1.5 bg-foreground/25 rounded-full transition-colors active:bg-foreground/40" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Partager</span>
                <button onClick={() => setIsShareMenuOpen(false)} className="h-8 w-8 bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center rounded-xl transition-all"><X size={14} className="text-foreground/60" /></button>
              </div>

              <div className="bg-white rounded-2xl p-4 mb-4 max-w-[160px] mx-auto shadow-inner">
                <img src={qrDataUrl} alt="QR" className="w-full h-auto" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleShare} className="h-12 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 flex items-center justify-center gap-2 transition active:scale-95">
                  <Share2 size={14} /> Envoyer
                </button>
                <button onClick={handleCopy} className="h-12 border border-border/50 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-foreground/5 flex items-center justify-center gap-2 transition active:scale-95">
                  {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />} Copier
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MOBILE: Zoom Level Bottom Sheet */}
      <AnimatePresence>
        {isZoomMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99] sm:hidden pointer-events-auto" onClick={() => setIsZoomMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              drag="y"
              dragControls={zoomDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_e, info) => { if (info.offset.y > 80 || info.velocity.y > 200) setIsZoomMenuOpen(false); }}
              onClick={(e) => e.stopPropagation()}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-[60px] rounded-t-[2rem] border-t border-white/20 dark:border-white/10 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5)] p-5 pt-0 sm:hidden pointer-events-auto flex flex-col gap-2"
            >
              <div className="flex justify-center pt-3 pb-2 select-none" onPointerDown={(e) => zoomDragControls.start(e)} style={{ touchAction: 'none' }}>
                <div className="w-12 h-1.5 bg-foreground/25 rounded-full transition-colors active:bg-foreground/40" />
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Niveau de Zoom</span>
                <button onClick={() => setIsZoomMenuOpen(false)} className="h-8 w-8 bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center rounded-xl transition-all"><X size={14} className="text-foreground/60" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <button onClick={() => { handleFitToWidth(); setIsZoomMenuOpen(false); }} className="h-14 bg-foreground/[0.03] rounded-2xl border border-border/30 text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 active:scale-95 transition">
                  <ArrowLeftRight size={16} className="text-primary/60" />
                  Largeur
                </button>
                <button onClick={() => { handleFitToHeight(); setIsZoomMenuOpen(false); }} className="h-14 bg-foreground/[0.03] rounded-2xl border border-border/30 text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 active:scale-95 transition">
                  <ArrowUpDown size={16} className="text-primary/60" />
                  Hauteur
                </button>
              </div>

              <button onClick={() => { setScale(1.0); setIsZoomMenuOpen(false); }} className={`w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition flex items-center justify-center gap-2.5 mb-2 ${scale === 1.0 ? 'bg-primary text-primary-foreground shadow-xl' : 'bg-foreground/[0.03] border border-border/40 text-foreground'}`}>
                <Maximize2 size={14} className={scale === 1.0 ? "opacity-80" : "text-primary"} />
                Standard (100%)
              </button>

              <div className="grid grid-cols-5 gap-2">
                {[0.5, 0.75, 1.0, 1.5, 2.0].map((v) => (
                  <button key={v} onClick={() => { setScale(v); setIsZoomMenuOpen(false); }} className={`h-11 flex items-center justify-center rounded-xl text-[10px] font-mono font-bold transition active:scale-90 ${scale === v ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background' : 'bg-foreground/5 hover:bg-foreground/10 text-muted-foreground'}`}>
                    {v * 100}%
                  </button>
                ))}
              </div>
            </motion.div>
          </>
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

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-sweep {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
          animation: shimmer 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
