"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Calendar, MapPin, FileText, Download, Eye, LogOut } from "lucide-react";

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
  setPreview: (preview: { id: string; title: string; date: string; ref: string; siteName?: string } | null) => void;
};

function PDFCard({ id, title, date, ref, siteName, setPreview }: PDFCardProps) {
  return (
    <div className="group glass rounded-2xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/30 flex items-center gap-4 bg-card cursor-pointer border border-border/60" onClick={() => setPreview({ id, title, date, ref, siteName })}>
      
      {/* Thumbnail */}
      <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-white shrink-0 border shadow-sm">
        <iframe
          src={`/api/pdf?id=${id}#page=1&zoom=20&toolbar=0&navpanes=0&scrollbar=0`}
          className="absolute inset-0 w-full h-[300px] border-none pointer-events-none scale-[0.4] origin-top-left opacity-90 group-hover:opacity-100 transition-opacity"
          title="Thumbnail"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
      </div>

      {/* Info Stack */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold tracking-tight text-foreground truncate">{title}</h3>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md whitespace-nowrap">{date}</span>
        </div>
        
        <div className="flex flex-col gap-0.5 mt-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <FileText size={12} className="text-primary/60"/> <span className="truncate">{ref}</span>
          </div>
          {siteName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium opacity-80">
              <MapPin size={12} className="text-primary/60"/> <span className="truncate">{siteName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions (Hover Reveal on desktop, fixed on mobile) */}
      <div className="flex flex-col gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
         <a
          href={`/pdf?id=${id}`}
          target="_blank"
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-8 bg-background border rounded-lg text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition flex items-center justify-center shadow-sm"
        >
          <Download size={14} />
        </a>
      </div>
    </div>
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
      <header className="relative w-full border-b bg-background">
         <div className="flex justify-between items-center px-4 sm:px-8 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Link href="/" className="h-10 w-10 flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition border hover:text-foreground">
                <ChevronLeft size={18} />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Historique des Livraisons</h1>
                <p className="text-xs text-muted-foreground font-medium hidden sm:block">Archive complète des commandes et stocks.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SignOutButton>
                <button className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-xl hover:bg-red-500/20 transition">
                  <LogOut size={14} /> <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </SignOutButton>
            </div>
         </div>
      </header>

      {/* FILTERS (STICKY) */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="max-w-7xl mx-auto py-4">
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-3 bg-muted/30 p-2 sm:p-2.5 rounded-2xl border">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition" size={16} />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Rechercher (réf, site, article…)"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none transition text-sm font-medium shadow-sm"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} pointerEvents="none" />
              <select
                value={selectedSite ?? ""}
                onChange={(e) => { const v = e.target.value; changeSite(v === "" ? null : (v as SiteSlug)); }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none transition text-sm font-medium shadow-sm appearance-none"
              >
                <option value="">Tous les sites</option>
                {sites.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} pointerEvents="none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => changeDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none transition text-sm font-medium shadow-sm"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-3 px-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{filtered.length} Résultat(s)</span>
          </div>
        </div>
      </div>

      {/* GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((d) => (
            <PDFCard
              key={d._id}
              id={d._id}
              title={`Document #${shortId(d._id)}`}
              date={new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              ref={d.ref}
              siteName={d.site?.name}
              setPreview={setPreview}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4"><Search className="text-muted-foreground opacity-50" size={32}/></div>
            <h3 className="font-bold text-lg text-foreground">Aucun document trouvé</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">Modifiez vos filtres de recherche ou sélectionnez une date antérieure.</p>
          </div>
        )}
      </main>

      <Sheet open={!!preview} onOpenChange={() => setPreview(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/50">
          {preview && (
            <>
              <SheetHeader className="p-6 border-b shrink-0 bg-card">
                <SheetTitle className="text-2xl">{preview.title}</SheetTitle>
                <SheetDescription className="font-medium bg-muted w-fit px-2 py-1 rounded-md mt-1 text-xs">{preview.date}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-hidden relative bg-muted/30">
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
