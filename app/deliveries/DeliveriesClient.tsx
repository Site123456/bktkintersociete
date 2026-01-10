"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import PDFButton from "@/components/PDFButton";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export default function DeliveriesClient({
  deliveries,
  selectedSite,
  sites,
}: Props) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

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

  function changeSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`/deliveries?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    let list = deliveries;

    // Filter by site
    if (selectedSite) {
      list = list.filter((d) => d.site?.slug === selectedSite);
    }

    // Filter by date (show all deliveries AFTER selected date)
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      list = list.filter((d) => new Date(d.date) >= filterDate);
    }

    // Local search filter
    if (search) {
      const q = search.toLowerCase();

      list = list.filter((d) => {
        const inHeader =
          d.ref.toLowerCase().includes(q) ||
          d.signedBy.toLowerCase().includes(q) ||
          d.date.toLowerCase().includes(q);

        const inSite =
          d.site?.name.toLowerCase().includes(q) ||
          d.site?.slug.toLowerCase().includes(q);

        const inItems = d.items.some((item) =>
          item.name.toLowerCase().includes(q)
        );

        return inHeader || inSite || inItems;
      });
    }

    return list;
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

  /* THEME‑AWARE STYLES ------------------------------------------------ */

  const cardStyle =
    theme === "dark"
      ? "bg-white/5 border-white/10 backdrop-blur-xl shadow-xl"
      : "bg-white border-neutral-200 shadow-sm";
  const headerText =
    theme === "dark" ? "text-white" : "text-neutral-900";

  const subText =
    theme === "dark" ? "text-neutral-400" : "text-neutral-500";

  /* RENDER ------------------------------------------------------------ */

  return (
<div className="p-4 sm:p-8 space-y-8 transition-colors">

  {/* PAGE HEADER */}
  <header className="space-y-3">
    <h1 className={`text-2xl sm:text-4xl font-semibold tracking-tight ${headerText}`}>
      Livraisons
    </h1>

    <Link
      href="/"
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
    >
      <span className="rounded-md bg-primary/10 px-3 py-1.5 border border-primary/20">
        + Nouveau Devis
      </span>
    </Link>
  </header>

  {/* FILTER PANEL */}
  <div
    className={`
      flex flex-col gap-3 p-4 rounded-xl border
      ${
        theme === "dark"
          ? "bg-white/5 border-white/10"
          : "bg-neutral-50 border-neutral-200"
      }
    `}
  >
    {/* SEARCH BAR */}
    <input
      type="text"
      placeholder="Rechercher… (ref, signé, article, site)"
      value={search}
      onChange={(e) => changeSearch(e.target.value)}
      className={`
        px-4 py-2 rounded-lg border text-sm w-full transition
        ${
          theme === "dark"
            ? "bg-white/5 border-white/10 hover:bg-white/10"
            : "bg-background hover:bg-accent"
        }
      `}
    />

    {/* FILTER ROW */}
    <div className="flex flex-col sm:flex-row gap-3">

      {/* SITE FILTER */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`
              px-4 py-2 rounded-lg border text-sm font-medium transition
              flex items-center justify-between gap-1 w-full
              ${
                theme === "dark"
                  ? "bg-white/5 border-white/10 hover:bg-white/10"
                  : "bg-background hover:bg-accent"
              }
            `}
          >
            {selectedSite
              ? sites.find((s) => s.slug === selectedSite)?.name
              : "Tous les sites"}
            <span className="opacity-60">▾</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className={`
            w-56 p-1 rounded-xl shadow-xl backdrop-blur-md
            ${
              theme === "dark"
                ? "bg-black/60 border-white/10"
                : "bg-popover border-neutral-200"
            }
          `}
        >
          <button
            onClick={() => changeSite(null)}
            className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent/50"
          >
            Tous les sites
          </button>

          {sites.map((site) => (
            <button
              key={site.slug}
              onClick={() => changeSite(site.slug)}
              className={`
                block w-full text-left px-3 py-2 text-sm rounded-md transition
                ${
                  selectedSite === site.slug
                    ? "bg-primary text-white shadow-sm"
                    : "hover:bg-accent/50"
                }
              `}
            >
              {site.name}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DATE FILTER */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => changeDate(e.target.value)}
        className={`
          px-4 py-2 rounded-lg border text-sm w-full transition
          ${
            theme === "dark"
              ? "bg-white/5 border-white/10 hover:bg-white/10"
              : "bg-background hover:bg-accent"
          }
        `}
      />
    </div>
  </div>

  {/* RECAP */}
  <div
    className={`
      px-4 py-3 rounded-lg border text-sm flex items-center justify-between
      ${
        theme === "dark"
          ? "bg-white/5 border-white/10"
          : "bg-neutral-50 border-neutral-200"
      }
    `}
  >
    <span className={headerText}>
      {filtered.length} resultat(s)
    </span>

    {search && (
      <span className="text-xs opacity-70">
        Recherche: <strong>{search}</strong>
      </span>
    )}
  </div>

  {/* LIST */}
  <section className="space-y-4 sm:space-y-6">
    {filtered.map((d) => (
      <article
        key={d._id}
        className={`
          rounded-xl p-4 sm:p-6 border transition hover:shadow-md
          ${cardStyle}
        `}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1">
            <h2 className={`text-lg sm:text-xl font-medium ${headerText}`}>
              Livraison #{shortId(d._id)}
            </h2>
            <p className={`text-xs sm:text-sm ${subText}`}>{d.date}</p>
          </div>

          <PDFButton delivery={d} />
        </div>

        <div className={`mt-3 text-sm space-y-1 ${subText}`}>
          <p><strong>Demandé:</strong> {d.requestedDeliveryDate}</p>
          <p><strong>Signé par:</strong> {d.signedBy}</p>
          <p><strong>Ref:</strong> {d.ref}</p>
        </div>

        {d.site && (
          <div className={`mt-3 text-sm space-y-1 ${subText}`}>
            <p>
              <strong>Site:</strong> {d.site.name}{" "}
              <span className="opacity-60">({d.site.slug})</span>
            </p>
            <p>{d.site.line1}</p>
            <p>{d.site.line2}</p>
          </div>
        )}

        <div className="mt-3">
          <h3 className={`font-medium ${headerText}`}>Articles</h3>
          <ul className={`list-disc pl-5 text-sm ${subText}`}>
            {d.items.map((item, i) => (
              <li key={i}>
                {item.name} — {item.qty} {item.unit}
              </li>
            ))}
          </ul>
        </div>
      </article>
    ))}

    {filtered.length === 0 && (
      <p className={subText}>Aucun résultat.</p>
    )}
  </section>
</div>

);
}
