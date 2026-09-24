"use client";

import { useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_QTY } from "./units";

export type QuantityStepperProps = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accessible name, e.g. "Quantité ATTA". */
  label: string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

/** Rounds to 3 decimals and keeps the value within [min, max]. */
export function clampQty(n: number, min = 0, max = MAX_QTY): number {
  const r = Math.round(n * 1000) / 1000;
  return Math.min(max, Math.max(min, r));
}

/** "1,5", "1.5", " 2 " → number; anything else → null. */
export function parseQty(text: string): number | null {
  const t = text.replace(/\s/g, "").replace(",", ".");
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 1.5 → "1,5" (French decimal comma, no thousands separator so it stays editable). */
const toText = (n: number) => (Number.isFinite(n) ? String(n).replace(".", ",") : "0");

/** [-] [quantity] [+] control. Accepts "1,5", clamps to [min, max], rounds to 3 decimals. */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = MAX_QTY,
  step = 1,
  label,
  id,
  disabled,
  className,
}: QuantityStepperProps) {
  // Text being typed (null when the field is not being edited).
  const [draft, setDraft] = useState<string | null>(null);
  const safe = Number.isFinite(value) ? value : 0;

  const commit = (n: number) => {
    const v = clampQty(n, min, max);
    if (v !== value) onChange(v);
  };
  const bump = (dir: 1 | -1) => {
    setDraft(null);
    commit(safe + dir * step);
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (!/^[\d\s.,-]*$/.test(text)) return;
    setDraft(text);
    const n = parseQty(text);
    if (n !== null && n >= min && n <= max) commit(n);
  };
  const onFocus = (e: FocusEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    setDraft(toText(safe));
    // Select after the click that focused the field, so typing replaces the value.
    requestAnimationFrame(() => {
      if (document.activeElement === el) el.select();
    });
  };
  const onBlur = () => {
    if (draft === null) return;
    commit(parseQty(draft) ?? min);
    setDraft(null);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      bump(e.key === "ArrowUp" ? 1 : -1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-stretch rounded-lg border border-input bg-background shadow-xs transition-[box-shadow,border-color] dark:bg-input/30",
        "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50",
        disabled && "opacity-50",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 rounded-r-none sm:h-9 sm:w-9"
        onClick={() => bump(-1)}
        disabled={disabled || safe <= min}
        aria-label={`Diminuer ${label}`}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={safe}
        value={draft ?? toText(safe)}
        onChange={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className="tabular h-11 w-16 min-w-0 flex-auto border-x border-input bg-transparent px-1 text-center text-base font-semibold outline-none focus-visible:bg-accent/60 disabled:cursor-not-allowed sm:h-9 sm:w-14 sm:text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 rounded-l-none sm:h-9 sm:w-9"
        onClick={() => bump(1)}
        disabled={disabled || safe >= max}
        aria-label={`Augmenter ${label}`}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
