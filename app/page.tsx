"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "next-themes";

import {
  Moon,
  Sun,
  Building2,
} from "lucide-react";

import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
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

import jsPDF from "jspdf"
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

type SiteSlug =
  | "BKTK01"
  | "BKTK02"
  | "BKTK03"
  | "BKTK04"
  | "BKTK05"
  | "BKTK06"
  | "BKTK07"
  | "BKTK08";
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
const SITE_HEADERS: Record<SiteSlug, {
  name: string;
  line1: string;
  line2: string;
}> = {
  BKTK01: {
    name: "INS Paris 15",
    line1: "12 RUE DE VAUGIRARD",
    line2: "75015 PARIS – France",
  },
  BKTK02: {
    name: "INS Bordeaux",
    line1: "21 RUE SAINTE-CATHERINE",
    line2: "33000 BORDEAUX – France",
  },
  BKTK03: {
    name: "INS Courbevoie",
    line1: "8 AVENUE MARCEAU",
    line2: "92400 COURBEVOIE – France",
  },
  BKTK04: {
    name: "INS Saint-Ouen",
    line1: "14 RUE DES ROSIERS",
    line2: "93400 SAINT-OUEN – France",
  },
  BKTK05: {
    name: "INS Bagneux",
    line1: "05 ALLÉE DU PARC DE GARLANDE",
    line2: "92220 BAGNEUX – France",
  },
  BKTK06: {
    name: "INS Ivry",
    line1: "3 RUE MAURICE GUNSBOURG",
    line2: "94200 IVRY-SUR-SEINE – France",
  },
  BKTK07: {
    name: "AFS",
    line1: "10 RUE DU COMMERCE",
    line2: "75015 PARIS – France",
  },
  BKTK08: {
    name: "Koseli Buffet",
    line1: "7 RUE DE BELLEVILLE",
    line2: "75020 PARIS – France",
  },
};
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
function getSiteHeader(slug: string | undefined | null) {
  if (!slug) return null;
  if (slug in SITE_HEADERS) {
    return SITE_HEADERS[slug as SiteSlug];
  }
  return null;
}

/* ---------------- PAGE ---------------- */
export function CreerDevis() {

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
    setLines(l => [
      ...l,
      { id: `${Date.now()}`, name: p.uniquename, qty: 1, unit: p.typedequantite }
    ])
    setSearch("")
    setShowDropdown(false)
  }

  const addNewProduct = (name: string) => {
    setLines(l => [
      ...l,
      { id: `${Date.now()}`, name, qty: 1, unit: "" }
    ])
    setSearch("")
    setShowDropdown(false)
  }

  const updateQty = (id: string, qty: number) =>
    setLines(l => l.map(i => i.id === id ? { ...i, qty: Math.max(0, qty) } : i))

  const removeLine = (id: string) =>
    setLines(l => l.filter(i => i.id !== id))

  const generatePDF = () => {
    if (!user) return <AppLoader />
    
    const pdf = new jsPDF()
    let y = 20

    // Header
    pdf.setFontSize(10)
    pdf.text("BKTK INTERNATIONAL", 14, y)
    y += 6
    pdf.text("1 Avenue Louis Blériot, Local: A22", 14, y)
    y += 5
    pdf.text("La Courneuve, 93120 – France", 14, y)
    y += 5
    pdf.text("+33 9 77 37 61 67", 14, y)

    pdf.setFontSize(20)
    pdf.text("BON DE LIVRAISON", 190, 24, { align: "right" })

    pdf.setFontSize(10)
    pdf.text(`Date: ${today()}`, 190, 32, { align: "right" })

    pdf.setFontSize(10)
    pdf.text(`Livraison demandé: ${date}`, 190, 38, { align: "right" })

    pdf.setFontSize(10)
    pdf.text(`Signé par: ${user.emailAddresses}`, 190, 50, { align: "right" })
    pdf.setFontSize(6)
    pdf.text( `REF:${user.id.replace(/^user_/, "")}`, 238, 60, { align: "right", angle: 90 } );


    // Client
    y = 46
    pdf.setFontSize(10)
    pdf.text("Pour le site :", 14, y)
    const selected = localStorage.getItem(`selected-site-${user.id}`);
    const site = selected ? JSON.parse(selected) : null;

    const header = site ? getSiteHeader(site.slug) : null;

    if (header) {
      let y = 50;

      pdf.text(header.name, 14, y);
      y += 5;

      pdf.text(header.line1, 14, y);
      y += 5;

      pdf.text(header.line2, 14, y);
      y += 10;
    }

    // Table header
    y += 30
    pdf.setFillColor(40, 40, 40)
    pdf.rect(14, y, 182, 8, "F")

    pdf.setTextColor(255)
    pdf.text("#", 16, y + 5)
    pdf.text("Article & Description", 28, y + 5)
    pdf.text("Quantité", 180, y + 5, { align: "right" })

    pdf.setTextColor(0)
    y += 15

    // Rows
    lines.forEach((l, i) => {
      pdf.text(String(i + 1), 16, y)
      pdf.text(l.name, 28, y)
      pdf.text(l.unit, 28, y + 4)
      pdf.text(
        `${l.qty}`,
        180,
        y,
        { align: "right" }
      )
      y += 14
    }, [user])
    pdf.setLineWidth(0.1);
    pdf.roundedRect(10, 10, 190, 60, 4, 4); 


    pdf.save("bon-de-livraison.pdf")
  }

  return (
    <main className="min-h-screen p-6 bg-background text-foreground space-y-6">

      <div className="flex items-center gap-2 mb-4">
        <input
          type="date"
          value={date}
          min={tomorrow()}
          onChange={e => setDate(e.target.value)}
          className="border rounded-lg px-2 py-1"
        />
      </div>

      {/* SEARCH / ADD */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
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
          className="w-full pl-9 pr-3 py-2 border rounded-lg"
        />
        {showDropdown && search.length > 0 && (
          <ul className="absolute z-20 w-full bg-card border rounded-lg max-h-52 overflow-auto mt-1 shadow-lg">
            {filtered.length ? filtered.map((p, i) => (
              <li
                key={i}
                onClick={() => addProduct(p)}
                className="p-2 hover:bg-muted cursor-pointer"
              >
                {p.uniquename} ({p.typedequantite})
              </li>
            )) : (
              <li
                onClick={() => addNewProduct(search)}
                className="p-2 hover:bg-muted cursor-pointer font-medium text-blue-600"
              >
                Ajouter &quot;{search}&quot;
              </li>
            )}
          </ul>
        )}
      </div>

      {/* TABLE ONLY */}
      <section className="border rounded-xl bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted-foreground/20">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Produit</th>
              <th className="p-2 text-left">Quantité</th>
              <th className="p-2 text-left">Unit</th>
              <th className="p-2">Supprimer</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{l.name}</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(l.id, l.qty - 1)}
                      className="p-1 border rounded"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={l.qty}
                      onChange={e => updateQty(l.id, Number(e.target.value))}
                      className="w-16 text-center border rounded py-1"
                    />
                    <button
                      onClick={() => updateQty(l.id, l.qty + 1)}
                      className="p-1 border rounded"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </td>
                <td className="p-2">{l.unit}</td>
                <td className="p-2 text-center">
                  <button onClick={() => removeLine(l.id)} className="text-red-500">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ACTION */}
      <button
        onClick={generatePDF}
        disabled={!lines.length}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
      >
        Générer le PDF
      </button>
    </main>
  )
}

export default function HomePage() {
  const { user } = useUser();

  const [sites, setSites] = useState<Site[]>(FALLBACK_SITES);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [loadingSites, setLoadingSites] = useState(true);

  useEffect(() => {
    async function loadSites() {
      try {
        const res = await fetch("/api/sites");
        if (!res.ok) throw new Error("Failed to fetch sites");

        const data: Site[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSites(data);
        } else {
          setSites(FALLBACK_SITES);
        }
      } catch {
        setSites(FALLBACK_SITES);
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
            <div className="h-7 w-7 rounded-xl bg-linear-to-tr from-primary/80 to-primary/40 shadow-sm" />

            <SignedOut>
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
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">
                  BKTK INTL.
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground transition">
                      {selectedSite
                        ? selectedSite.name
                        : loadingSites
                        ? "Chargement…"
                        : "Choisir un site ▾"}
                    </button>
                  </DropdownMenuTrigger>

                  {!loadingSites && (
                    <DropdownMenuContent className="w-48 backdrop-blur-md bg-popover/90 p-1">
                      {sites.map((site) => (
                        <button
                          key={site.slug}
                          onClick={() => selectSite(site)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 rounded-md"
                        >
                          {site.name}
                        </button>
                      ))}
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
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
            </SignedOut>

            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{ elements: { avatarBox: "h-8 w-8" } }}
              />
            </SignedIn>

            <ModeToggle />
          </div>
        </div>
      </header>
    );
  }

  // --------------------------------------------------
  //  DASHBOARD
  // --------------------------------------------------

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
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {selectedSite.name}
        </h1>
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
