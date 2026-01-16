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
  Send
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
// --------------------------------------------------
//  TYPES
// --------------------------------------------------

type Site = {
  _id?: string;
  slug: string;
  name: string;
};
const FALLBACK_SITES: Site[] = [
  { slug: "BKTK01", name: "INS Paris 15" },
  { slug: "BKTK02", name: "INS Bordeaux" },
  { slug: "BKTK03", name: "INS Courbevoie" },
  { slug: "BKTK04", name: "INS Saint-Ouen" },
  { slug: "BKTK05", name: "INS Bagneux" },
  { slug: "BKTK06", name: "INS Ivry" },
  { slug: "BKTK07", name: "AFS" },
  { slug: "BKTK08", name: "Koseli Buffet" },
];
function AppLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 animate-in fade-in-0">
        <div className="p-6 w-full space-y-6">
          {/* Title skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 text-sm rounded-md flex items-center justify-center">
              BKTK
            </Skeleton>
            <Skeleton className="h-8 w-68 rounded-md flex p-2 items-center">
              Preparing your workspace…
            </Skeleton>
          </div>

          {/* Main card skeleton */}
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>

          {/* Grid skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
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
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg hover:bg-accent/60">
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}

type Produit = {
  uniquename: string
  typedequantite: string
}

type Line = {
  id: string
  name: string
  qty: number
  unit: string
}

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}
const today = () => {
  const d = new Date()
  d.setDate(d.getDate())
  return d.toISOString().split("T")[0]
}
interface DeliveryPayload {
  date: string;
  requestedDeliveryDate: string;
  signedBy: string;
  username: string;
  ref: string;
  site: string;
  items: Array<{
    name: string;
    unit: string;
    qty: number;
  }>;
}
const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function SendToBackDB(
  payload: DeliveryPayload,
  onSuccess: (id: string) => void
) {
  const res = await fetch("/routedb/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to save delivery");

  const data = await res.json();
  onSuccess(data.id);
}
export function PdfViewer({ id }: { id: string }) {
  return (
    <iframe
      src={`/pdf?id=${id}`}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
      }}
    />
  );
}

export function CreerDevis() {
  const router = useRouter();
  const { user } = useUser();
  const produits = produitsRaw as Produit[]
  const [lines, setLines] = useState<Line[]>([])
  const [search, setSearch] = useState("")
  const [date, setDate] = useState(tomorrow())
  const [showDropdown, setShowDropdown] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return produits.filter(p =>
      p.uniquename.toLowerCase().includes(q)
    )
  }, [search])
  const addProduct = (p: Produit) => {
    setLines(prev => [
      ...prev,
      {
        id: createId(),
        name: p.uniquename,
        qty: 1,
        unit: p.typedequantite ?? ""
      }
    ]);

    setSearch("");
    setShowDropdown(false);
  };


  const addNewProduct = (name: string) => {
    setLines(prev => [
      ...prev,
      {
        id: createId(),
        name,
        qty: 1,
        unit: ""
      }
    ]);

    setSearch("");
    setShowDropdown(false);
  };


  const updateQty = (id: string, qty: number) => {
    setLines(prev =>
      prev.map(item =>
        item.id === id ? { ...item, qty: Math.max(0, qty) } : item
      )
    );
  };


  const removeLine = (id: string) => {
    setLines(prev => prev.filter(item => item.id !== id));
  };


  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    id: string
  ) => {
    e.dataTransfer.setData("text/plain", id);
  };


  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };


  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string
  ) => {
    e.preventDefault();

    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;

    setLines(prev => {
      const newOrder = [...prev];

      const draggedIndex = newOrder.findIndex(i => i.id === draggedId);
      const targetIndex = newOrder.findIndex(i => i.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const [moved] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, moved);

      return newOrder;
    });
  };



  const generatePDF = () => {
    if (!user) return <AppLoader />
    
    const selected = localStorage.getItem(`selected-site-${user.id}`);
    const site = selected ? JSON.parse(selected) : null;
    const payload: DeliveryPayload = {
      date: today(),
      requestedDeliveryDate: date,
      signedBy: user.primaryEmailAddress?.emailAddress ?? "",
      username: user.username ?? "",
      ref: user.id.replace(/^user_/, ""),

      site: site,

      // Everything else stays as-is
      items: lines.map(l => ({
        name: l.name,
        unit: l.unit,
        qty: l.qty,
      })),
    };
    SendToBackDB(payload, (id) => {
      router.push(`/pdf?id=${id}`);
    });


  }

  return (
    <main className="py-6 bg-background text-foreground space-y-6">
      {/* DATE PICKER */}
      <div className="mb-4 w-full">
        <label className="text-sm font-medium text-muted-foreground mb-1 block">
          Date de livraison
        </label>

        <input
          type="date"
          value={date}
          min={tomorrow()}
          onChange={e => setDate(e.target.value)}
          className="
            w-full px-3 py-2 rounded-lg border bg-background
            focus:ring-2 focus:ring-primary/40 focus:outline-none
            transition text-sm
          "
        />
      </div>

      {/* SEARCH / ADD PRODUCT */}
      <div className="relative w-full">
        <div className="relative">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />

          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Rechercher ou ajouter un produit"
            className="
              w-full pl-9 pr-3 py-2 rounded-lg border bg-background
              focus:ring-2 focus:ring-primary/40 focus:outline-none
              transition text-sm
            "
          />
        </div>

        {showDropdown && search.length > 0 && (
          <ul
            className="
              absolute z-20 w-full mt-2
              bg-card border rounded-xl shadow-xl
              max-h-60 overflow-auto
              animate-in fade-in slide-in-from-top-1
              sm:max-w-lg sm:left-0
            "
          >
            {filtered.length > 0 && (
              filtered.map((p, i) => (
                <li
                  key={i}
                  onClick={() => addProduct(p)}
                  className="
                    px-3 py-2 cursor-pointer
                    hover:bg-muted transition
                    flex justify-between items-center
                    text-sm
                  "
                >
                  <span className="font-medium">{p.uniquename}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.typedequantite}
                  </span>
                </li>
              ))
            )}
            <li
              onClick={() => addNewProduct(search)}
              className="
                px-3 py-2 cursor-pointer
                hover:bg-muted transition
                font-medium text-primary text-sm
              "
            >
              Ajouter “{search}”
            </li>
          </ul>
        )}
      </div>


      <section>
        {lines.map((l) => (
          <div
            key={l.id}
            draggable
            onDragStart={(e) => handleDragStart(e, l.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, l.id)}
            className="
              relative group
              border rounded-xl bg-card p-4 shadow-sm 
              flex flex-col gap-5 mb-3
              sm:flex-row sm:items-center sm:justify-between
              transition-all hover:shadow-md hover:border-primary/30
            "
          >
            {/* MOBILE: Trash button top-right */}
            <button
              onClick={() => removeLine(l.id)}
              className="
                absolute top-3 right-3 sm:hidden
                text-red-500 hover:text-red-600 
                transition p-2 rounded-lg hover:bg-red-50
              "
            >
              <Trash2 size={18} />
            </button>

            {/* LEFT — Drag handle + Editable product info */}
            <div className="flex items-start gap-4 flex-1">
              {/* Drag handle */}
              <div
                className="
                  cursor-grab active:cursor-grabbing
                  text-muted-foreground hover:text-primary transition
                  flex items-center pt-1
                "
              >
                <GripVertical size={20} />
              </div>

              {/* Editable fields */}
              <div className="flex flex-col gap-1 w-full">
                {/* Name */}
                <input
                  value={l.name}
                  onChange={(e) =>
                    setLines(prev =>
                      prev.map(item =>
                        item.id === l.id ? { ...item, name: e.target.value } : item
                      )
                    )
                  }
                  className="
                    text-base font-semibold bg-transparent 
                    border-none focus:ring-0 focus:outline-none
                    w-full placeholder:text-muted-foreground
                    pe-7
                  "
                  placeholder="Nom du produit"
                />

                {/* Unit / description */}
                <input
                  value={l.unit}
                  placeholder="Description / unité"
                  onChange={(e) =>
                    setLines(prev =>
                      prev.map(item =>
                        item.id === l.id ? { ...item, unit: e.target.value } : item
                      )
                    )
                  }
                  className="
                    text-sm text-muted-foreground bg-transparent 
                    border-none focus:ring-0 focus:outline-none
                    w-full placeholder:text-muted-foreground
                  "
                />
              </div>
            </div>

            {/* MIDDLE — Quantity controls */}
            <div
              className="
                flex items-center gap-3 w-full
                sm:w-auto sm:justify-end
              "
            >
              <button
                onClick={() => updateQty(l.id, l.qty - 1)}
                className="
                  p-2 rounded-lg border bg-background 
                  hover:bg-muted active:scale-95 
                  transition flex items-center justify-center
                "
              >
                <Minus size={16} />
              </button>

              <input
                type="number"
                min={0}
                value={l.qty}
                onChange={(e) => updateQty(l.id, Number(e.target.value))}
                className="
                  flex-1 text-center border rounded-lg py-2 
                  bg-background font-medium text-base
                  focus:ring-2 focus:ring-primary/40 focus:outline-none
                  sm:flex-none sm:w-20
                "
              />

              <button
                onClick={() => updateQty(l.id, l.qty + 1)}
                className="
                  p-2 rounded-lg border bg-background 
                  hover:bg-muted active:scale-95 
                  transition flex items-center justify-center
                "
              >
                <Plus size={16} />
              </button>
            </div>

            {/* DESKTOP: Trash button */}
            <button
              onClick={() => removeLine(l.id)}
              className="
                hidden sm:block
                text-red-500 hover:text-red-600 
                transition p-2 rounded-lg hover:bg-red-50
              "
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {lines.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center py-10 text-center">
            <p className="opacity-50 text-sm leading-relaxed">
              Rechercher un produit pour ajouter<br />
              Search products to add new
            </p>
          </div>
        )}

      </section>

      <button
        onClick={generatePDF}
        disabled={!lines.length}
        className={`
          fixed inset-x-0 bottom-4 mx-6 h-12 rounded-xl 
          bg-primary text-primary-foreground font-medium
          flex items-center justify-center gap-2
          transition-all duration-300 ease-out
          shadow-lg shadow-black/5

          ${lines.length 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-6 pointer-events-none"
          }
        `}
      >
        <Send className="h-5 w-5" />
        Send Order
      </button>

    </main>
  )
}

export default function HomePage() {
  const { user } = useUser();

  const [sites] = useState<Site[]>(FALLBACK_SITES);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [loadingSites, setLoadingSites] = useState(true);

  useEffect(() => {
    async function loadSites() {
      try {
        const res = await fetch("/routedb/");
        if (!res.ok) throw new Error("Failed to fetch sites");

        const data: Site[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(data);
        } else {
          console.log(FALLBACK_SITES);
        }
      } catch {
        console.log(FALLBACK_SITES);
      } finally {
        setLoadingSites(false);
      }
    }

    loadSites();
  }, []);

  useEffect(() => {
    if (!user) return;

    const key = `selected-site-${user.id}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const parsed: Site = JSON.parse(stored);
        setSelectedSite(parsed);
      } catch {}
    }
  }, [user]);

  const selectSite = (site: Site) => {
    if (!user) return;

    const key = `selected-site-${user.id}`;
    localStorage.setItem(key, JSON.stringify(site));
    setSelectedSite(site);
  };
  function AppHeader() {
    return (
      <header className="w-full border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">

          {/* LEFT SIDE */}
          <div className="flex items-center gap-3">

            <SignedOut>
              <div className="h-7 w-7 rounded-xl bg-linear-to-tr from-primary/80 to-primary/40 shadow-sm" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">
                  BKTK INTL.
                </span>
                <span className="text-xs text-muted-foreground">
                  Connection requis!
                </span>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <UserAvatar/>

                {/* Name + Site Selector */}
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-tight">
                    BKTK INTL.
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="
                          text-xs text-muted-foreground 
                          hover:text-foreground transition
                          flex items-center gap-1
                        "
                      >
                        {selectedSite
                          ? selectedSite.name
                          : loadingSites
                          ? "Chargement…"
                          : "Choisir un site"}
                        <span className="opacity-70">▾</span>
                      </button>
                    </DropdownMenuTrigger>

                    {!loadingSites && (
                      <DropdownMenuContent
                        className="
                          w-52 p-1 rounded-xl shadow-xl
                          backdrop-blur-md bg-popover/90
                          border border-border/50
                          animate-in fade-in slide-in-from-top-1
                        "
                      >
                        {sites.map((site) => (
                          <button
                            key={site.slug}
                            onClick={() => selectSite(site)}
                            className="
                              w-full text-left px-3 py-2 text-sm
                              hover:bg-accent/50 rounded-md
                              transition flex items-center justify-between
                            "
                          >
                            <span>{site.name}</span>
                            {selectedSite?.slug === site.slug && (
                              <span className="text-primary text-xs">●</span>
                            )}
                          </button>
                        ))}
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                </div>
              </div>
            </SignedIn>

          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-xs">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" size="sm" className="text-xs">
                  Get Started
                </Button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <SignOutButton>
                <Button>Sign Out</Button>
              </SignOutButton>
            </SignedIn>

            <ModeToggle />
          </div>
        </div>
      </header>
    );
  }
  function Dashboard() {
    if (!user) {
      return (
        <div className="p-10 w-full flex flex-col items-center justify-center text-center gap-4 bg-card/50 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">Connect to your site</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Connectez‑vous pour accéder à votre espace et sélectionner un site.
          </p>

          <div className="flex gap-3 mt-2">
            <SignInButton mode="modal">
              <Button variant="outline" className="px-6">Se connecter</Button>
            </SignInButton>
          </div>
        </div>
      );
    }
    if (!selectedSite) {
      return (
        <div className="p-10 w-full flex flex-col items-center justify-center text-center gap-8 
            rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl 
            shadow-sm animate-in fade-in-0 zoom-in-95 duration-300">

          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight">
              Sélection du site
            </h2>

            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Choisissez un site pour accéder à votre dashboard.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
            {sites.map((site) => (
              <button
                key={site.slug}
                onClick={() => selectSite(site)}
                className="group p-6 rounded-xl border border-border/40 bg-card/60 
                          backdrop-blur-md shadow-sm hover:shadow-lg transition-all 
                          hover:bg-accent/40 text-left flex flex-col gap-2"
              >
                <span className="text-base font-medium group-hover:text-primary transition-colors">
                  {site.name}
                </span>

                <span className="text-xs text-muted-foreground">
                  {site.slug}
                </span>
              </button>
            ))}
          </div>
        </div>

      );
    }


    return (
      <div className="p-6 w-full">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selectedSite.name}
            </h1>
          </div>

          <Link
            href={`/deliveries?site=${selectedSite.slug}`}
            className="text-sm font-medium text-primary hover:text-primary/80 transition"
          >
            See next deliveries →
          </Link>
        </div>

        <CreerDevis />
      </div>
    );
  }

  // --------------------------------------------------
  //  PAGE SHELL
  // --------------------------------------------------

  return (
    <>
      <ClerkLoading>
        <AppLoader />
      </ClerkLoading>

      <ClerkLoaded>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key="app-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col bg-linear-to-b from-background via-background/95 to-background text-foreground"
          >
            <AppHeader />
            <main className="relative flex flex-1 overflow-y-auto">
              <Dashboard />
            </main>
          </motion.div>
        </AnimatePresence>
      </ClerkLoaded>
    </>
  );
}
