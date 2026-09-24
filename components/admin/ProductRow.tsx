"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Pencil, Trash2, TriangleAlert } from "lucide-react";
import { COMMON_UNITS, MAX_NAME_LENGTH, MAX_UNIT_LENGTH } from "@/components/app/units";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatDateFr, formatUnit } from "@/lib/format";
import { parisDay } from "@/components/history/format";
import type { AdminProduct } from "./types";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export type ProductRowProps = {
  product: AdminProduct;
  editing: boolean;
  /** The name is also in the built-in catalogue (this team product is then hidden from pickers). */
  duplicate: boolean;
  onEdit: (id: string) => void;
  onCancel: () => void;
  /** Resolves null when saved, or a message to show under the fields. */
  onSave: (product: AdminProduct, name: string, unit: string) => Promise<string | null>;
  onDelete: (product: AdminProduct) => void;
};

/** A team product: name, packaging and date, with inline edit and delete. */
export function ProductRow({ product, editing, duplicate, onEdit, onCancel, onSave, onDelete }: ProductRowProps) {
  const editRef = useRef<HTMLButtonElement>(null);
  const focusEdit = () => window.requestAnimationFrame(() => editRef.current?.focus());

  if (editing) {
    return (
      <li className="bg-muted/40 px-4 py-4">
        <ProductEditForm
          product={product}
          onCancel={() => {
            onCancel();
            focusEdit();
          }}
          onSave={async (name, unit) => {
            const problem = await onSave(product, name, unit);
            if (problem === null) focusEdit();
            return problem;
          }}
        />
      </li>
    );
  }

  const unit = formatUnit(product.unit);
  const added = product.createdAt ? formatDateFr(parisDay(product.createdAt)) : "";

  return (
    <li className="flex min-h-16 items-center gap-2 py-2 pr-2 pl-4 sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{product.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{unit || "Sans unité"}</span>
          {added ? (
            <>
              <span aria-hidden>·</span>
              <span>
                Ajouté le <span className="tabular">{added}</span>
              </span>
            </>
          ) : null}
          {duplicate ? (
            <Badge variant="outline" className="border-warning/40 text-warning">
              <TriangleAlert aria-hidden />
              Déjà dans le catalogue
            </Badge>
          ) : null}
        </p>
      </div>
      <Button
        ref={editRef}
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground sm:size-9"
        onClick={() => onEdit(product._id)}
        aria-label={`Modifier ${product.name}`}
        title="Modifier"
      >
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground hover:text-destructive sm:size-9"
        onClick={() => onDelete(product)}
        aria-label={`Supprimer ${product.name}`}
        title="Supprimer"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  );
}

function ProductEditForm({
  product,
  onCancel,
  onSave,
}: {
  product: AdminProduct;
  onCancel: () => void;
  onSave: (name: string, unit: string) => Promise<string | null>;
}) {
  const id = useId();
  const [name, setName] = useState(product.name);
  const [unit, setUnit] = useState(product.unit);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = clean(name);
    if (!n) {
      setError("Indiquez un nom.");
      return;
    }
    const u = clean(unit);
    if (n === product.name && u === product.unit) {
      onCancel();
      return;
    }
    setError("");
    setBusy(true);
    const problem = await onSave(n, u);
    if (problem === null) return; // saved: the row goes back to its normal view
    setBusy(false);
    setError(problem);
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) {
          e.preventDefault();
          onCancel();
        }
      }}
      aria-label={`Modifier ${product.name}`}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] lg:grid-cols-[minmax(0,1fr)_13rem_auto] lg:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`}>Nom du produit</Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 bg-card sm:h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-unit`}>Unité</Label>
        <Input
          id={`${id}-unit`}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          list={`${id}-units`}
          maxLength={MAX_UNIT_LENGTH}
          autoComplete="off"
          placeholder="Ex. Carton, 1 = 5KG"
          className="h-11 bg-card sm:h-9"
        />
        <datalist id={`${id}-units`}>
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" className="h-11 flex-1 sm:h-9 sm:flex-none" disabled={busy}>
          {busy ? <Spinner aria-hidden /> : null}
          Enregistrer
        </Button>
        <Button type="button" variant="outline" className="h-11 flex-1 sm:h-9 sm:flex-none" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-3">
          {error}
        </p>
      ) : null}
    </form>
  );
}
