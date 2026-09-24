"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { clampQty } from "@/components/app/QuantityStepper";
import { formatQty } from "@/lib/format";
import { SEARCH_ID } from "./BuilderLayout";
import { lineKey, MAX_LINES, newLineId, type BuilderLine } from "./lines";
import { scrollBehavior } from "./use-media-query";

export type UpdateLines = (fn: (prev: BuilderLine[]) => BuilderLine[]) => void;

/**
 * "order": picking a product already in the list adds 1 to it (bon de livraison).
 * "count": picking it again moves to its quantity field so the counted stock can be typed (inventaire).
 */
export type LineListMode = "order" | "count";

/** reveal: scroll the line into view (false for the quick-add cards, so the row of cards stays under the thumb). */
type Flash = { id: string; seq: number; focus: boolean; reveal: boolean };

export type AddOptions = { reveal?: boolean };

const FLASH_MS = 1400;

/**
 * After a removal, when focus was lost with the row: the quantity of the line now at `index` (or the last one),
 * or the product search when the list is empty. On touch screens the line's first button is focused instead of
 * its quantity field, so the on-screen keyboard does not pop up after each removal.
 */
function focusAfterRemoval(list: HTMLOListElement | null, index: number) {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  const rows = list ? list.children : null;
  const row = rows && rows.length ? rows[Math.min(index, rows.length - 1)] : null;
  if (row instanceof HTMLElement) {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    row.querySelector<HTMLElement>(touch ? "button" : 'input[role="spinbutton"]')?.focus({ preventScroll: touch });
    return;
  }
  document.getElementById(SEARCH_ID)?.focus();
}

/** Editing helpers shared by both builders: add / merge, quantities, remove with undo, highlight. */
export function useLineList(lines: BuilderLine[], update: UpdateLines, mode: LineListMode) {
  const listRef = useRef<HTMLOListElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const seq = useRef(0);
  const [flash, setFlash] = useState<Flash | null>(null);
  // Short message for screen readers (the highlight is only visual).
  const [status, setStatus] = useState("");
  // Index of the line just removed: focus moves to its neighbour once the list has re-rendered.
  const refocus = useRef<number | null>(null);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const index = refocus.current;
    if (index === null) return;
    refocus.current = null;
    focusAfterRemoval(listRef.current, index);
  }, [lines]);

  const flashIndex = flash ? lines.findIndex((l) => l.id === flash.id) : -1;

  // Bring the added / updated line into view (and focus its quantity when counting).
  useEffect(() => {
    if (!flash || flashIndex < 0 || !flash.reveal) return;
    const li = listRef.current?.children[flashIndex];
    if (!(li instanceof HTMLElement)) return;
    li.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    if (flash.focus) li.querySelector<HTMLInputElement>('input[role="spinbutton"]')?.focus({ preventScroll: true });
  }, [flash, flashIndex]);

  const pulse = (id: string, focus: boolean, reveal = true) => {
    seq.current += 1;
    setFlash({ id, seq: seq.current, focus: focus && reveal, reveal });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
  };

  const add = (p: { name: string; unit: string }, options?: AddOptions) => {
    const reveal = options?.reveal ?? true;
    const key = lineKey(p.name, p.unit);
    const existing = lines.find((l) => lineKey(l.name, l.unit) === key);
    if (existing) {
      if (mode === "order") {
        const qty = clampQty(existing.qty + 1);
        update((prev) => prev.map((l) => (l.id === existing.id ? { ...l, qty: clampQty(l.qty + 1) } : l)));
        setStatus(`${existing.name} : quantité ${formatQty(qty)}`);
        pulse(existing.id, false, reveal);
      } else {
        setStatus(`${existing.name} est déjà dans la liste`);
        pulse(existing.id, true, reveal);
      }
      return;
    }
    if (lines.length >= MAX_LINES) {
      toast.error(`${MAX_LINES} articles au maximum par document.`);
      return;
    }
    const id = newLineId();
    update((prev) => [...prev, { id, name: p.name, unit: p.unit, qty: 1 }]);
    setStatus(`${p.name} ajouté`);
    pulse(id, mode === "count", reveal);
  };

  const patch = (id: string, change: Partial<Omit<BuilderLine, "id">>) =>
    update((prev) => prev.map((l) => (l.id === id ? { ...l, ...change } : l)));

  const setQty = (id: string, qty: number) => patch(id, { qty });
  const setUnit = (id: string, unit: string) => patch(id, { unit });
  const setName = (id: string, name: string) => patch(id, { name });

  const remove = (id: string) => {
    const index = lines.findIndex((l) => l.id === id);
    if (index < 0) return;
    const line = lines[index];
    refocus.current = index;
    update((prev) => prev.filter((l) => l.id !== id));
    setStatus(`${line.name} retiré`);
    toast("Article retiré", {
      description: line.name,
      action: {
        label: "Annuler",
        onClick: () => {
          const key = lineKey(line.name, line.unit);
          update((prev) => {
            if (prev.some((l) => l.id === line.id || lineKey(l.name, l.unit) === key)) return prev;
            const at = Math.min(index, prev.length);
            return [...prev.slice(0, at), line, ...prev.slice(at)];
          });
          setStatus(`${line.name} remis dans la liste`);
          pulse(line.id, false);
        },
      },
    });
  };

  return { listRef, list: { flashId: flash?.id ?? null, status, add, setQty, setUnit, setName, remove } };
}

export type LineList = ReturnType<typeof useLineList>["list"];
