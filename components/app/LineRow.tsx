"use client";

import { useId, useState, type KeyboardEvent } from "react";
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
  /** 0-based position in the list (shown as index + 1). */
  index: number;
  line: LineRowLine;
  onQty: (n: number) => void;
  onRemove: () => void;
  /** When given, an edit button lets the user change the packaging. */
  onUnitChange?: (unit: string) => void;
  /** When given (and readOnlyName is not set), the same edit button also lets the user rename the line. */
  onNameChange?: (name: string) => void;
  readOnlyName?: boolean;
  max?: number;
  className?: string;
};

/** Small popover to rename a line and/or change its packaging. */
function EditLine({
  line,
  canName,
  onNameChange,
  onUnitChange,
}: {
  line: LineRowLine;
  canName: boolean;
  onNameChange?: (name: string) => void;
  onUnitChange?: (unit: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(line.name);
  const [unit, setUnit] = useState(line.unit);

  const onOpenChange = (next: boolean) => {
    if (next) {
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground sm:size-9"
          aria-label={`Modifier ${line.name}`}
          title="Modifier"
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1rem)] space-y-4 rounded-xl">
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
        ) : null}
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" className="h-11 sm:h-9" onClick={save} disabled={canName && !name.trim()}>
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * One order line: number, name, packaging, quantity stepper and remove button.
 * Renders an <li>: place it inside an <ol>/<ul> (e.g. <ol className="divide-y">).
 */
export function LineRow({
  index,
  line,
  onQty,
  onRemove,
  onUnitChange,
  onNameChange,
  readOnlyName = false,
  max = MAX_QTY,
  className,
}: LineRowProps) {
  const empty = !(line.qty > 0);
  const unitText = formatUnit(line.unit);
  const canName = Boolean(onNameChange) && !readOnlyName;
  const editable = canName || Boolean(onUnitChange);

  return (
    <li
      data-empty={empty || undefined}
      className={cn("flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4", className)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="tabular w-6 shrink-0 text-right text-xs leading-5 text-muted-foreground">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm leading-5 font-medium break-words", empty && "text-muted-foreground")}>{line.name}</p>
          {unitText ? <p className="text-xs text-muted-foreground">{unitText}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-1 pl-9 sm:pl-0">
        <QuantityStepper
          value={line.qty}
          onChange={onQty}
          max={max}
          label={`Quantité ${line.name}`}
          className="flex-1 sm:flex-none"
        />
        {editable ? (
          <EditLine
            line={line}
            canName={canName}
            onNameChange={onNameChange}
            onUnitChange={onUnitChange}
          />
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:size-9"
          onClick={onRemove}
          aria-label={`Retirer ${line.name}`}
          title="Retirer"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
