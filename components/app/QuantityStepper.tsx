"use client";

import { useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
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
  /**
   * When given, the minus button becomes a trash button once the value is at or below `removeAt`
   * (e.g. 1 on an order: going below 1 means "remove the line").
   */
  onRemove?: () => void;
  removeAt?: number;
  /** Accessible name of the trash button, e.g. "Retirer ATTA". */
  removeLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Extra classes for the text field (e.g. scroll margins under sticky bars). */
  inputClassName?: string;
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

const ROUND =
  "inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full outline-none transition-colors " +
  "size-9 pointer-coarse:size-11 [&_svg]:size-4 " +
  "hover:bg-background hover:shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 " +
  "disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-input/40";

/**
 * Compact pill: (−) quantity (+). Accepts "1,5", clamps to [min, max], rounds to 3 decimals.
 * With `onRemove`, the minus turns into a trash button at the lowest useful quantity.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = MAX_QTY,
  step = 1,
  label,
  onRemove,
  removeAt = 1,
  removeLabel,
  id,
  disabled,
  className,
  inputClassName,
}: QuantityStepperProps) {
  // Text being typed (null when the field is not being edited).
  const [draft, setDraft] = useState<string | null>(null);
  const safe = Number.isFinite(value) ? value : 0;
  const trash = Boolean(onRemove) && safe <= removeAt;

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
    // Emptied field → minimum; unreadable text ("1,2,3", "-") → keep the last valid quantity.
    const n = parseQty(draft);
    commit(n ?? (draft.trim() === "" ? min : safe));
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
        "inline-flex shrink-0 items-center rounded-full bg-muted transition-shadow dark:bg-input/25",
        "has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50",
        disabled && "opacity-50",
        className,
      )}
    >
      {trash ? (
        <button
          type="button"
          className={cn(ROUND, "text-muted-foreground hover:text-destructive")}
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel ?? `Retirer (${label})`}
          title="Retirer"
        >
          <Trash2 aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className={ROUND}
          onClick={() => bump(-1)}
          disabled={disabled || safe <= min}
          aria-label={`Diminuer ${label}`}
        >
          <Minus aria-hidden />
        </button>
      )}
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
        className={cn(
          "tabular h-9 w-11 min-w-0 bg-transparent px-0.5 text-center text-base font-semibold outline-none pointer-coarse:h-11 pointer-coarse:w-12 pointer-fine:text-sm",
          "disabled:cursor-not-allowed",
          safe === 0 && draft === null && "text-muted-foreground",
          inputClassName,
        )}
      />
      <button
        type="button"
        className={ROUND}
        onClick={() => bump(1)}
        disabled={disabled || safe >= max}
        aria-label={`Augmenter ${label}`}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}
