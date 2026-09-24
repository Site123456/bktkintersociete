"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { PackageSearch, PackagePlus } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { matchesQuery, normalizeKey } from "@/lib/format";
import { AdminApiError, adminFetch, toastError } from "./api";
import { BuiltInCatalog } from "./BuiltInCatalog";
import { ProductRow } from "./ProductRow";
import { SearchField } from "./SearchField";
import type { AdminProduct, BuiltInProduct } from "./types";

export type ProductsPanelProps = {
  initialProducts: AdminProduct[];
  builtIn: BuiltInProduct[];
};

/** Team products (rename, change unit, delete) and the read-only built-in catalogue. */
export function ProductsPanel({ initialProducts, builtIn }: ProductsPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // The product stays set while the dialog closes (no empty title during the animation).
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const builtInKeys = useMemo(() => new Set(builtIn.map((p) => normalizeKey(p.name))), [builtIn]);
  const visible = useMemo(
    () => products.filter((p) => matchesQuery(`${p.name} ${p.unit}`, deferredQuery)),
    [products, deferredQuery],
  );
  const searching = Boolean(deferredQuery.trim());
  const builtInVisible = useMemo(
    () => (searching ? builtIn.filter((p) => matchesQuery(`${p.name} ${p.unit}`, deferredQuery)) : builtIn),
    [builtIn, deferredQuery, searching],
  );

  const save = useCallback(async (product: AdminProduct, name: string, unit: string): Promise<string | null> => {
    try {
      const res = await adminFetch<{ ok: true; product: AdminProduct }>("/api/admin/products", {
        method: "PATCH",
        body: { id: product._id, name, unit },
      });
      setProducts((list) => list.map((p) => (p._id === product._id ? res.product : p)));
      setEditingId(null);
      toast.success("Produit modifié", { description: res.product.name });
      return null;
    } catch (err) {
      // A refused name (duplicate, built-in) is shown under the field; other problems in a toast.
      if (err instanceof AdminApiError && err.status === 400) return err.message;
      if (err instanceof AdminApiError && err.status === 404) {
        setProducts((list) => list.filter((p) => p._id !== product._id));
        setEditingId(null);
      }
      toastError(err, "Produit non modifié");
      return "";
    }
  }, []);

  const askDelete = useCallback((product: AdminProduct) => {
    setToDelete(product);
    setDeleteOpen(true);
  }, []);

  const confirmDelete = async () => {
    const product = toDelete;
    if (!product) return;
    setDeleting(true);
    try {
      await adminFetch<{ ok: true }>(`/api/admin/products?id=${encodeURIComponent(product._id)}`, { method: "DELETE" });
      setProducts((list) => list.filter((p) => p._id !== product._id));
      toast.success("Produit supprimé", { description: product.name });
      setDeleteOpen(false);
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 404) {
        setProducts((list) => list.filter((p) => p._id !== product._id));
        setDeleteOpen(false);
      }
      toastError(err, "Produit non supprimé");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Rechercher un produit…"
          label="Rechercher dans les produits de l’équipe et le catalogue"
        />
        <p className="sr-only" aria-live="polite">
          {searching
            ? `${visible.length} produit${visible.length > 1 ? "s" : ""} de l’équipe et ${builtInVisible.length} du catalogue correspondent.`
            : ""}
        </p>
      </div>

      <section aria-labelledby="team-products" className="space-y-3">
        <div className="space-y-0.5">
          <h2 id="team-products" className="flex items-baseline gap-2 text-base font-semibold">
            Produits ajoutés par l’équipe
            <span className="tabular text-sm font-normal text-muted-foreground">
              {searching ? `${visible.length} / ${products.length}` : products.length}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Créés pendant la saisie d’un bon. Corrigez un nom ou une unité, ou supprimez un doublon.
          </p>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title="Aucun produit ajouté"
            description="Les produits créés par l’équipe pendant la saisie d’un bon apparaîtront ici."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Aucun résultat"
            description={`Aucun produit de l’équipe ne correspond à « ${deferredQuery.trim()} ».`}
            action={
              <Button variant="outline" className="h-11 sm:h-9" onClick={() => setQuery("")}>
                Effacer la recherche
              </Button>
            }
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
            {visible.map((p) => (
              <ProductRow
                key={p._id}
                product={p}
                editing={editingId === p._id}
                duplicate={builtInKeys.has(normalizeKey(p.name))}
                onEdit={setEditingId}
                onCancel={() => setEditingId(null)}
                onSave={save}
                onDelete={askDelete}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Catalogue intégré">
        <BuiltInCatalog visible={builtInVisible} total={builtIn.length} searching={searching} />
      </section>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {toDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le produit ne sera plus proposé lors de la saisie. Les bons et inventaires déjà créés ne changent pas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 sm:h-9" disabled={deleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-white hover:bg-destructive/90 sm:h-9 dark:bg-destructive/60"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Spinner aria-hidden /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
