"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from 'next/link';

import {
  Moon,
  Sun,
  Building2,
  GripVertical,
  Send,
  Package,
  ClipboardList,
  ShieldAlert,
  Menu,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Truck,
  BarChart3,
  Clock,
  CheckCircle2,
  Archive,
  LogOut,
} from "lucide-react";

import {
  SignInButton,
  SignUpButton,
  SignOutButton,
  SignedIn,
  SignedOut,
  UserAvatar,
  ClerkLoaded,
  ClerkLoading,
  useUser,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion";

import produitsRaw from "@/data/produits.json"
import { Plus, Minus, Trash2, Search as SearchIcon, X } from "lucide-react"
import ModeStock from "@/components/ModeStock";

import BottomProductBar from "@/components/BottomProductBar";

// --------------------------------------------------
//  TYPES & DATA
// --------------------------------------------------

type Site = { _id?: string; slug: string; name: string; };

const FALLBACK_SITES: Site[] = [
  { slug: "BKTK01", name: "INS Paris 15" },
  { slug: "BKTK02", name: "INS Bordeaux" },
  { slug: "BKTK03", name: "INS Courbevoie" },
  { slug: "BKTK04", name: "INS Saint-Ouen" },
  { slug: "BKTK05", name: "INS Bagneux" },
  { slug: "BKTK06", name: "INS Ivry" },
  { slug: "BKTK07", name: "INS Aubervilliers" },
  { slug: "BKTK08", name: "Koseli Buffet" },
];

function AppLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10"
        >
          <Package className="h-10 w-10 text-primary" />
        </motion.div>
        <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Chargement...</p>
      </div>
    </div>
  );
}

function ModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg sm:rounded-xl hover:bg-accent/60 h-8 w-8 sm:h-9 sm:w-9">
      <Sun className="h-4 w-4 sm:h-5 sm:w-5 dark:hidden" />
      <Moon className="hidden h-4 w-4 sm:h-5 sm:w-5 dark:block" />
    </Button>
  );
}

type Produit = { uniquename: string; typedequantite: string; }
type Line = { id: string; name: string; qty: number; unit: string; }

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
const today = () => { const d = new Date(); d.setDate(d.getDate()); return d.toISOString().split("T")[0]; }
const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function CreerDevis({ selectedSite, produits }: { selectedSite: any, produits: Produit[] }) {
  const router = useRouter();
  const { user } = useUser();
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(tomorrow());
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return produits.filter(p => p.uniquename.toLowerCase().includes(q))
  }, [search, produits])

  const addProduct = (p: Produit) => {
    setLines(prev => [...prev, { id: createId(), name: p.uniquename, qty: 1, unit: p.typedequantite ?? "" }]);
    setSearch(""); setShowDropdown(false);
    scrollToBottom();
  };

  const addNewProduct = async (name: string) => {
    setLines(prev => [...prev, { id: createId(), name, qty: 1, unit: "Pièce" }]);
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
    if (!user) return;
    setLoading(true);

    const payload = {
      docType: "supply",
      date: today(),
      requestedDeliveryDate: date,
      signedBy: user.primaryEmailAddress?.emailAddress ?? "",
      username: user.username ?? "",
      ref: user.id.replace(/^user_/, ""),
      site: selectedSite,
      items: lines.map(l => ({ name: l.name, unit: l.unit, qty: l.qty })),
    };

    const res = await fetch("/routedb/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { setLoading(false); alert("Error"); return; }
    const data = await res.json();
    router.push(`/pdf?id=${data.id}`);
  }

  // Determine if we need to show the padding for bottom bar
  const hasLines = lines.length > 0;

  return (
    <div className={`space-y-4 sm:space-y-6 ${hasLines ? "pb-60" : "pb-32"}`}>

      {/* Date + counter row — compact on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-3 bg-card/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/50 shadow-sm"
      >
        <Clock size={14} className="text-primary shrink-0 hidden sm:block" />
        <div className="flex-1">
          <label className="text-[10px] sm:text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Livraison le</label>
          <input type="date" value={date} min={tomorrow()} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-border/50 bg-background/80 focus:ring-2 focus:ring-primary/30 outline-none transition text-xs sm:text-sm font-semibold"
          />
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-primary/5 rounded-xl border border-primary/10 shrink-0">
          <span className="text-xl sm:text-2xl font-black text-primary leading-none">{lines.length}</span>
          <span className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">article{lines.length !== 1 ? 's' : ''}</span>
        </div>
      </motion.div>

      {/* Sticky search bar */}
      <div className="sticky top-12 sm:top-14 z-40 w-full bg-background/95 backdrop-blur-2xl py-2 sm:py-2.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="relative group">
          <SearchIcon className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-all duration-300" size={16} />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Rechercher un produit..."
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
              className="absolute left-4 right-4 sm:left-0 sm:right-0 mt-1.5 bg-card/98 backdrop-blur-xl border border-border/50 rounded-xl sm:rounded-2xl shadow-2xl max-h-56 sm:max-h-72 overflow-auto z-50 py-1"
            >
              {filtered.length === 0 && (
                <li className="px-3.5 py-3 text-sm text-muted-foreground text-center">Aucun résultat</li>
              )}
              {filtered.slice(0, 12).map((p, i) => (
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

      {/* Product lines */}
      <div className="space-y-2 sm:space-y-3">
        <AnimatePresence mode="popLayout">
          {lines.map((l) => (
            <motion.div
              key={l.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, x: -20 }}
              transition={{ duration: 0.15 }}
              className="relative group border border-border/40 rounded-xl sm:rounded-2xl bg-card/70 backdrop-blur-sm p-3 sm:p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-all hover:shadow-md hover:border-primary/15"
            >
              {/* Mobile delete */}
              <button onClick={() => removeLine(l.id)} className="absolute top-2.5 right-2.5 sm:hidden text-red-500/50 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-500/10">
                <Trash2 size={14} />
              </button>

              {/* Name + unit */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="pt-1 opacity-15 cursor-grab text-primary hidden sm:block"><GripVertical size={18} /></div>
                <div className="flex flex-col gap-0.5 w-full pr-8 sm:pr-0">
                  <input value={l.name} onChange={(e) => setLines(prev => prev.map(item => item.id === l.id ? { ...item, name: e.target.value } : item))} className="text-sm sm:text-base font-bold bg-transparent border-none focus:ring-0 outline-none w-full p-0 truncate" placeholder="Nom du produit" />
                  <input value={l.unit} placeholder="Unité (KG, Pièce...)" onChange={(e) => setLines(prev => prev.map(item => item.id === l.id ? { ...item, unit: e.target.value } : item))} className="text-[11px] sm:text-xs text-muted-foreground/70 font-medium bg-transparent border-none focus:ring-0 outline-none w-full p-0" />
                </div>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-0.5 w-full sm:w-auto sm:justify-end bg-muted/30 p-1 rounded-lg border border-border/30">
                <button onClick={() => updateQty(l.id, l.qty - 1)} className="p-2 sm:p-2.5 rounded-lg bg-card border border-border/40 shadow-xs hover:text-primary hover:border-primary/20 transition active:scale-90"><Minus size={14} /></button>
                <input type="number" min={0} value={l.qty} onChange={(e) => updateQty(l.id, Number(e.target.value))} className="w-12 sm:w-14 text-center font-black text-base bg-transparent border-none focus:ring-0 outline-none" />
                <button onClick={() => updateQty(l.id, l.qty + 1)} className="p-2 sm:p-2.5 rounded-lg bg-card border border-border/40 shadow-xs hover:text-primary hover:border-primary/20 transition active:scale-90"><Plus size={14} /></button>
              </div>

              {/* Desktop delete */}
              <button onClick={() => removeLine(l.id)} className="hidden sm:flex text-red-500/40 hover:text-red-500 transition p-2.5 rounded-xl hover:bg-red-500/5 ml-1"><Trash2 size={18} /></button>
            </motion.div>
          ))}
        </AnimatePresence>

        {lines.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center justify-center py-14 sm:py-20 text-center border border-dashed border-border/40 rounded-2xl bg-card/20"
          >
            <Package className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/20 mb-4" />
            <h3 className="font-bold text-foreground/60 text-sm sm:text-base">Liste vide</h3>
            <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1 max-w-[250px] leading-relaxed">Ajoutez des produits via la barre de recherche ou le menu rapide.</p>
          </motion.div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      <BottomProductBar onAdd={addProduct} produits={produits} />

      {/* Mobile fixed bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 p-4 bg-background/90 backdrop-blur-xl border-t z-40 sm:hidden pb-safe">
        <motion.button
          onClick={generatePDF} disabled={!lines.length || loading}
          whileTap={{ scale: 0.97 }}
          className={`w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-primary/20 ${lines.length ? "opacity-100" : "opacity-40 grayscale pointer-events-none"}`}
        >
          <Send className="h-5 w-5" />
          {loading ? "Génération..." : "Envoyer la commande"}
        </motion.button>
      </div>

      {/* Desktop floating CTA */}
      <AnimatePresence>
        {lines.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onClick={generatePDF} disabled={loading}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="hidden sm:flex fixed right-8 bottom-8 h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-bold items-center justify-center gap-2.5 shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-shadow"
          >
            <Send className="h-5 w-5" />
            {loading ? "Génération..." : "Envoyer la commande"}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const [sites] = useState<Site[]>(FALLBACK_SITES);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const [isVerified, setIsVerified] = useState(false);
  const [syncing, setSyncing] = useState(true);

  const [currentMode, setCurrentMode] = useState<"commander" | "stock">("commander");
  const [globalProduits, setGlobalProduits] = useState<Produit[]>([]);

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(d => {
      if (d.ok) setGlobalProduits(d.products);
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setSyncing(false); return; }

    const performSync = async () => {
      try {
        const res = await fetch("/api/user/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.username
          })
        });
        if (res.ok) {
          const data = await res.json();
          setIsVerified(data.verified);
        }
      } catch (e) { console.error(e); } finally { setSyncing(false); }
    };

    performSync();

    const key = `selected-site-${user.id}`;
    const stored = localStorage.getItem(key);
    if (stored) { try { setSelectedSite(JSON.parse(stored)); } catch { } }
  }, [user, isLoaded]);

  const selectSite = (site: Site) => {
    if (!user) return;
    localStorage.setItem(`selected-site-${user.id}`, JSON.stringify(site));
    setSelectedSite(site);
  };

  const AppHeader = () => (
    <header className="relative w-full border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex h-12 sm:h-14 items-center justify-between px-3 sm:px-8 max-w-7xl mx-auto">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <SignedOut>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-linear-to-tr from-primary to-primary/60 shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-black text-xs sm:text-sm">B</div>
            <span className="text-xs sm:text-sm font-bold tracking-tight hidden sm:block">BKTK INTL.</span>
          </SignedOut>
          <SignedIn>
            <UserAvatar />
            <div className="flex flex-col leading-none ml-1">
              <span className="text-xs sm:text-sm font-bold tracking-tight">BKTK</span>
              {selectedSite ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-[10px] sm:text-xs text-primary font-semibold hover:opacity-80 transition flex items-center gap-0.5 mt-0.5">
                      {selectedSite.name} <ChevronDown size={10} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-2 rounded-2xl shadow-2xl border bg-popover/95 backdrop-blur-xl">
                    {sites.map((site) => (
                      <button key={site.slug} onClick={() => selectSite(site)} className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-xl transition flex items-center gap-3 ${selectedSite.slug === site.slug ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}>
                        <Building2 size={14} className="opacity-60" />
                        {site.name}
                      </button>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </SignedIn>
        </div>

        {/* Right: Actions — icon-only on mobile */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="rounded-lg sm:rounded-xl h-8 sm:h-9 font-bold px-3 text-xs sm:text-sm">Connexion</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/deliveries" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition">
              <Archive size={15} />
              <span className="hidden sm:inline">Historique</span>
            </Link>
            <SignOutButton>
              <button className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition">
                <LogOut size={14} />
                <span className="hidden sm:inline">Quitter</span>
              </button>
            </SignOutButton>
          </SignedIn>
          <ModeToggle />
        </div>
      </div>
    </header>
  );

  if (!isLoaded || syncing) return <AppLoader />;

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <AppHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8">
        {!user ? (
          /* ==================== LANDING / NOT SIGNED IN ==================== */
          <div className="mt-8 sm:mt-16">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-center mb-16 sm:mb-20 relative"
            >
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[50vh] max-w-[800px] max-h-[500px] bg-primary/8 blur-[120px] rounded-full pointer-events-none"></div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/10 relative"
              >
                <Package className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-white" />
                </div>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-5 relative z-10 text-foreground leading-tight">
                BKTK <span className="text-primary">International</span><br className="sm:hidden" />
              </h1>
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 justify-center items-center relative z-10"
              >
                <SignInButton mode="modal">
                  <Button className="w-full sm:w-auto h-14 px-8 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] transition-transform gap-2.5">
                    Accéder au portail <ArrowRight size={18} />
                  </Button>
                </SignInButton>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="text-center pb-12"
            >
              <div className="inline-flex items-center gap-3 bg-muted/30 px-6 py-3 rounded-full border border-border/40">
                <ShieldAlert size={16} className="text-primary" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Portail sécurisé • Accès restreint</span>
              </div>
            </motion.div>
          </div>
        ) : !isVerified ? (
          /* ==================== PENDING VERIFICATION ==================== */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-20 flex flex-col items-center justify-center text-center p-8 sm:p-10 bg-card border border-yellow-500/20 rounded-3xl shadow-xl max-w-md mx-auto relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500"></div>
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-20 h-20 rounded-3xl bg-yellow-500/10 flex items-center justify-center mb-6"
            >
              <ShieldAlert className="h-10 w-10 text-yellow-600" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">En attente de validation</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">Votre compte a été créé mais doit être validé par un administrateur avant de pouvoir commander.</p>
            <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest bg-muted px-4 py-2.5 rounded-xl">ID: {user.id.slice(0, 10)}...</p>
          </motion.div>
        ) : !selectedSite ? (
          /* ==================== SITE SELECTION ==================== */
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 sm:mt-12"
          >
            <div className="mb-10 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Bonjour, <span className="text-primary">{user.firstName || 'Manager'}</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-base">Sélectionnez le site pour lequel vous souhaitez agir aujourd&apos;hui.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sites.map((site, i) => (
                <motion.button
                  key={site.slug}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => selectSite(site)}
                  className="group relative p-6 bg-card/70 backdrop-blur-sm border border-border/50 hover:border-primary/40 hover:bg-card rounded-3xl text-left transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                    <Building2 className="h-6 w-6 text-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-bold text-base">{site.name}</h3>
                  <p className="text-xs font-semibold text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {site.slug}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ==================== MAIN COMMANDING VIEW ==================== */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* Mode Toggle */}
            <div className="flex bg-muted/40 p-1.5 rounded-2xl mb-8 w-full sm:w-fit mx-auto sm:mx-0 border border-border/40 relative">
              <button
                onClick={() => setCurrentMode("commander")}
                className={`flex-1 sm:w-48 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all z-10 ${currentMode === "commander" ? "text-foreground shadow-md bg-background border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Package size={16} /> Commander
              </button>
              <button
                onClick={() => setCurrentMode("stock")}
                className={`flex-1 sm:w-48 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all z-10 ${currentMode === "stock" ? "text-foreground shadow-md bg-background border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ClipboardList size={16} /> Gérer le Stock
              </button>
            </div>

            <AnimatePresence mode="wait">
              {currentMode === "commander" ? (
                <motion.div key="commander" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <CreerDevis selectedSite={selectedSite} produits={globalProduits} />
                </motion.div>
              ) : (
                <motion.div key="stock" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <ModeStock selectedSite={selectedSite} produits={globalProduits} />
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </main>
    </div>
  );
}
