"use client";

import { Plus } from "lucide-react";

interface Produit { uniquename: string; typedequantite: string; }

export default function BottomProductBar({ onAdd, produits }: { onAdd: (p: Produit) => void, produits: Produit[] }) {
  return (
    <div className="fixed sm:hidden bottom-[56px] inset-x-0 bg-background/95 backdrop-blur-2xl border-t border-primary/20 z-30 shadow-[0_-12px_30px_rgba(0,0,0,0.1)]">
      <div className="overflow-x-auto no-scrollbar py-1">
        <div className="flex gap-2.5 px-4 py-3 snap-x snap-mandatory">
          {produits.map((p, i) => (
            <button
              key={i}
              onClick={() => onAdd(p)}
              className="snap-center shrink-0 rounded-2xl border-2 border-primary/10 bg-card text-card-foreground px-5 py-3 shadow-md active:scale-95 active:bg-primary/5 transition-all duration-200 flex items-center gap-4 h-16 group active:border-primary/30"
            >
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-black leading-tight text-foreground whitespace-nowrap group-active:text-primary transition-colors">{p.uniquename}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{p.typedequantite}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-active:bg-primary group-active:text-primary-foreground transition-all duration-300 shadow-inner">
                <Plus size={20} strokeWidth={3} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
