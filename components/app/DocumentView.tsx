import Image from "next/image";
import type { ReactNode } from "react";
import { COMPANY } from "@/lib/sites";
import { formatDateFr, formatDateLong, formatQty, formatUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryView } from "@/types/delivery";
import { Logo } from "./Logo";

export type DocumentViewProps = {
  doc: DeliveryView;
  /** QR code (data: URL) pointing to the online version, as on the PDF. */
  qrDataUrl?: string;
  className?: string;
};

/** Small uppercase caption, like the labels of the PDF. */
function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase", className)}>{children}</p>;
}

const plural = (n: number, word: string) => `${formatQty(n)} ${word}${Math.abs(n) > 1 ? "s" : ""}`;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * HTML version of a bon de livraison / état des stocks, same layout as the PDF: white page, no filled
 * blocks, labels over values, hairlines. Dates as JJ/MM/AAAA. Server-safe (no hooks).
 * Signatures only appear when printing.
 */
export function DocumentView({ doc, qrDataUrl, className }: DocumentViewProps) {
  const isStock = doc.kind === "stock";
  const title = isStock ? "État des stocks" : "Bon de livraison";
  const lines = doc.lines.filter((l) => l.name.trim());
  const totalQty = lines.reduce((s, l) => s + (Number.isFinite(l.qty) ? l.qty : 0), 0);
  const requested = !isStock && doc.requestedDate ? formatDateFr(doc.requestedDate) : "";
  const month = isStock && doc.date ? capitalize(formatDateLong(doc.date).replace(/^\S+\s+\d+\s+/, "")) : "";
  const signatures = isStock ? ["Inventaire réalisé par", "Vérifié par"] : ["Préparé par", "Livré par", "Reçu par (client)"];

  return (
    <article
      aria-label={`${title} ${doc.number}`}
      className={cn(
        "mx-auto w-full max-w-3xl rounded-2xl border bg-card p-5 text-card-foreground shadow-xs sm:p-10",
        "print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none",
        className,
      )}
    >
      {/* Letterhead */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Logo size="md" showText={false} alt="" />
          <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
            <p className="text-sm font-bold text-brand dark:text-foreground">{COMPANY.name}</p>
            <p>{COMPANY.line1}</p>
            <p>{COMPANY.line2}</p>
            <p>
              Tél. <span className="tabular">{COMPANY.phone}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          <div className="hidden text-right sm:block print:block">
            <h2 className="text-xl font-bold tracking-tight text-brand uppercase dark:text-foreground">{title}</h2>
            <p className="tabular mt-1 text-sm font-semibold">N° {doc.number}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Date : <span className="tabular">{formatDateFr(doc.date) || "—"}</span>
            </p>
          </div>
          {qrDataUrl ? (
            <figure className="flex flex-col items-center gap-1">
              {/* QR codes need a light background to scan, also in dark mode */}
              <div className="rounded-md bg-white p-1">
                <Image
                  src={qrDataUrl}
                  alt={`QR code de la version en ligne du document ${doc.number}`}
                  width={64}
                  height={64}
                  unoptimized
                  className="size-16"
                />
              </div>
              <figcaption className="text-[10px] text-muted-foreground">Version en ligne</figcaption>
            </figure>
          ) : null}
        </div>
      </header>

      {/* Title on phones */}
      <div className="mt-5 sm:hidden print:hidden">
        <h2 className="text-lg font-bold tracking-tight text-brand uppercase dark:text-foreground">{title}</h2>
        <p className="tabular text-sm font-semibold">
          N° {doc.number} <span className="font-normal text-muted-foreground">· {formatDateFr(doc.date) || "—"}</span>
        </p>
      </div>

      {/* Hairline with the red accent, as on the PDF */}
      <div className="relative mt-5 h-px bg-border sm:mt-6" aria-hidden>
        <div className="absolute top-0 left-0 h-0.5 w-12 -translate-y-1/4 bg-primary" />
      </div>

      {/* Recipient and details: labels over values, no boxes */}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-[1.7fr_1.2fr_1fr_1fr] print:grid-cols-[1.7fr_1.2fr_1fr_1fr]">
        <div className="col-span-2 min-w-0 sm:col-span-1 print:col-span-1">
          <dt>
            <Caption>
              {isStock ? "Site" : "Livrer à"}
              {doc.siteSlug ? <span className="tabular"> · {doc.siteSlug}</span> : null}
            </Caption>
          </dt>
          <dd className="mt-1.5">
            <p className="font-bold break-words">{doc.siteName}</p>
            {doc.siteAddress.length ? (
              doc.siteAddress.map((l, i) => (
                <p key={i} className="text-sm">
                  {l}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Adresse non renseignée</p>
            )}
          </dd>
        </div>

        {isStock ? (
          <div>
            <dt>
              <Caption>Mois</Caption>
            </dt>
            <dd className="mt-1.5">{month || "—"}</dd>
          </div>
        ) : (
          <div>
            <dt>
              <Caption className={requested ? "text-primary" : undefined}>Livraison demandée</Caption>
            </dt>
            <dd className="mt-1">
              <span className="tabular text-lg font-bold text-brand dark:text-foreground">{requested || "—"}</span>
              {requested ? <span className="block text-xs text-muted-foreground">{capitalize(formatDateLong(doc.requestedDate).split(" ")[0])}</span> : null}
            </dd>
          </div>
        )}

        <div className="min-w-0">
          <dt>
            <Caption>{isStock ? "Réalisé par" : "Émis par"}</Caption>
          </dt>
          <dd className="mt-1.5 break-words">{doc.author || "—"}</dd>
        </div>

        <div>
          <dt>
            <Caption>Articles</Caption>
          </dt>
          <dd className="mt-1.5">
            <span className="tabular">{plural(lines.length, "article")}</span>
            <span className="tabular block text-xs text-muted-foreground">{plural(totalQty, "unité")}</span>
          </dd>
        </div>
      </dl>

      {/* Lines */}
      <section className="mt-7" aria-label={isStock ? "Stock compté" : "Articles à livrer"}>
        {lines.length === 0 ? (
          <p className="border-t-2 border-brand/80 py-8 text-center text-sm text-muted-foreground dark:border-foreground/60">Aucun article</p>
        ) : (
          <table className="w-full border-t-2 border-brand/80 text-sm dark:border-foreground/60">
            <thead>
              <tr className="border-b text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                <th scope="col" className="w-9 py-2 pr-2 text-right font-semibold">
                  N°
                </th>
                <th scope="col" className="px-2 py-2 text-left font-semibold">
                  Désignation
                </th>
                <th scope="col" className="hidden px-2 py-2 text-left font-semibold sm:table-cell print:table-cell">
                  Conditionnement
                </th>
                <th scope="col" className="py-2 pl-2 text-right font-semibold whitespace-nowrap">
                  {isStock ? "Qté en stock" : "Qté cdée"}
                </th>
                {!isStock ? (
                  <>
                    <th scope="col" className="hidden w-24 px-2 py-2 text-center font-semibold print:table-cell">
                      Qté livrée
                    </th>
                    <th scope="col" className="hidden w-10 py-2 text-center font-semibold print:table-cell">
                      OK
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {lines.map((l, i) => (
                <tr key={i} className="break-inside-avoid">
                  <td className="tabular py-2.5 pr-2 text-right align-baseline text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2.5 align-baseline">
                    <span className="break-words">{l.name}</span>
                    <span className="block text-xs text-muted-foreground sm:hidden print:hidden">{formatUnit(l.unit) || "—"}</span>
                  </td>
                  <td className="hidden px-2 py-2.5 align-baseline text-muted-foreground sm:table-cell print:table-cell">
                    {formatUnit(l.unit) || "—"}
                  </td>
                  <td className="tabular py-2.5 pl-2 text-right align-baseline text-base font-semibold">{formatQty(l.qty)}</td>
                  {!isStock ? (
                    <>
                      <td className="hidden px-3 align-bottom print:table-cell">
                        <div className="mb-2 border-b border-border" />
                      </td>
                      <td className="hidden text-center align-middle print:table-cell">
                        <span className="inline-block size-3 border border-border" />
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand/80 font-semibold text-brand dark:border-foreground/60 dark:text-foreground">
                <td />
                <td className="px-2 py-2.5 text-xs tracking-[0.08em] uppercase">
                  Total <span className="font-normal tracking-normal text-muted-foreground normal-case sm:hidden print:hidden">· {plural(lines.length, "article")}</span>
                </td>
                <td className="hidden px-2 py-2.5 font-normal text-muted-foreground sm:table-cell print:table-cell">{plural(lines.length, "article")}</td>
                <td className="tabular py-2.5 pl-2 text-right text-base">{formatQty(totalQty)}</td>
                {!isStock ? <td colSpan={2} className="hidden print:table-cell" /> : null}
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      {doc.note ? (
        <section className="mt-6 break-inside-avoid">
          <Caption>Remarque</Caption>
          <p className="mt-1.5 text-sm whitespace-pre-line break-words">{doc.note}</p>
        </section>
      ) : null}

      {/* Signatures: paper only */}
      <section
        aria-label="Signatures"
        className={cn("mt-8 hidden gap-6 border-t pt-3 break-inside-avoid print:grid", isStock ? "grid-cols-3" : "grid-cols-4")}
      >
        {signatures.map((label) => (
          <div key={label} className="text-xs text-muted-foreground">
            <Caption>{label}</Caption>
            <p className="mt-3 border-b pb-1">Nom</p>
            <p className="mt-3 border-b pb-1">Date</p>
            <p className="mt-3 pb-4">Signature</p>
          </div>
        ))}
        <div className="text-xs text-muted-foreground">
          <Caption>{isStock ? "Observations" : "Réserves à la réception"}</Caption>
          {!isStock ? <p className="mt-1">Manquants, abîmés, non conformes</p> : null}
          <p className="mt-4 border-b pb-1" />
          <p className="mt-4 border-b pb-1" />
        </div>
      </section>
    </article>
  );
}
