"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUnit, matchesQuery, normalizeKey, searchScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/delivery";
import { COMMON_UNITS, MAX_NAME_LENGTH, MAX_UNIT_LENGTH } from "./units";

/** A product often ordered by the current site. */
export type FrequentItem = { name: string; unit: string; count?: number };

export type ProductPickerProps = {
  products: Product[];
  frequent?: FrequentItem[];
  onPick: (p: Product) => void;
  onCreate: (name: string, unit: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Accessible name of the search field. */
  label?: string;
  id?: string;
  className?: string;
};

type Option = { type: "product"; product: Product } | { type: "create"; name: string };

const MAX_RESULTS = 40;
const OTHER_UNIT = "__other__";
const NO_FREQUENT: FrequentItem[] = [];

/** Catalogue matches for a query, best score first, then alphabetical. */
function rankProducts(products: Product[], query: string): Product[] {
  if (!normalizeKey(query)) return [];
  return products
    .filter((p) => matchesQuery(p.name, query))
    .map((p) => ({ p, score: searchScore(p.name, query) }))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.p.name.localeCompare(b.p.name, "fr", { sensitivity: "base" }) ||
        a.p.unit.localeCompare(b.p.unit, "fr"),
    )
    .slice(0, MAX_RESULTS)
    .map((x) => x.p);
}

/** Frequent items mapped to catalogue products (to keep the "custom" flag). */
function resolveFrequent(items: FrequentItem[], products: Product[]): Product[] {
  const key = (name: string, unit: string) => `${normalizeKey(name)}|${normalizeKey(unit)}`;
  const byKey = new Map(products.map((p) => [key(p.name, p.unit), p]));
  return items.map((it) => byKey.get(key(it.name, it.unit)) ?? { name: it.name, unit: it.unit });
}

/** Folds one character (accents, case) while keeping string indexes aligned. */
function foldChar(ch: string): string {
  const f = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return f.length === 1 ? f : " ";
}

/** Ranges of `text` matching the words of `query`, merged and sorted. */
function matchRanges(text: string, query: string): [number, number][] {
  const words = normalizeKey(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const folded = text.split("").map(foldChar).join("");
  const ranges: [number, number][] = [];
  for (const w of words) {
    const at = folded.indexOf(w);
    if (at >= 0) ranges.push([at, at + w.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

/** Product name with the searched words emphasised. */
function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = matchRanges(text, query);
  if (!ranges.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let last = 0;
  ranges.forEach(([start, end], i) => {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark key={i} className="bg-transparent font-semibold text-inherit underline decoration-primary/60 decoration-2 underline-offset-[3px]">
        {text.slice(start, end)}
      </mark>,
    );
    last = end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Keeps the focus in the search field when the list is clicked (avoids the blur/click race). */
function keepFocus(e: MouseEvent<HTMLElement>) {
  const t = e.target;
  if (t instanceof Element && t.closest("input, select, textarea")) return;
  e.preventDefault();
}

/**
 * Product search combobox: ranked results (accents/case ignored, several words), keyboard navigation,
 * "Fréquents pour ce site" when empty, and an inline form to add a product that is not in the catalogue.
 */
export function ProductPicker({
  products,
  frequent = NO_FREQUENT,
  onPick,
  onCreate,
  placeholder = "Rechercher un produit…",
  autoFocus,
  label = "Rechercher un produit",
  id,
  className,
}: ProductPickerProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${autoId}-list`;
  const optionId = (i: number) => `${autoId}-opt-${i}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollToActive = useRef(false);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Highlighted option; -1 = none (frequent chips start unselected, typed results start on the best match).
  const [active, setActive] = useState(-1);
  const [creating, setCreating] = useState(false);
  const [unitChoice, setUnitChoice] = useState<string>(COMMON_UNITS[0]);
  const [customUnit, setCustomUnit] = useState("");

  const key = normalizeKey(query);
  const hasQuery = key !== "";
  const newName = query.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);

  const results = useMemo(() => rankProducts(products, query), [products, query]);
  const exact = useMemo(() => hasQuery && products.some((p) => normalizeKey(p.name) === key), [products, hasQuery, key]);
  const frequentProducts = useMemo(() => resolveFrequent(frequent, products), [frequent, products]);

  const showFrequent = !hasQuery && frequentProducts.length > 0;
  const options: Option[] = hasQuery
    ? [
        ...results.map((product): Option => ({ type: "product", product })),
        ...(exact ? [] : [{ type: "create", name: newName } as const]),
      ]
    : showFrequent
      ? frequentProducts.map((product): Option => ({ type: "product", product }))
      : [];
  const panelOpen = open && (creating || options.length > 0);
  const activeIndex = active >= 0 && options.length ? Math.min(active, options.length - 1) : -1;

  // Keep the option chosen with the keyboard visible (no state change here).
  useEffect(() => {
    if (!scrollToActive.current || activeIndex < 0) return;
    scrollToActive.current = false;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const reset = () => {
    setQuery("");
    setActive(-1);
    setCreating(false);
    setCustomUnit("");
    setUnitChoice(COMMON_UNITS[0]);
  };

  const pick = (p: Product) => {
    onPick(p);
    reset();
    setOpen(false);
    inputRef.current?.focus();
  };

  const submitCreate = () => {
    const unit = (unitChoice === OTHER_UNIT ? customUnit : unitChoice).replace(/\s+/g, " ").trim().slice(0, MAX_UNIT_LENGTH);
    if (!newName || !unit) return;
    onCreate(newName, unit);
    reset();
    setOpen(false);
    inputRef.current?.focus();
  };

  const cancelCreate = () => {
    setCreating(false);
    inputRef.current?.focus();
  };

  const choose = (o: Option) => {
    if (o.type === "product") pick(o.product);
    else {
      setCreating(true);
      setOpen(true);
    }
  };

  const move = (delta: 1 | -1) => {
    if (!options.length) return;
    scrollToActive.current = true;
    if (activeIndex < 0) setActive(delta === 1 ? 0 : options.length - 1);
    else setActive((activeIndex + delta + options.length) % options.length);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else if (!creating) move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open && !creating) move(-1);
        break;
      case "Enter":
        // Never submit a surrounding form from the search field.
        e.preventDefault();
        if (creating) submitCreate();
        else if (!panelOpen) setOpen(true);
        else if (activeIndex >= 0) choose(options[activeIndex]);
        break;
      case "Escape":
        if (panelOpen) {
          e.preventDefault();
          setOpen(false);
          setCreating(false);
        } else if (query) {
          e.preventDefault();
          reset();
        }
        break;
    }
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setOpen(false);
    setCreating(false);
  };

  const onCreateKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelCreate();
    }
  };

  const resultCount = hasQuery ? results.length : 0;

  return (
    <div className={cn("relative", className)} onBlur={onBlur}>
      <Label htmlFor={inputId} className="sr-only">
        {label}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={panelOpen && !creating && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={query}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(normalizeKey(e.target.value) ? 0 : -1);
            setCreating(false);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-12 rounded-xl bg-card pr-12 pl-11 text-base shadow-xs sm:h-11 md:text-sm"
        />
        {query ? (
          <button
            type="button"
            aria-label="Effacer la recherche"
            title="Effacer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              reset();
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-9"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {open && hasQuery ? `${resultCount} produit${resultCount > 1 ? "s" : ""} trouvé${resultCount > 1 ? "s" : ""}` : ""}
      </p>

      {panelOpen ? (
        <div
          onMouseDown={keepFocus}
          className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-md"
        >
          {creating ? (
            <div className="space-y-3 p-3" onKeyDown={onCreateKeyDown}>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nouveau produit pour l’équipe</p>
                <p className="text-sm font-semibold break-words">{newName}</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${autoId}-unit`}>Conditionnement</Label>
                <select
                  id={`${autoId}-unit`}
                  autoFocus
                  value={unitChoice}
                  onChange={(e) => setUnitChoice(e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-9 sm:text-sm dark:bg-input/30"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value={OTHER_UNIT}>Autre…</option>
                </select>
              </div>
              {unitChoice === OTHER_UNIT ? (
                <Input
                  autoFocus
                  aria-label="Autre conditionnement"
                  placeholder="Ex. : Seau de 5 L"
                  value={customUnit}
                  maxLength={MAX_UNIT_LENGTH}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitCreate();
                    }
                  }}
                  className="h-11 sm:h-9"
                />
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={cancelCreate}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  className="h-11 sm:h-9"
                  onClick={submitCreate}
                  disabled={!newName || (unitChoice === OTHER_UNIT && !customUnit.trim())}
                >
                  <Plus aria-hidden />
                  Ajouter
                </Button>
              </div>
            </div>
          ) : (
            <>
              {showFrequent ? (
                <p className="px-3 pt-3 text-xs font-medium text-muted-foreground" aria-hidden>
                  Fréquents pour ce site
                </p>
              ) : null}
              {hasQuery && results.length === 0 ? (
                <p className="px-3 pt-3 text-sm text-muted-foreground">Aucun produit trouvé.</p>
              ) : null}
              <div
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={showFrequent ? "Fréquents pour ce site" : "Produits"}
                className={cn(
                  "max-h-[60vh] overflow-y-auto overscroll-contain p-1.5",
                  showFrequent && "flex flex-wrap gap-2 p-3",
                )}
              >
                {options.map((o, i) => {
                  const selected = i === activeIndex;
                  const common = {
                    id: optionId(i),
                    role: "option" as const,
                    "aria-selected": selected,
                    "data-index": i,
                    onMouseMove: () => {
                      if (!selected) setActive(i);
                    },
                    onClick: () => choose(o),
                  };
                  if (o.type === "create") {
                    return (
                      <div
                        key="__create__"
                        {...common}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                          results.length > 0 && "mt-1",
                          selected && "bg-accent text-accent-foreground",
                        )}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed" aria-hidden>
                          <Plus className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 break-words">
                          Ajouter « <span className="font-semibold">{o.name}</span> »
                        </span>
                      </div>
                    );
                  }
                  const p = o.product;
                  const unit = formatUnit(p.unit);
                  if (showFrequent) {
                    return (
                      <div
                        key={`${i}-${p.name}|${p.unit}`}
                        {...common}
                        className={cn(
                          "inline-flex min-h-11 max-w-full cursor-pointer items-center gap-1.5 rounded-full border bg-card px-3.5 text-sm transition-colors sm:min-h-9",
                          selected && "border-ring bg-accent text-accent-foreground",
                        )}
                      >
                        <span className="truncate font-medium">{p.name}</span>
                        {unit ? <span className="shrink-0 text-xs text-muted-foreground">{unit}</span> : null}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`${i}-${p.name}|${p.unit}`}
                      {...common}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                        selected && "bg-accent text-accent-foreground",
                      )}
                    >
                      <span className="min-w-0 flex-1 font-medium break-words">
                        <Highlight text={p.name} query={query} />
                      </span>
                      {p.custom ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Équipe
                        </Badge>
                      ) : null}
                      {unit ? (
                        <Badge variant="secondary" className="max-w-[45%] font-normal text-muted-foreground">
                          <span className="min-w-0 truncate">{unit}</span>
                        </Badge>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export type FrequentChipsProps = {
  items: FrequentItem[];
  onPick: (item: FrequentItem) => void;
  /** Heading above the chips; pass "" to hide it. */
  label?: string;
  className?: string;
};

/** Horizontal, scrollable row of "frequent product" chips. Renders nothing when empty. */
export function FrequentChips({ items, onPick, label = "Fréquents pour ce site", className }: FrequentChipsProps) {
  const headingId = useId();
  if (!items.length) return null;
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      {label ? (
        <p id={headingId} className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      <ul aria-labelledby={label ? headingId : undefined} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {items.map((it, i) => {
          const unit = formatUnit(it.unit);
          return (
            <li key={`${i}-${it.name}|${it.unit}`} className="shrink-0">
              <button
                type="button"
                onClick={() => onPick(it)}
                aria-label={`Ajouter ${it.name}${unit ? `, ${unit}` : ""}`}
                title={it.count ? `${it.count} fois récemment` : undefined}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border bg-card px-3.5 text-sm whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground sm:h-9"
              >
                <Plus className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{it.name}</span>
                {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
