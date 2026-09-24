import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Pieces shared by the PDF viewer (PdfPages) and the route loading screen: the soft backdrop, the white
 * page frame and the page skeleton. Server-safe (no hooks).
 */

/** Widest a page is drawn (CSS px): readable on desktop without making lines too long. */
export const PDF_MAX_PAGE_WIDTH = 860;

/** A4 portrait, width / height. */
export const A4_RATIO = "210 / 297";

/** Soft neutral behind the white pages (the page itself stays white in dark mode, like paper). */
export const pdfBackdropClass = "bg-[#eceef1] dark:bg-[#050506] print:bg-white";

/** Page column: 860px pages plus the side padding, gap between pages. */
export const pdfColumnClass = "mx-auto flex w-full max-w-[908px] flex-col items-center gap-3 px-2 pt-3 pb-8 sm:gap-4 sm:px-6 sm:pt-6 sm:pb-12 print:gap-0 print:p-0";

export type PdfPageFrameProps = {
  /** "width / height" of the page, A4 by default. */
  ratio?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** White sheet with a subtle shadow, fitted to the column width (max 860px). */
export function PdfPageFrame({ ratio = A4_RATIO, className, style, children }: PdfPageFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[3px] bg-white",
        "shadow-[0_0_0_1px_rgb(15_29_74/0.05),0_1px_2px_rgb(15_29_74/0.06),0_8px_24px_-8px_rgb(15_29_74/0.14)]",
        "dark:shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_12px_32px_-12px_rgb(0_0_0/0.6)]",
        "print:break-after-page print:rounded-none print:shadow-none print:last:break-after-auto",
        className,
      )}
      style={{ maxWidth: PDF_MAX_PAGE_WIDTH, aspectRatio: ratio, ...style }}
    >
      {children}
    </div>
  );
}

/* Grey bars placed like the blocks of a bon de livraison: [top, left, width, height] in % of the page. */
const BARS: [number, number, number, number][] = [
  [5, 7, 8, 5.6],
  [5.4, 17, 22, 1.3],
  [7.4, 17, 15, 1],
  [9, 17, 18, 1],
  [5.4, 60, 33, 2.4],
  [9, 73, 20, 1.1],
  [15, 7, 40, 7.5],
  [15, 53, 40, 7.5],
  [26.5, 7, 86, 1.6],
];
const ROWS = [62, 48, 70, 40, 56, 66, 44, 58, 50, 36, 64, 46];

/** Placeholder drawn inside a page frame while the page is loading. */
export function PdfPageSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 animate-pulse", className)}>
      {BARS.map(([top, left, width, height], i) => (
        <span
          key={i}
          className="absolute rounded-[2px] bg-[#e8ebf1]"
          style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
        />
      ))}
      {ROWS.map((w, i) => (
        <span key={`r${i}`}>
          <span className="absolute h-[1.1%] rounded-[2px] bg-[#eef0f4]" style={{ top: `${31 + i * 3.4}%`, left: "7%", width: `${w}%` }} />
          <span className="absolute h-[1.1%] w-[6%] rounded-[2px] bg-[#eef0f4]" style={{ top: `${31 + i * 3.4}%`, left: "87%" }} />
        </span>
      ))}
    </div>
  );
}
