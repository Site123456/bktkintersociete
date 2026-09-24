"use client";

import type { ReactNode } from "react";
import { ProductPicker } from "@/components/app/ProductPicker";
import type { Product } from "@/types/delivery";
import { SummaryAside, SummaryBar, type SummaryPanelProps } from "./SummaryPanel";

/** Id of the product search field (focused with the "/" key). */
export const SEARCH_ID = "product-search";

/**
 * Scroll margins of the lines and quantity fields, so a line brought into view is not hidden
 * under the sticky header + search (top) or the summary bar (bottom) on phones.
 */
export const LINE_SCROLL_MARGIN = "scroll-mt-36 scroll-mb-32 lg:scroll-mt-24 lg:scroll-mb-6";

/**
 * Builder column on the left and summary card on the right from 1024px; on smaller screens the summary
 * becomes a bar stuck to the bottom. Place it directly in a flex column that fills the page.
 */
export function BuilderLayout({ children, summary }: { children: ReactNode; summary: SummaryPanelProps }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="grid flex-1 items-start gap-6 pb-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 lg:pb-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">{children}</div>
        <SummaryAside {...summary} />
      </div>
      <SummaryBar {...summary} />
    </div>
  );
}

export type ProductSearchProps = {
  products: Product[];
  label: string;
  onPick: (p: { name: string; unit: string }) => void;
  onCreate: (name: string, unit: string) => void;
};

/**
 * Product search. Under 1024px it sticks just under the app header, so products can be added
 * while scrolling the list; "/" focuses it on a keyboard.
 */
export function ProductSearch({ products, label, onPick, onCreate }: ProductSearchProps) {
  return (
    <section
      aria-label="Ajouter des articles"
      className={
        "sticky top-14 z-[35] -mx-4 -my-2 bg-background px-4 py-2 sm:-mx-6 sm:px-6 " +
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-linear-to-b after:from-background after:to-transparent " +
        "lg:static lg:m-0 lg:p-0 lg:after:hidden"
      }
    >
      <ProductPicker
        id={SEARCH_ID}
        products={products}
        onPick={onPick}
        onCreate={onCreate}
        label={label}
        shortcut="/"
        placeholder="Rechercher un produit…"
      />
    </section>
  );
}
