"use client";

import { Plus } from "lucide-react";

interface Produit { uniquename: string; typedequantite: string; }

export default function BottomProductBar({ onAdd, produits }: { onAdd: (p: Produit) => void, produits: Produit[] }) {
  return (
    <div className="fixed sm:hidden bottom-[56px] inset-x-0 bg-background/95 backdrop-blur-xl border-t border-border/30 z-30">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 px-2.5 py-2 snap-x snap-mandatory">
          {produits.map((p, i) => (
            <button
              key={i}
              onClick={() => onAdd(p)}
              className="snap-start shrink-0 rounded-lg border border-border/40 bg-card/80 text-card-foreground px-3 py-2 shadow-xs active:scale-95 active:bg-primary/5 transition flex items-center gap-2 h-10 group"
            >
              <span className="text-[11px] font-semibold leading-tight text-foreground/80 whitespace-nowrap max-w-[100px] truncate">{p.uniquename}</span>
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-active:bg-primary group-active:text-primary-foreground transition-colors">
                <Plus size={11} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
