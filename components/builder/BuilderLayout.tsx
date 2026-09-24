"use client";

import type { ReactNode } from "react";
import { FrequentChips, ProductPicker, type FrequentItem } from "@/components/app/ProductPicker";
import { Kbd } from "@/components/ui/kbd";
import type { Product } from "@/types/delivery";
import { SummaryAside, SummaryBar, type SummaryPanelProps } from "./SummaryPanel";

/** Id of the product search field (focused with the "/" key). */
export const SEARCH_ID = "product-search";

/**
 * Builder column on the left and summary card on the right from 1024px; on smaller screens the summary
 * becomes a bar stuck to the bottom. Place it directly in a flex column that fills the page.
 */
export function BuilderLayout({ children, summary }: { children: ReactNode; summary: SummaryPanelProps }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="grid flex-1 items-start gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8 lg:pb-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">{children}</div>
        <SummaryAside {...summary} />
      </div>
      <SummaryBar {...summary} />
    </div>
  );
}

export type ProductSearchProps = {
  products: Product[];
  frequent?: FrequentItem[];
  label: string;
  onPick: (p: { name: string; unit: string }) => void;
  onCreate: (name: string, unit: string) => void;
};

/** Product search + keyboard hint + frequent products of the site. */
export function ProductSearch({ products, frequent, label, onPick, onCreate }: ProductSearchProps) {
  return (
    <section aria-label="Ajouter des articles" className="space-y-3">
      <ProductPicker
        id={SEARCH_ID}
        products={products}
        frequent={frequent}
        onPick={onPick}
        onCreate={onCreate}
        label={label}
        placeholder="Rechercher un produit…"
      />
      <p className="hidden flex-wrap items-center gap-1.5 text-xs text-muted-foreground md:flex">
        <Kbd>/</Kbd> pour rechercher
        <span aria-hidden>·</span>
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> puis <Kbd>Entrée</Kbd> pour ajouter
      </p>
      {frequent && frequent.length ? <FrequentChips items={frequent} onPick={onPick} /> : null}
    </section>
  );
}
