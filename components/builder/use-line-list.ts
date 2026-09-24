"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { clampQty } from "@/components/app/QuantityStepper";
import { formatQty } from "@/lib/format";
import { lineKey, MAX_LINES, newLineId, type BuilderLine } from "./lines";
import { scrollBehavior } from "./use-media-query";

export type UpdateLines = (fn: (prev: BuilderLine[]) => BuilderLine[]) => void;

/**
 * "order": picking a product already in the list adds 1 to it (bon de livraison).
 * "count": picking it again moves to its quantity field so the counted stock can be typed (inventaire).
 */
export type LineListMode = "order" | "count";

type Flash = { id: string; seq: number; focus: boolean };

const FLASH_MS = 1400;

/** Editing helpers shared by both builders: add / merge, quantities, remove with undo, highlight. */
export function useLineList(lines: BuilderLine[], update: UpdateLines, mode: LineListMode) {
  const listRef = useRef<HTMLOListElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const seq = useRef(0);
  const [flash, setFlash] = useState<Flash | null>(null);
  // Short message for screen readers (the highlight is only visual).
  const [status, setStatus] = useState("");

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  const flashIndex = flash ? lines.findIndex((l) => l.id === flash.id) : -1;

  // Bring the added / updated line into view (and focus its quantity when counting).
  useEffect(() => {
    if (!flash || flashIndex < 0) return;
    const li = listRef.current?.children[flashIndex];
    if (!(li instanceof HTMLElement)) return;
    li.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    if (flash.focus) li.querySelector<HTMLInputElement>('input[role="spinbutton"]')?.focus({ preventScroll: true });
  }, [flash, flashIndex]);

  const pulse = (id: string, focus: boolean) => {
    seq.current += 1;
    setFlash({ id, seq: seq.current, focus });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
  };

  const add = (p: { name: string; unit: string }) => {
    const key = lineKey(p.name, p.unit);
    const existing = lines.find((l) => lineKey(l.name, l.unit) === key);
    if (existing) {
      if (mode === "order") {
        const qty = clampQty(existing.qty + 1);
        update((prev) => prev.map((l) => (l.id === existing.id ? { ...l, qty: clampQty(l.qty + 1) } : l)));
        setStatus(`${existing.name} : quantité ${formatQty(qty)}`);
        pulse(existing.id, false);
      } else {
        setStatus(`${existing.name} est déjà dans la liste`);
        pulse(existing.id, true);
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
    pulse(id, mode === "count");
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

  return { listRef, flashId: flash?.id ?? null, status, add, setQty, setUnit, setName, remove };
}

export type LineList = ReturnType<typeof useLineList>;
