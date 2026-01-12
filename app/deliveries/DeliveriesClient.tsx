"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button"

type SiteSlug =
  | "BKTK01"
  | "BKTK02"
  | "BKTK03"
  | "BKTK04"
  | "BKTK05"
  | "BKTK06"
  | "BKTK07"
  | "BKTK08";

type Site = {
  slug: SiteSlug;
  name: string;
  line1: string;
  line2: string;
};

type DeliveryItem = {
  name: string;
  qty: number;
  unit: string;
};

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

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function shortId(id: string) {
  return `${id.slice(0, 2)}${id.slice(-4)}`;
}
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const scoreMatch = (text: string, q: string) => {
  if (!text) return 0;
  const t = normalize(text);
  const query = normalize(q);

  if (t === query) return 5;
  if (t.startsWith(query)) return 4;
  if (t.includes(query)) return 2;

  let score = 0;
  for (const c of query) {
    if (t.includes(c)) score += 0.15;
  }
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

export function PDFCard({ id, title, date, ref, siteName, setPreview }: PDFCardProps) {
  return (
    <Card className="group overflow-hidden transition hover:shadow-lg cursor-pointer">
      {/* PDF Thumbnail */}
      <div className="relative w-full overflow-hidden rounded-lg border bg-muted shadow-sm aspect-[16/9]">
        <iframe
          src={`/pdf?id=${id}#page=1&zoom=80&toolbar=0&navpanes=0&scrollbar=0`}
          className="absolute inset-0 w-full h-full border-none pointer-events-none scale-[1.05] origin-top-left"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent pointer-events-none" />
        <span className="absolute top-2 left-2 bg-primary/90 text-white text-xs font-semibold px-2 py-0.5 rounded-md shadow">
          PDF
        </span>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{date}</CardDescription>
      </CardHeader>

      <CardContent className="text-sm space-y-1">
        <p><strong>Réf :</strong> {ref}</p>
        {siteName && <p className="text-muted-foreground truncate">{siteName}</p>}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 text-sm"
          onClick={() =>
            setPreview({ id, title, date, ref, siteName })
          }
        >
          Aperçu
        </Button>

        <a
          href={`/pdf?id=${id}`}
          target="_blank"
          className="flex-1 text-center text-sm px-3 py-1.5 rounded-md border border-primary text-primary hover:bg-primary/10 transition"
        >
          Télécharger
        </a>
      </CardFooter>
    </Card>
  );
}

export default function DeliveriesClient({
  deliveries,
  selectedSite,
  sites,
}: Props) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  /* AUTH CHECK -------------------------------------------------------- */
  useEffect(() => {
    if (isLoaded && !user) router.push("/");
  }, [isLoaded, user, router]);
      
  /* DATE FILTER ----------------------------------------------------- */
  const dateParam = searchParams.get("date");

  // Default = today (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  const selectedDate = dateParam || today;

  function changeDate(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (date) params.set("date", date);
    else params.delete("date");
    router.push(`/deliveries?${params.toString()}`);
  }
  const search = searchParams.get("q") || "";
  const [localSearch, setLocalSearch] = useState(search);
  const [preview, setPreview] = useState<{
    id: string;
    title: string;
    date: string;
    ref: string;
    siteName?: string;
  } | null>(null);
  const isSiteSlug = (value: string): value is SiteSlug =>
  ["BKTK01","BKTK02","BKTK03","BKTK04","BKTK05","BKTK06","BKTK07","BKTK08"].includes(value)


  function changeSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`/deliveries?${params.toString()}`);
  }
  useEffect(() => {
    const t = setTimeout(() => {
      changeSearch(localSearch);
    }, 300);
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

    return base
      .map((d) => {
        let score = 0;

        score += scoreMatch(d.ref, q) * 4;
        score += scoreMatch(d.signedBy, q) * 2;
        score += scoreMatch(d.site?.name ?? "", q) * 3;
        score += scoreMatch(d.site?.slug ?? "", q) * 3;

        d.items.forEach((i) => {
          score += scoreMatch(i.name, q);
        });

        return { d, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.d);
  }, [deliveries, selectedSite, selectedDate, search]);


  /* CHANGE FILTER ----------------------------------------------------- */
  function changeSite(slug: SiteSlug | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("site", slug);
    else params.delete("site");
    router.push(`/deliveries?${params.toString()}`);
  }

  /* LOADING STATE ----------------------------------------------------- */
  if (!isLoaded || !user) {
    return <div className="p-10 text-neutral-500">Vérification…</div>;
  }

  /* RENDER ------------------------------------------------------------ */

  return (
<div className="p-4 sm:p-8 space-y-6">

  {/* HEADER */}
  <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <h1 className="text-3xl sm:text-4xl font-semibold">
      Livraisons
    </h1>

    <Button asChild>
      <Link href="/">+ Nouveau devis</Link>
    </Button>
  </header>

  {/* FILTERS */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border p-4">
    <input
      value={localSearch}
      onChange={(e) => setLocalSearch(e.target.value)}
      placeholder="Rechercher (réf, site, article…)"
      className="h-10 rounded-md border bg-background px-3 text-sm"
    />

    {/* SITE FILTER (type-safe) */}
    <select
      value={selectedSite ?? ""}
      onChange={(e) => {
        const v = e.target.value
        changeSite(v === "" ? null : (v as SiteSlug))
      }}
      className="h-10 rounded-md border bg-background px-3 text-sm"
    >
      <option value="">Tous les sites</option>
      {sites.map(s => (
        <option key={s.slug} value={s.slug}>
          {s.name}
        </option>
      ))}
    </select>

    <input
      type="date"
      value={selectedDate}
      onChange={(e) => changeDate(e.target.value)}
      className="h-10 rounded-md border bg-background px-3 text-sm"
    />
  </div>

  {/* RECAP */}
  <div className="text-sm text-muted-foreground">
    {filtered.length} résultat(s)
  </div>
  <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {filtered.map((d) => (
      <PDFCard
        key={d._id}
        id={d._id}
        title={`Livraison #${shortId(d._id)}`}
        date={d.date}
        ref={d.ref}
        siteName={d.site?.name}
        setPreview={setPreview}
      />
    ))}
  </section>

  {/* EMPTY */}
  {filtered.length === 0 && (
    <p className="text-sm text-muted-foreground">
      Aucun résultat.
    </p>
  )}

  <Sheet open={!!preview} onOpenChange={() => setPreview(null)}>
    <SheetContent side="right" className="w-full sm:max-w-[520px] p-0">
      {preview && (
        <>
          <SheetHeader>
            <SheetTitle>{preview.title}</SheetTitle>
            <SheetDescription>{preview.date}</SheetDescription>
          </SheetHeader>

          <div className="px-2 space-y-2">
            <p><strong>Réf :</strong> {preview.ref}</p>
            {preview.siteName && <p><strong>Site :</strong> {preview.siteName}</p>}
          </div>

          <iframe
            src={`/pdf?id=${preview.id}`}
            className="w-full h-[calc(100vh-180px)]"
          />
        </>
      )}
    </SheetContent>
  </Sheet>
</div>

);
}
