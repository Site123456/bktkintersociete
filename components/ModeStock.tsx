"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Send, ClipboardList, Plus, Minus, Trash2, Search as SearchIcon, GripVertical, Package, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import BottomProductBar from "@/components/BottomProductBar";
import { motion, AnimatePresence } from "framer-motion";

interface Produit { uniquename: string; typedequantite: string; }
type Line = { id: string; name: string; qty: number; unit: string; original_qty: number; }

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function ModeStock({ selectedSite, produits }: { selectedSite: any, produits: Produit[] }) {
  const router = useRouter();
  const { user } = useUser();

  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    }, 150);
  };

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!selectedSite?.slug) return;
    const fetchRecap = async () => {
      try {
        const res = await fetch(`/api/stock-recap?site=${selectedSite.slug}`);
        if (res.ok) {
          const data = await res.json();
          // Pre-populate with items requested this month
          const loaded = (data.items || []).map((i: any) => ({
            id: createId(),
            name: i.name,
            qty: i.qty,
            unit: i.unit,
            original_qty: i.qty
          }));
          setLines(loaded);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };
    fetchRecap();
  }, [selectedSite]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return produits.filter(p => p.uniquename.toLowerCase().includes(q));
  }, [search]);

  const addProduct = (p: Produit) => {
    setLines(prev => [...prev, { id: createId(), name: p.uniquename, qty: 1, unit: p.typedequantite ?? "", original_qty: 0 }]);
    setSearch(""); setShowDropdown(false);
    scrollToBottom();
  };

  const addNewProduct = async (name: string) => {
    setLines(prev => [...prev, { id: createId(), name, qty: 1, unit: "Pièce", original_qty: 0 }]);
    setSearch(""); setShowDropdown(false);
    scrollToBottom();
    try {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, unit: "Pièce" })
      });
    } catch (e) { }
  };

  const updateQty = (id: string, qty: number) => {
    setLines(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(0, qty) } : item));
  };
  const removeLine = (id: string) => setLines(prev => prev.filter(item => item.id !== id));

  const generatePDF = async () => {
    if (!user || !selectedSite) return;
    setLoading(true);

    const items = lines.filter(l => l.qty > 0).map(l => ({
      name: l.name,
      unit: l.unit,
      qty: l.qty
    }));

    if (items.length === 0) {
      alert("Aucun stock n'a été spécifié.");
      setLoading(false); return;
    }

    const payload = {
      docType: "stock",
      date: new Date().toISOString().split("T")[0],
      requestedDeliveryDate: new Date().toISOString().split("T")[0],
      signedBy: user.primaryEmailAddress?.emailAddress ?? "",
      username: user.username ?? "",
      ref: user.id.replace(/^user_/, ""),
      site: selectedSite,
      items
    };

    const res = await fetch("/routedb/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/pdf?id=${data.id}`);
    } else {
      setLoading(false);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-60 animate-pulse">
        <ClipboardList className="h-12 w-12 text-primary/50 mb-3" />
        <p className="font-bold text-sm tracking-tight">Chargement du récapitulatif...</p>
      </div>
    );
  }

  const hasLines = lines.length > 0;

  return (
    <div className={`space-y-6 animate-in fade-in-0 ${hasLines ? "pb-60" : "pb-32"}`}>
      <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-primary/10 to-transparent rounded-3xl border border-primary/20 shadow-inner">
        <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shrink-0 shadow-lg shadow-primary/20">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground/90">État des Stocks Mensuel</h2>
          <p className="text-sm text-primary/80 font-medium">Récapitulatif des livraisons de ce mois. Ajustez ou ajoutez d'autres produits.</p>
        </div>
      </div>

      <div className="sticky top-12 sm:top-14 z-40 w-full bg-background/95 backdrop-blur-2xl py-2 sm:py-2.5 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-border/20">
        <div className="relative group">
          <SearchIcon className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-all duration-300" size={16} />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Rechercher un produit additionnel..."
            className="w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 rounded-xl border border-primary/10 bg-card/30 backdrop-blur-md focus:bg-background/80 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all duration-300 text-sm shadow-md font-medium placeholder:text-muted-foreground/40"
          />
          {search && (
            <button onClick={() => { setSearch(""); setShowDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-md transition shadow-sm">
              <X size={14} className="text-foreground/60" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showDropdown && search.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 mt-1.5 bg-card/98 backdrop-blur-xl border border-border/50 rounded-xl sm:rounded-2xl shadow-2xl max-h-56 sm:max-h-72 overflow-auto z-50 py-1"
            >
              {filteredItems.length === 0 && (
                <li className="px-3.5 py-3 text-sm text-muted-foreground text-center">Aucun résultat</li>
              )}
              {filteredItems.slice(0, 12).map((p, i) => (
                <li key={i} onMouseDown={(e) => { e.preventDefault(); addProduct(p); }} className="px-3 py-2 sm:py-2.5 mx-1 cursor-pointer hover:bg-primary/5 active:bg-primary/10 transition rounded-lg flex justify-between items-center group">
                  <span className="font-semibold text-xs sm:text-sm group-hover:text-primary transition truncate">{p.uniquename}</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded font-bold shrink-0 ml-2">{p.typedequantite}</span>
                </li>
              ))}
              <li onMouseDown={(e) => { e.preventDefault(); addNewProduct(search); }} className="px-3 py-2.5 mx-1 cursor-pointer hover:bg-primary/10 active:bg-primary/15 transition font-bold text-primary text-xs sm:text-sm flex gap-1.5 items-center border-t border-border/30 mt-1 rounded-lg">
                <Plus size={13} /> Ajouter &quot;{search}&quot;
              </li>
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.id} className="relative group border rounded-2xl bg-card p-4 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all hover:shadow-lg hover:border-primary/40">
            <button onClick={() => removeLine(l.id)} className="absolute top-3 right-3 sm:hidden text-red-500 hover:text-red-600 transition p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20"><Trash2 size={18} /></button>
            <div className="flex items-start gap-4 flex-1">
              <div className="pt-2 opacity-30 text-primary cursor-grab"><GripVertical size={20} /></div>
              <div className="flex flex-col gap-1.5 w-full pr-10 sm:pr-0">
                <input value={l.name} onChange={(e) => setLines(prev => prev.map(item => item.id === l.id ? { ...item, name: e.target.value } : item))} className="text-lg font-bold bg-transparent border-none focus:ring-0 outline-none w-full p-0 text-foreground" placeholder="Nom" />
                <div className="flex items-center gap-2">
                  <input value={l.unit} placeholder="Unité" onChange={(e) => setLines(prev => prev.map(item => item.id === l.id ? { ...item, unit: e.target.value } : item))} className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md border-none focus:ring-0 outline-none w-24 p-0" />
                  {l.original_qty > 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1"><Package size={10} /> Reçu: {l.original_qty}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 w-full sm:w-auto sm:justify-end bg-background sm:bg-muted/40 p-2 rounded-2xl border">
              <button title="-1" onClick={() => updateQty(l.id, l.qty - 1)} className="p-2 sm:p-3 rounded-xl bg-card border shadow-xs hover:text-primary transition active:scale-95"><Minus size={18} /></button>
              <input type="number" min={0} value={l.qty} onChange={(e) => updateQty(l.id, Number(e.target.value))} className="w-16 sm:w-20 text-center font-bold text-lg sm:text-xl bg-transparent border-none focus:ring-0 outline-none" />
              <button title="+1" onClick={() => updateQty(l.id, l.qty + 1)} className="p-2 sm:p-3 rounded-xl bg-card border shadow-xs hover:text-primary transition active:scale-95"><Plus size={18} /></button>
            </div>
            <button title="Supprimer" onClick={() => removeLine(l.id)} className="hidden sm:flex text-red-500/70 hover:text-red-500 transition p-3 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 ml-2"><Trash2 size={20} /></button>
          </div>
        ))}

        {lines.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5">
            <Package className="h-12 w-12 text-primary/40 mb-4" />
            <h3 className="font-bold text-foreground text-lg">Aucun historique ce mois-ci</h3>
            <p className="text-sm text-foreground/60 mt-1 max-w-sm">Vous n'avez passé aucune commande pour ce site ce mois-ci. Ajoutez des produits manuellement ci-dessus.</p>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      <BottomProductBar onAdd={addProduct} produits={produits} />

      <div className="fixed inset-x-0 bottom-0 p-4 bg-background/90 backdrop-blur-xl border-t z-40 sm:hidden pb-safe">
        <button onClick={generatePDF} disabled={loading} className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/30 active:scale-95">
          <Send className="h-6 w-6" />
          {loading ? "Création du PDF..." : "Générer l'État des Stocks"}
        </button>
      </div>

      <button onClick={generatePDF} disabled={loading} className="hidden sm:flex fixed right-8 bottom-8 h-16 px-8 rounded-2xl bg-primary text-primary-foreground font-bold items-center justify-center gap-3 transition-all shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95">
        <Send className="h-6 w-6" />
        {loading ? "Création du PDF..." : "Générer l'État des Stocks"}
      </button>
    </div>
  );
}
