"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFPageProxy } from "pdfjs-dist";
import { Download, FileWarning, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PdfPageFrame, PdfPageSkeleton, PDF_MAX_PAGE_WIDTH, pdfBackdropClass, pdfColumnClass } from "./PdfSkeleton";

/*
 * PDF viewer: draws every page of a PDF on a <canvas> with pdf.js, fitted to the column width.
 * pdf.js is loaded on demand (never on the server, never on other pages) and its worker is served from
 * our own origin (/pdf.worker.min.mjs, copied by scripts/copy-pdf-worker.mjs). The legacy build is used
 * on purpose: the modern one needs very recent browsers (older iPhones would show nothing).
 */

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((lib) => {
      // The version query makes browsers drop a cached worker of another pdf.js version.
      lib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${lib.version}`;
      return lib;
    });
    // A failed chunk download can be retried.
    pdfjsPromise.catch(() => {
      pdfjsPromise = null;
    });
  }
  return pdfjsPromise;
}

/** Sharper than the screen would be a waste of memory on phones. */
const MAX_PIXEL_RATIO = 3;

type Failure = "not-found" | "busy" | "offline" | "unreadable";

class LoadFailure extends Error {
  constructor(readonly reason: Failure) {
    super(reason);
  }
}

const FAILURE_TEXT: Record<Failure, string> = {
  "not-found": "Ce document n’existe pas ou plus. Vérifiez le lien.",
  busy: "Trop de demandes en peu de temps. Réessayez dans une minute.",
  offline: "Vérifiez votre connexion internet, puis réessayez.",
  unreadable: "Cet appareil n’arrive pas à afficher l’aperçu. Le PDF reste téléchargeable.",
};

const isCancel = (err: unknown) =>
  (err instanceof Error && (err.name === "AbortError" || err.name === "RenderingCancelledException")) ||
  (typeof err === "object" && err !== null && "name" in err && err.name === "RenderingCancelledException");

/** Nearest scrolling ancestor (the viewer itself in the history sheet), null when the window scrolls. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

/** Content width of an element (CSS px), updated on resize: at once the first time, then debounced. */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.min(entry.contentRect.width, PDF_MAX_PAGE_WIDTH);
      clearTimeout(timer);
      if (first) {
        first = false;
        setWidth(w);
      } else {
        timer = setTimeout(() => setWidth(w), 150);
      }
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [ref]);
  return width;
}

type PageProps = {
  page: PDFPageProxy;
  number: number;
  total: number;
  /** Page width in CSS px (0 until measured). */
  width: number;
  onCurrent: (n: number) => void;
};

/** One page: rendered when it comes near the screen, re-rendered after a resize (off screen, then swapped). */
function PdfPage({ page, number, total, width, onCurrent }: PageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintedAt = useRef("");
  // Short documents (almost all of them) are drawn at once, so printing never gives blank pages.
  const [near, setNear] = useState(number === 1 || total <= 6);
  const [painted, setPainted] = useState(false);
  const [broken, setBroken] = useState(false);
  const base = page.getViewport({ scale: 1 });
  const baseWidth = base.width;

  // Render pages up to one screen ahead.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear((n) => n || e.isIntersecting), { root: scrollParent(el), rootMargin: "100% 0px" });
    io.observe(el);
    // Longer documents: draw every page when the browser is about to print.
    const all = () => setNear(true);
    window.addEventListener("beforeprint", all);
    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", all);
    };
  }, []);

  // The page crossing the middle of the screen is the current one.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || total < 2) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) onCurrent(number);
      },
      { root: scrollParent(el), rootMargin: "-50% 0px -50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [number, total, onCurrent]);

  useEffect(() => {
    if (!near || width <= 0) return;
    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_PIXEL_RATIO);
    const key = `${width}@${ratio}`;
    if (paintedAt.current === key) return;

    const viewport = page.getViewport({ scale: (width / baseWidth) * ratio });
    const scratch = document.createElement("canvas");
    scratch.width = Math.floor(viewport.width);
    scratch.height = Math.floor(viewport.height);
    const task = page.render({ canvas: scratch, viewport, background: "#ffffff" });
    let alive = true;
    task.promise
      .then(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!alive || !canvas || !ctx) return;
        canvas.width = scratch.width;
        canvas.height = scratch.height;
        ctx.drawImage(scratch, 0, 0);
        paintedAt.current = key;
        setPainted(true);
      })
      .catch((err: unknown) => {
        if (alive && !isCancel(err)) setBroken(true);
      })
      .finally(() => {
        scratch.width = 0;
        scratch.height = 0;
      });
    return () => {
      alive = false;
      task.cancel();
    };
  }, [near, width, page, baseWidth]);

  return (
    <PdfPageFrame ratio={`${base.width} / ${base.height}`}>
      <div ref={frameRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Page ${number} sur ${total}`}
          className={cn("block size-full transition-opacity duration-200", painted ? "opacity-100" : "opacity-0")}
        />
        {!painted && !broken ? <PdfPageSkeleton /> : null}
        {broken ? (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[#5e6782]">
            Impossible d’afficher cette page.
          </p>
        ) : null}
      </div>
    </PdfPageFrame>
  );
}

type Loaded = { pages: PDFPageProxy[] };

type DocumentProps = {
  src: string;
  downloadHref: string;
  onRetry: () => void;
  className?: string;
};

function PdfDocument({ src, downloadHref, onRetry, className }: DocumentProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const width = useWidth(columnRef);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [current, setCurrent] = useState(1);

  // Fetch the bytes once, then open them with pdf.js; everything is released on unmount.
  useEffect(() => {
    let alive = true;
    let task: PDFDocumentLoadingTask | null = null;
    const abort = new AbortController();
    // pdf.js downloads while the PDF is fetched (not one after the other).
    const libReady = loadPdfJs();
    libReady.catch(() => {});
    (async () => {
      let res: Response;
      try {
        res = await fetch(src, { signal: abort.signal });
      } catch (err) {
        throw isCancel(err) ? err : new LoadFailure("offline");
      }
      if (!res.ok) throw new LoadFailure(res.status === 404 ? "not-found" : res.status === 429 ? "busy" : "unreadable");
      const data = new Uint8Array(await res.arrayBuffer());
      let lib: PdfJs;
      try {
        lib = await libReady;
      } catch {
        throw new LoadFailure(navigator.onLine === false ? "offline" : "unreadable");
      }
      if (!alive) return;
      task = lib.getDocument({ data, standardFontDataUrl: "/pdfjs-fonts/" });
      const doc = await task.promise;
      const pages = await Promise.all(Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)));
      if (alive) setLoaded({ pages });
    })().catch((err: unknown) => {
      if (!alive || isCancel(err)) return;
      if (!(err instanceof LoadFailure)) console.error("pdf viewer", err);
      setFailure(err instanceof LoadFailure ? err.reason : "unreadable");
    });
    return () => {
      alive = false;
      abort.abort();
      void task?.destroy();
    };
  }, [src]);

  const onCurrent = useCallback((n: number) => setCurrent(n), []);
  const total = loaded?.pages.length ?? 0;

  return (
    <section
      aria-label="Aperçu du PDF"
      aria-busy={!loaded && !failure}
      className={cn("relative", pdfBackdropClass, className)}
    >
      <p role="status" className="sr-only">
        {failure ? "Le PDF n’a pas pu être affiché." : loaded ? `PDF affiché, ${total} page${total > 1 ? "s" : ""}.` : "Chargement du PDF…"}
      </p>

      {failure ? (
        <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center sm:py-24">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground dark:bg-muted">
            <FileWarning className="size-6" aria-hidden />
          </span>
          <h2 className="text-base font-semibold tracking-tight">Aperçu indisponible</h2>
          <p className="mt-1 text-sm text-balance text-muted-foreground">{FAILURE_TEXT[failure]}</p>
          {/* A missing document cannot be downloaded either: no actions then. */}
          {failure !== "not-found" ? (
            <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row-reverse">
              <Button asChild className="h-11 sm:h-9">
                <a href={downloadHref} download>
                  <Download aria-hidden />
                  Télécharger le PDF
                </a>
              </Button>
              <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={onRetry}>
                <RotateCw aria-hidden />
                Réessayer
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div ref={columnRef} className={pdfColumnClass}>
          {loaded ? (
            loaded.pages.map((page, i) => (
              <PdfPage key={i} page={page} number={i + 1} total={total} width={width} onCurrent={onCurrent} />
            ))
          ) : (
            <PdfPageFrame>
              <PdfPageSkeleton />
            </PdfPageFrame>
          )}
        </div>
      )}

      {total > 1 && !failure ? (
        <div aria-hidden className="pointer-events-none sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex h-0 items-end justify-center print:hidden">
          <span className="tabular rounded-full bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
            {current} / {total}
          </span>
        </div>
      ) : null}
    </section>
  );
}

export type PdfPagesProps = {
  /** Address of the PDF, e.g. /api/pdf?id=… (fetched once). */
  src: string;
  /** Download link offered when the preview cannot be shown. */
  downloadHref: string;
  /** Sizing of the viewer: give it `flex-1`, or `overflow-y-auto` to scroll inside it. */
  className?: string;
};

/** Every page of a PDF, white on a soft backdrop, with skeleton, error state and page counter. */
export function PdfPages({ src, ...rest }: PdfPagesProps) {
  const [attempt, setAttempt] = useState(0);
  return <PdfDocument key={`${src}#${attempt}`} src={src} onRetry={() => setAttempt((n) => n + 1)} {...rest} />;
}
