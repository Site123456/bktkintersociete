"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./QuantityStepper";
import { COMMON_UNITS, MAX_NAME_LENGTH, MAX_QTY, MAX_UNIT_LENGTH } from "./units";

export type LineRowLine = { name: string; unit: string; qty: number };

export type LineRowProps = {
  line: LineRowLine;
  onQty: (n: number) => void;
  onRemove: () => void;
  /** When given, tapping the name opens a small form to change the packaging. */
  onUnitChange?: (unit: string) => void;
  /** When given (and readOnlyName is not set), the same form also lets the user rename the line. */
  onNameChange?: (name: string) => void;
  readOnlyName?: boolean;
  /**
   * Quantity at which the minus button becomes a trash button: 1 on an order (default),
   * 0 on an inventory where 0 means "out of stock" and is kept.
   */
  removeAt?: number;
  /** Short note shown next to the packaging when the quantity is 0 (e.g. "en rupture"). */
  zeroLabel?: string;
  max?: number;
  className?: string;
  /** Extra classes for the quantity field (scroll margins under sticky bars). */
  inputClassName?: string;
};

function NameBlock({ line, unit, zeroLabel }: { line: LineRowLine; unit: string; zeroLabel?: string }) {
  const empty = !(line.qty > 0);
  return (
    <>
      <span className={cn("line-clamp-2 text-sm leading-5 font-medium break-words", empty && "text-muted-foreground")}>
        {line.name}
      </span>
      {unit || (empty && zeroLabel) ? (
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
          {unit ? <span className="truncate">{unit}</span> : null}
          {empty && zeroLabel ? (
            <span className="shrink-0 font-medium text-warning">
              {unit ? <span aria-hidden>· </span> : null}
              {zeroLabel}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );
}

/** Name + packaging; a button opening the edit form (rename, packaging, remove) when the line can be edited. */
function EditLine({
  line,
  unitText,
  canName,
  zeroLabel,
  onNameChange,
  onUnitChange,
  onRemove,
}: {
  line: LineRowLine;
  unitText: string;
  canName: boolean;
  zeroLabel?: string;
  onNameChange?: (name: string) => void;
  onUnitChange?: (unit: string) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // "Retirer": the row (and this button) disappears, the list moves focus to the next line itself.
  const removing = useRef(false);
  const [name, setName] = useState(line.name);
  const [unit, setUnit] = useState(line.unit);

  const onOpenChange = (next: boolean) => {
    if (next) {
      removing.current = false;
      setName(line.name);
      setUnit(line.unit);
    }
    setOpen(next);
  };
  const save = () => {
    const n = name.replace(/\s+/g, " ").trim();
    const u = unit.replace(/\s+/g, " ").trim();
    if (canName && onNameChange && n && n !== line.name) onNameChange(n);
    if (onUnitChange && u !== line.unit) onUnitChange(u);
    setOpen(false);
  };
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`Modifier ${line.name}`}
          className="group -mx-1.5 flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md px-1.5 py-1 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="sr-only">Modifier : </span>
          <span className="flex min-w-0 items-start gap-1.5">
            <span className="flex min-w-0 flex-col">
              <NameBlock line={line} unit={unitText} zeroLabel={zeroLabel} />
            </span>
            <Pencil
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        tabIndex={-1}
        onCloseAutoFocus={(e) => {
          if (removing.current) e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          // On touch screens do not pop the keyboard up at once: the packaging or "Retirer" may be what is wanted.
          if (window.matchMedia("(pointer: coarse)").matches) {
            e.preventDefault();
            contentRef.current?.focus({ preventScroll: true });
          }
        }}
        className="w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-xl"
      >
        {canName ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-name`}>Désignation</Label>
            <Input
              id={`${id}-name`}
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onEnter}
              className="h-11 sm:h-9"
            />
          </div>
        ) : (
          <p className="text-sm font-semibold break-words">{line.name}</p>
        )}
        {onUnitChange ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-unit`}>Conditionnement</Label>
            <Input
              id={`${id}-unit`}
              value={unit}
              maxLength={MAX_UNIT_LENGTH}
              placeholder="Ex. : Carton"
              onChange={(e) => setUnit(e.target.value)}
              onKeyDown={onEnter}
              className="h-11 sm:h-9"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={unit === u}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "h-9 rounded-full border px-3 text-xs font-medium transition-colors hover:bg-accent",
                    unit === u && "border-ring bg-accent text-accent-foreground",
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-11 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-9"
            onClick={() => {
              removing.current = true;
              setOpen(false);
              onRemove();
            }}
          >
            <Trash2 aria-hidden />
            Retirer
          </Button>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="h-11 sm:h-9" onClick={save} disabled={canName && !name.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * One line of the list: name and packaging on the left (tap to edit), compact quantity stepper on the right.
 * At the lowest quantity the minus becomes a trash button. Renders an <li>: place it in an <ol>/<ul>.
 */
export function LineRow({
  line,
  onQty,
  onRemove,
  onUnitChange,
  onNameChange,
  readOnlyName = false,
  removeAt = 1,
  zeroLabel,
  max = MAX_QTY,
  className,
  inputClassName,
}: LineRowProps) {
  const unitText = formatUnit(line.unit);
  const canName = Boolean(onNameChange) && !readOnlyName;
  const editable = canName || Boolean(onUnitChange);

  return (
    <li
      data-empty={!(line.qty > 0) || undefined}
      className={cn("flex items-center gap-3 py-2 pr-2 pl-4 transition-colors", className)}
    >
      {editable ? (
        <EditLine
          line={line}
          unitText={unitText}
          canName={canName}
          zeroLabel={zeroLabel}
          onNameChange={onNameChange}
          onUnitChange={onUnitChange}
          onRemove={onRemove}
        />
      ) : (
        <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-1">
          <NameBlock line={line} unit={unitText} zeroLabel={zeroLabel} />
        </div>
      )}
      <QuantityStepper
        value={line.qty}
        onChange={onQty}
        max={max}
        label={`Quantité ${line.name}`}
        onRemove={onRemove}
        removeAt={removeAt}
        removeLabel={`Retirer ${line.name}`}
        inputClassName={inputClassName}
      />
    </li>
  );
}
