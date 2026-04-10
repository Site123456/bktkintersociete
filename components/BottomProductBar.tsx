"use client";

import { Plus } from "lucide-react";

interface Produit { uniquename: string; typedequantite: string; }

export default function BottomProductBar({ onAdd, produits }: { onAdd: (p: Produit) => void, produits: Produit[] }) {
  return (
    <div className="fixed sm:hidden bottom-[56px] inset-x-0 bg-background/90 backdrop-blur-xl border-t border-primary/10 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-3 py-2.5 snap-x snap-mandatory">
          {produits.map((p, i) => (
            <button
              key={i}
              onClick={() => onAdd(p)}
              className="snap-start shrink-0 rounded-xl border border-primary/10 bg-card/50 text-card-foreground px-3.5 py-2 shadow-sm active:scale-95 active:bg-primary/10 transition-all duration-200 flex items-center gap-2.5 h-11 group border-b-2 border-b-primary/5 active:border-b-primary/20"
            >
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[11px] font-bold leading-tight text-foreground/90 whitespace-nowrap max-w-[120px] truncate group-active:text-primary transition-colors">{p.uniquename}</span>
                <span className="text-[9px] font-black text-primary/40 uppercase tracking-tighter">{p.typedequantite}</span>
              </div>
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-active:bg-primary group-active:text-primary-foreground transition-all duration-300 shadow-sm">
                <Plus size={12} strokeWidth={3} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
