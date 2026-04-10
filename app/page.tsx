"use client";

import { useEffect, useState, useMemo } from "react";
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
  ChevronDown
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
import { Plus, Minus, Trash2, Search as SearchIcon } from "lucide-react"
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
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Package className="h-8 w-8 text-primary" />
        </div>
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
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-xl hover:bg-accent/60 h-10 w-10">
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return produits.filter(p => p.uniquename.toLowerCase().includes(q))
  }, [search, produits])

  const addProduct = (p: Produit) => {
    setLines(prev => [...prev, { id: createId(), name: p.uniquename, qty: 1, unit: p.typedequantite ?? "" }]);
    setSearch(""); setShowDropdown(false);
  };

  const addNewProduct = async (name: string) => {
    setLines(prev => [...prev, { id: createId(), name, qty: 1, unit: "Pièce" }]);
    setSearch(""); setShowDropdown(false);
    try {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, unit: "Pièce" })
      });
    } catch(e) {}
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
    <div className={`space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 ${hasLines ? "pb-60" : "pb-32"}`}>
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/30 p-4 rounded-2xl border">
        <div className="flex-1">
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Date de livraison souhaitée</label>
          <input type="date" value={date} min={tomorrow()} onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition text-sm font-medium"
          />
        </div>
      </div>

      <div className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-2xl py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition" size={18} />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Rechercher ou ajouter un produit..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-background/50 backdrop-blur-sm focus:bg-background focus:ring-2 focus:ring-primary/40 outline-none transition text-base shadow-sm"
          />
        </div>

        {showDropdown && search.length > 0 && (
          <ul className="absolute w-full mt-2 bg-card border rounded-2xl shadow-2xl max-h-64 overflow-auto animate-in fade-in slide-in-from-top-2 z-50 py-2">
            {filtered.map((p, i) => (
              <li key={i} onMouseDown={(e) => { e.preventDefault(); addProduct(p); }} className="px-4 py-3 cursor-pointer hover:bg-muted/60 transition flex justify-between items-center group">
                <span className="font-semibold text-sm group-hover:text-primary transition">{p.uniquename}</span>
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">{p.typedequantite}</span>
              </li>
            ))}
            <li onMouseDown={(e) => { e.preventDefault(); addNewProduct(search); }} className="px-4 py-3 cursor-pointer hover:bg-primary/10 transition font-semibold text-primary text-sm flex gap-2 items-center">
              <Plus size={16} /> Ajouter "{search}" comme nouveau
            </li>
          </ul>
        )}
      </div>

      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.id} className="relative group border rounded-2xl bg-card p-4 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all hover:shadow-md hover:border-primary/30">
            <button onClick={() => removeLine(l.id)} className="absolute top-3 right-3 sm:hidden text-red-500/70 hover:text-red-500 transition p-2 bg-red-500/5 rounded-xl hover:bg-red-500/10 border"><Trash2 size={16} /></button>
            <div className="flex items-start gap-4 flex-1">
              <div className="pt-1.5 opacity-30 cursor-grab text-primary"><GripVertical size={20} /></div>
              <div className="flex flex-col gap-1.5 w-full pr-10 sm:pr-0">
                <input value={l.name} onChange={(e) => setLines(prev => prev.map(item => item.id === l.id ? { ...item, name: e.target.value } : item))} className="text-base font-bold bg-transparent border-none focus:ring-0 outline-none w-full p-0" placeholder="Nom du produit" />
                <input value={l.unit} placeholder="Unité / Description (ex: KG, Pièce)" onChange={(e) => setLines(prev => prev.map(item => item.id === l.id ? { ...item, unit: e.target.value } : item))} className="text-xs text-muted-foreground font-medium bg-transparent border-none focus:ring-0 outline-none w-full p-0" />
              </div>
            </div>
            <div className="flex items-center gap-1 w-full sm:w-auto sm:justify-end bg-background sm:bg-muted/40 p-1.5 rounded-xl border">
              <button onClick={() => updateQty(l.id, l.qty - 1)} className="p-2 sm:p-3 rounded-xl bg-card border shadow-xs hover:text-primary transition active:scale-95"><Minus size={16} /></button>
              <input type="number" min={0} value={l.qty} onChange={(e) => updateQty(l.id, Number(e.target.value))} className="w-16 text-center font-bold text-lg sm:text-lg bg-transparent border-none focus:ring-0 outline-none" />
              <button onClick={() => updateQty(l.id, l.qty + 1)} className="p-2 sm:p-3 rounded-xl bg-card border shadow-xs hover:text-primary transition active:scale-95"><Plus size={16} /></button>
            </div>
            <button onClick={() => removeLine(l.id)} className="hidden sm:flex text-red-500/80 hover:text-red-500 transition p-3 bg-red-500/5 rounded-xl border hover:bg-red-500/10 ml-2"><Trash2 size={20} /></button>
          </div>
        ))}

        {lines.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-3xl bg-muted/10 border-primary/20">
            <Package className="h-12 w-12 text-primary/30 mb-4" />
            <h3 className="font-semibold text-foreground/80">Aucun produit dans la liste</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">Commencez par ajouter des produits à votre expédition ci-dessus ou via la barre en bas.</p>
          </div>
        )}
      </div>

      <BottomProductBar onAdd={addProduct} produits={produits} />

      <div className="fixed inset-x-0 bottom-0 p-4 bg-background/90 backdrop-blur-xl border-t z-40 sm:hidden pb-safe">
         <button onClick={generatePDF} disabled={!lines.length || loading} className={`w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 ${lines.length ? "opacity-100 active:scale-95" : "opacity-50 grayscale pointer-events-none"}`}>
          <Send className="h-5 w-5" />
          {loading ? "Génération..." : "Envoyer la commande"}
        </button>
      </div>

      <button onClick={generatePDF} disabled={!lines.length || loading} className={`hidden sm:flex fixed right-8 bottom-8 h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-bold items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 ${lines.length ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}>
        <Send className="h-5 w-5" />
        {loading ? "Génération..." : "Envoyer la commande"}
      </button>
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
    if (stored) { try { setSelectedSite(JSON.parse(stored)); } catch {} }
  }, [user, isLoaded]);

  const selectSite = (site: Site) => {
    if (!user) return;
    localStorage.setItem(`selected-site-${user.id}`, JSON.stringify(site));
    setSelectedSite(site);
  };

  const AppHeader = () => (
    <header className="relative w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <SignedOut>
            <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-primary to-primary/60 shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-bold">B</div>
            <div className="hidden sm:flex flex-col leading-tight ml-2">
              <span className="text-sm font-bold tracking-tight">BKTK INTL.</span>
              <span className="text-xs text-muted-foreground font-medium">Portail Sécurisé</span>
            </div>
          </SignedOut>
          <SignedIn>
            <UserAvatar />
            <div className="flex flex-col leading-tight ml-1">
              <span className="text-sm font-bold tracking-tight">BKTK INTL.</span>
              {selectedSite ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-xs text-primary font-medium hover:opacity-80 transition flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md mt-0.5">
                      {selectedSite.name} <ChevronDown size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-2 rounded-2xl shadow-2xl border bg-popover/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                    <p className="px-3 md:hidden py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Changer de site</p>
                    {sites.map((site) => (
                      <button key={site.slug} onClick={() => selectSite(site)} className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-xl transition flex items-center justify-between ${selectedSite.slug === site.slug ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                        {site.name}
                      </button>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5 tracking-widest">Connecté</span>
              )}
            </div>
          </SignedIn>
        </div>
        <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-2xl border">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="rounded-xl h-10 font-bold px-4">Connexion</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <SignOutButton>
              <Button variant="ghost" size="sm" className="rounded-xl h-10 font-bold px-4 hover:bg-red-500/10 hover:text-red-500">Déconnexion</Button>
            </SignOutButton>
          </SignedIn>
          <div className="w-[1px] h-6 bg-border mx-1"></div>
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
          <div className="mt-20 flex flex-col items-center justify-center text-center p-10 glass border-border/50 rounded-3xl max-w-lg mx-auto relative overflow-hidden">
            {/* Glowing orb effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-primary/20 blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 relative z-10 shadow-lg shadow-primary/10">
              <ShieldAlert className="h-10 w-10 text-primary" />
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight mb-3 relative z-10 text-foreground">Accès Restreint</h1>
            <p className="text-muted-foreground/80 mb-10 font-medium relative z-10 text-sm leading-relaxed">
              Le portail de gestion et de commande BKTK nécessite une authentification.
              Veuillez vous connecter pour continuer.
            </p>
            
            <div className="w-full relative z-10">
              <SignInButton mode="modal">
                <Button className="w-full h-14 rounded-xl text-base font-bold shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] transition-transform">
                  Continuer vers le portail
                </Button>
              </SignInButton>
            </div>
          </div>
        ) : !isVerified ? (
          <div className="mt-20 flex flex-col items-center justify-center text-center p-8 bg-card border border-yellow-500/20 rounded-3xl shadow-xl max-w-md mx-auto relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-yellow-500"></div>
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
              <ShieldAlert className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">En attente de validation</h1>
            <p className="text-muted-foreground mb-4">Votre compte a été créé mais doit être validé par un administrateur avant de pouvoir commander.</p>
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest bg-muted px-4 py-2 rounded-lg">ID: {user.id.slice(0,10)}...</p>
          </div>
        ) : !selectedSite ? (
          <div className="mt-10 animate-in slide-in-from-bottom-4">
             <div className="mb-8 text-center sm:text-left">
               <h1 className="text-3xl font-bold tracking-tight">Bonjour, {user.firstName || 'Manager'}</h1>
               <p className="text-muted-foreground mt-1">Sélectionnez le site pour lequel vous souhaitez agir aujourd'hui.</p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {sites.map(site => (
                  <button key={site.slug} onClick={() => selectSite(site)} className="group relative p-6 bg-card border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-3xl text-left transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all">
                      <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center shadow-sm"><ChevronDown className="h-4 w-4 -rotate-90 text-primary" /></div>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                      <Building2 className="h-6 w-6 text-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-bold text-lg">{site.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{site.slug}</p>
                  </button>
               ))}
             </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4">
            
            {/* Mode Toggle */}
            <div className="flex bg-muted p-1.5 rounded-2xl mb-8 w-full sm:w-fit mx-auto sm:mx-0 border relative">
              <button 
                onClick={() => setCurrentMode("commander")} 
                className={`flex-1 sm:w-48 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all z-10 ${currentMode === "commander" ? "text-foreground shadow-sm bg-background border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Package size={16} /> Commander
              </button>
              <button 
                onClick={() => setCurrentMode("stock")} 
                className={`flex-1 sm:w-48 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all z-10 ${currentMode === "stock" ? "text-foreground shadow-sm bg-background border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ClipboardList size={16} /> Gérer le Stock
              </button>
            </div>

            {currentMode === "commander" ? <CreerDevis selectedSite={selectedSite} produits={globalProduits} /> : <ModeStock selectedSite={selectedSite} produits={globalProduits} />}

          </div>
        )}
      </main>
    </div>
  );
}
