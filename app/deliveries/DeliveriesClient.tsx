"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Calendar, MapPin, FileText, Download, Eye, LogOut, Package, Filter, X, ExternalLink, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type SiteSlug = "BKTK01" | "BKTK02" | "BKTK03" | "BKTK04" | "BKTK05" | "BKTK06" | "BKTK07" | "BKTK08";

type Site = { slug: SiteSlug; name: string; line1: string; line2: string; };

type DeliveryItem = { name: string; qty: number; unit: string; };

type Delivery = {
  _id: string;
  date: string;
  requestedDeliveryDate: string;
  signedBy: string;
  ref: string;
  site: Site | null;
  items: DeliveryItem[];
};

type Props = {
  deliveries: Delivery[];
  selectedSite: SiteSlug | null;
  sites: Site[];
};

const shortId = (id: string) => `${id.slice(0, 2)}${id.slice(-4)}`;
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const scoreMatch = (text: string, q: string) => {
  if (!text) return 0;
  const t = normalize(text); const query = normalize(q);
  if (t === query) return 5;
  if (t.startsWith(query)) return 4;
  if (t.includes(query)) return 2;
  let score = 0;
  for (const c of query) if (t.includes(c)) score += 0.15;
  return score;
};

type PDFCardProps = {
  id: string;
  title: string;
  date: string;
  ref: string;
  siteName?: string;
  itemCount: number;
  index: number;
  setPreview: (preview: { id: string; title: string; date: string; ref: string; siteName?: string } | null) => void;
};

function PDFCard({ id, title, date, ref, siteName, itemCount, index, setPreview }: PDFCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileHover={{ y: -3 }}
      className="group bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl cursor-pointer overflow-hidden"
      onClick={() => setPreview({ id, title, date, ref, siteName })}
    >
      {/* Top accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
      
      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <FileText size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-foreground truncate">{title}</h3>
              <span className="text-xs font-semibold text-muted-foreground">{date}</span>
            </div>
          </div>
          
          {/* Download button */}
          <a
            href={`/pdf?id=${id}`}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="h-9 w-9 rounded-xl bg-background border border-border/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 shadow-sm"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Meta tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
            <FileText size={10} className="text-primary/50" />
            {ref.slice(0, 12)}
          </span>
          {siteName && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
              <MapPin size={10} className="text-primary/50" />
              {siteName}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
            <Package size={10} className="text-primary/50" />
            {itemCount} articles
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function DeliveriesClient({ deliveries, selectedSite, sites }: Props) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Protect on client side as a secondary measure (already protected on server)
  useEffect(() => {
    if (isLoaded && !user) router.push("/");
  }, [isLoaded, user, router]);

  const dateParam = searchParams.get("date");
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  const selectedDate = dateParam || yesterday;

  function changeDate(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (date) params.set("date", date); else params.delete("date");
    router.push(`/deliveries?${params.toString()}`);
  }

  const search = searchParams.get("q") || "";
  const [localSearch, setLocalSearch] = useState(search);
  const [preview, setPreview] = useState<{ id: string; title: string; date: string; ref: string; siteName?: string } | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function changeSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value); else params.delete("q");
    router.push(`/deliveries?${params.toString()}`);
  }

  useEffect(() => {
    const t = setTimeout(() => changeSearch(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  const filtered = useMemo(() => {
    const q = search.trim();
    const base = deliveries.filter((d) => {
      if (selectedSite && d.site?.slug !== selectedSite) return false;
      if (new Date(d.date) < new Date(selectedDate)) return false;
      return true;
    });

    if (!q) return base;

    return base.map((d) => {
      let score = 0;
      score += scoreMatch(d.ref, q) * 4;
      score += scoreMatch(d.signedBy, q) * 2;
      score += scoreMatch(d.site?.name ?? "", q) * 3;
      score += scoreMatch(d.site?.slug ?? "", q) * 3;
      d.items.forEach((i) => { score += scoreMatch(i.name, q); });
      return { d, score };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).map((r) => r.d);
  }, [deliveries, selectedSite, selectedDate, search]);

  function changeSite(slug: SiteSlug | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("site", slug); else params.delete("site");
    router.push(`/deliveries?${params.toString()}`);
  }

  if (!isLoaded || !user) return null; // Safe because of Server-Side checks

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* HEADER */}
      <header className="relative w-full border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
         <div className="flex justify-between items-center px-3 sm:px-8 h-12 sm:h-14 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <Link href="/" className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center bg-muted/30 hover:bg-muted text-muted-foreground rounded-lg sm:rounded-xl transition border border-border/30 hover:text-foreground">
                <ChevronLeft size={16} />
              </Link>
              <h1 className="text-sm sm:text-lg font-black tracking-tight">Historique</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold border transition ${showFilters ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/20 border-border/30 text-muted-foreground hover:text-foreground'}`}
              >
                <Filter size={14} />
                <span className="hidden sm:inline">Filtres</span>
              </button>
              
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center border border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition"
                  title="Basculer le thème"
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              )}

              <SignOutButton>
                <button className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition">
                  <LogOut size={14} /> <span className="hidden sm:inline">Quitter</span>
                </button>
              </SignOutButton>
            </div>
         </div>
      </header>

      {/* FILTERS */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-border/30 bg-card/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-3">
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition" size={16} />
                  <input
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Rechercher (réf, site, article…)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-background/80 focus:ring-2 focus:ring-primary/40 outline-none transition text-sm font-medium shadow-sm"
                  />
                  {localSearch && (
                    <button onClick={() => setLocalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} pointerEvents="none" />
                  <select
                    value={selectedSite ?? ""}
                    onChange={(e) => { const v = e.target.value; changeSite(v === "" ? null : (v as SiteSlug)); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-background/80 focus:ring-2 focus:ring-primary/40 outline-none transition text-sm font-medium shadow-sm appearance-none"
                  >
                    <option value="">Tous les sites</option>
                    {sites.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} pointerEvents="none" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => changeDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-background/80 focus:ring-2 focus:ring-primary/40 outline-none transition text-sm font-medium shadow-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-black px-1.5">{filtered.length}</span>
          Résultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((d, i) => (
            <PDFCard
              key={d._id}
              id={d._id}
              title={`Document #${shortId(d._id)}`}
              date={new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              ref={d.ref}
              siteName={d.site?.name}
              itemCount={d.items?.length || 0}
              index={i}
              setPreview={setPreview}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center mb-5">
              <Search className="text-muted-foreground/40" size={36}/>
            </div>
            <h3 className="font-black text-xl text-foreground mb-2">Aucun document trouvé</h3>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">Modifiez vos filtres de recherche ou sélectionnez une date antérieure.</p>
          </motion.div>
        )}
      </main>

      <Sheet open={!!preview} onOpenChange={() => setPreview(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/50">
          {preview && (
            <>
              <SheetHeader className="p-6 border-b shrink-0 bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText size={18} className="text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-black">{preview.title}</SheetTitle>
                    <SheetDescription className="font-semibold text-xs mt-0.5">{preview.date} {preview.siteName && `• ${preview.siteName}`}</SheetDescription>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <a
                    href={`/pdf?id=${preview.id}`}
                    target="_blank"
                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-sm"
                  >
                    <ExternalLink size={14} /> Ouvrir le PDF
                  </a>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-hidden relative bg-muted/20">
                 {/* Pointing to /api/pdf for raw iframe viewing within Sheet */}
                <iframe
                  src={`/api/pdf?id=${preview.id}#page=1&zoom=auto&toolbar=1&navpanes=1&scrollbar=1`}
                  className="absolute inset-0 w-full h-full border-none"
                ></iframe>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
