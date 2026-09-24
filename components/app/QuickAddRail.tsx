"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQty, formatUnit, normalizeKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FrequentItem } from "./ProductPicker";

export type QuickAddRailProps = {
  items: FrequentItem[];
  /** Lines already in the document: a card of a product in the list shows its quantity. */
  lines: { name: string; unit: string; qty: number }[];
  onAdd: (item: { name: string; unit: string }) => void;
  title?: string;
  /** Muted text next to the title, e.g. "Fréquents à INS Paris 15". */
  subtitle?: ReactNode;
  className?: string;
};

/** Same product = same name and packaging (case and accents ignored), like the lines of the builder. */
const keyOf = (name: string, unit: string) => `${normalizeKey(name)}|${normalizeKey(unit)}`;

const EDGE = 4;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Soft fade on the sides that have more cards to scroll to. */
function fadeMask(atStart: boolean, atEnd: boolean): string {
  return `linear-gradient(to right, ${atStart ? "#000" : "transparent"}, #000 1.5rem, #000 calc(100% - 3rem), ${atEnd ? "#000" : "transparent"})`;
}

/**
 * Horizontal row of product cards for adding in one tap (scroll-snap, hidden scrollbar, faded edges).
 * A card of a product already in the list shows its quantity; tapping adds one more.
 * From 768px, small previous / next buttons scroll the row. Renders nothing without items.
 * Keyboard: one card in the tab order, ← → Home End move between cards.
 */
export function QuickAddRail({ items, lines, onAdd, title = "Accès rapide", subtitle, className }: QuickAddRailProps) {
  const headingId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [focusIndex, setFocusIndex] = useState(0);

  const quantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lines) map.set(keyOf(l.name, l.unit), l.qty);
    return map;
  }, [lines]);

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const start = el.scrollLeft <= EDGE;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, items.length]);

  if (!items.length) return null;

  const scrollPage = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 160), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const add = (it: FrequentItem, index: number) => {
    setFocusIndex(index);
    onAdd({ name: it.name, unit: it.unit });
    try {
      navigator.vibrate?.(8);
    } catch {
      // Vibration is optional (blocked or unsupported).
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = items.length - 1;
    let next: number;
    if (e.key === "ArrowRight") next = Math.min(focusIndex + 1, last);
    else if (e.key === "ArrowLeft") next = Math.max(focusIndex - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setFocusIndex(next);
    const btn = listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-card]")[next];
    btn?.focus({ preventScroll: true });
    btn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const current = Math.min(focusIndex, items.length - 1);

  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id={headingId} className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-sm font-semibold">{title}</span>
          {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
        </h2>
        <div className="hidden shrink-0 items-center md:flex" aria-hidden={edges.start && edges.end ? true : undefined}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-8 text-muted-foreground", edges.start && edges.end && "invisible")}
            aria-label="Produits précédents"
            disabled={edges.start}
            onClick={() => scrollPage(-1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-8 text-muted-foreground", edges.start && edges.end && "invisible")}
            aria-label="Produits suivants"
            disabled={edges.end}
            onClick={() => scrollPage(1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <ul
        ref={listRef}
        data-rail
        onScroll={measure}
        onKeyDown={onKeyDown}
        style={{ maskImage: fadeMask(edges.start, edges.end), WebkitMaskImage: fadeMask(edges.start, edges.end) }}
        className={cn(
          "no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 py-1",
          "sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0",
        )}
      >
        {items.map((it, i) => {
          const unit = formatUnit(it.unit);
          const qty = quantities.get(keyOf(it.name, it.unit)) ?? 0;
          const inList = quantities.has(keyOf(it.name, it.unit));
          return (
            <li key={`${i}-${it.name}|${it.unit}`} className="flex shrink-0 snap-start">
              <button
                type="button"
                data-card
                tabIndex={i === current ? 0 : -1}
                onClick={() => add(it, i)}
                onFocus={() => setFocusIndex(i)}
                aria-label={`Ajouter ${it.name}${unit ? `, ${unit}` : ""}${inList ? ` (${formatQty(qty)} dans la liste)` : ""}`}
                title={it.name}
                className={cn(
                  "group flex min-h-22 w-34 touch-manipulation flex-col justify-between gap-2 rounded-xl border bg-card p-3 text-left select-none md:w-36",
                  "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out motion-safe:active:scale-[0.96]",
                  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "hover:border-ring/40 hover:bg-accent/40",
                  inList && "border-info/60 bg-accent/60 hover:border-info/80 hover:bg-accent/80 dark:border-info/50 dark:bg-info/10",
                )}
              >
                <span className="line-clamp-2 text-sm leading-5 font-medium break-words">{it.name}</span>
                <span className="flex items-end justify-between gap-2">
                  <span className="min-w-0 truncate text-xs leading-6 text-muted-foreground">{unit}</span>
                  {inList ? (
                    <span
                      key={qty}
                      className="tabular inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-info px-1.5 text-xs font-semibold text-background motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200"
                      aria-hidden
                    >
                      {formatQty(qty)}
                    </span>
                  ) : (
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground dark:bg-input/40"
                      aria-hidden
                    >
                      <Plus className="size-3.5" />
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
