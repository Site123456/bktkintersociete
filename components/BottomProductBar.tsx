"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import produitsRaw from "@/data/produits.json";

interface Produit { uniquename: string; typedequantite: string; }

export default function BottomProductBar({ onAdd, produits }: { onAdd: (p: Produit) => void, produits: Produit[] }) {
  // The user says "small scrren more simple products ading system in bottom bar scroll like before but better"
  // So horizontal scroll with simple cards.

  return (
    <div className="fixed sm:hidden p-0 m-0 bottom-[72px] sm:bottom-0 inset-x-0 bg-background/90 backdrop-blur-xl border-t border-border z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div className="px-3 overflow-x-auto no-scrollbar pb-safe">
        <div className="grid grid-flow-col auto-cols-[110px] gap-2 py-3 snap-x snap-mandatory">
          {produits.map((p, i) => (
            <button
              key={i}
              onClick={() => onAdd(p)}
              className="snap-start shrink-0 rounded-2xl border border-border/60 bg-card text-card-foreground p-3 shadow-xs hover:shadow-md transition active:scale-95 flex flex-col justify-between text-left h-24 group relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-primary/10 group-active:bg-primary/50 transition-colors"></div>
              <div>
                <p className="text-[11px] font-bold leading-tight line-clamp-2 text-foreground/90">{p.uniquename}</p>
                <p className="text-[9px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{p.typedequantite}</p>
              </div>

              <div className="mt-auto flex justify-end">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary group-active:text-primary-foreground group-active:bg-primary transition-colors">
                  <Plus size={14} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
