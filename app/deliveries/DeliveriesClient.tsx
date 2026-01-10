"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import PDFButton from "@/components/PDFButton";
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

  /* CLIENT FILTER ----------------------------------------------------- */
  const filtered = useMemo(() => {
    if (!selectedSite) return deliveries;
    return deliveries.filter((d) => d.site?.slug === selectedSite);
  }, [deliveries, selectedSite]);

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

  const hoverStyle =
    theme === "dark"
      ? "hover:bg-white/10 hover:border-white/20"
      : "hover:shadow-md hover:border-neutral-300";

  const headerText =
    theme === "dark" ? "text-white" : "text-neutral-900";

  const subText =
    theme === "dark" ? "text-neutral-400" : "text-neutral-500";

  /* RENDER ------------------------------------------------------------ */

  return (
    <div className="p-10 space-y-10 transition-colors">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className={`text-4xl font-semibold tracking-tight ${headerText}`}>
            Bon de Livraison
          </h1>

          {selectedSite && (
            <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
              Filtré par site: {selectedSite}
            </span>
          )}
        </div>

        {/* SITE SELECTOR */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`
                px-4 py-2 rounded-lg border transition text-sm
                ${
                  theme === "dark"
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-background hover:bg-accent"
                }
              `}
            >
              {selectedSite
                ? sites.find((s) => s.slug === selectedSite)?.name
                : "Tous les sites"}{" "}
              ▾
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
      </div>

      {/* DELIVERY LIST */}
      <div className="space-y-6">
        {filtered.map((d) => (
          <div
            key={d._id}
            className={`
              rounded-xl p-6 border transition
              ${cardStyle} ${hoverStyle}
            `}
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className={`text-xl font-medium ${headerText}`}>
                  Livraison #{shortId(d._id)}
                </h2>
                <p className={`text-sm ${subText}`}>{d.date}</p>
              </div>

              <PDFButton delivery={d} />
            </div>

            <div className={`mt-4 text-sm space-y-1 ${subText}`}>
              <p><strong>Demandé:</strong> {d.requestedDeliveryDate}</p>
              <p><strong>Signé par:</strong> {d.signedBy}</p>
              <p><strong>Ref:</strong> {d.ref}</p>
            </div>

            {d.site && (
              <div className={`mt-4 text-sm space-y-1 ${subText}`}>
                <p>
                  <strong>Site:</strong> {d.site.name}{" "}
                  <span className="opacity-60">({d.site.slug})</span>
                </p>
                <p>{d.site.line1}</p>
                <p>{d.site.line2}</p>
              </div>
            )}

            <div className="mt-4">
              <h3 className={`font-medium ${headerText}`}>Articles</h3>
              <ul className={`list-disc pl-6 text-sm ${subText}`}>
                {d.items.map((item, i) => (
                  <li key={i}>
                    {item.name} — {item.qty} {item.unit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className={subText}>
            Aucun résultat pour <strong>{selectedSite}</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
