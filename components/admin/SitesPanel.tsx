"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Building2, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { defaultSite } from "@/lib/sites";
import { cn } from "@/lib/utils";
import type { SiteOption } from "@/types/delivery";
import { AdminApiError, adminFetch, toastError } from "./api";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export type SitesPanelProps = {
  sites: SiteOption[];
  onSaved: (site: SiteOption) => void;
};

/** One card per site: short name and the address printed on the PDFs. */
export function SitesPanel({ sites, onSaved }: SitesPanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold">Adresses des sites</h2>
        <p className="text-sm text-muted-foreground">
          Le nom légal et l’adresse sont imprimés sur les bons de livraison et les états des stocks.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sites.map((s) => (
          <SiteCard key={s.slug} site={s} onSaved={onSaved} />
        ))}
      </div>
    </div>
  );
}

function SiteCard({ site, onSaved }: { site: SiteOption; onSaved: (site: SiteOption) => void }) {
  const id = useId();
  const builtIn = defaultSite(site.slug);
  const [shortName, setShortName] = useState(site.shortName);
  const [line1, setLine1] = useState(site.line1);
  const [line2, setLine2] = useState(site.line2);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty = clean(shortName) !== site.shortName || clean(line1) !== site.line1 || clean(line2) !== site.line2;
  // What the PDF will show: an empty line falls back to the original address of a built-in site.
  const preview = [clean(line1) || builtIn?.line1 || "", clean(line2) || builtIn?.line2 || ""].filter(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || saving) return;
    const name = clean(shortName);
    if (!name) {
      setError("Indiquez un nom court.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await adminFetch<{ ok: true; site: SiteOption }>("/api/admin/sites", {
        method: "PATCH",
        body: { slug: site.slug, shortName: name, line1: clean(line1), line2: clean(line2) },
      });
      onSaved(res.site);
      setShortName(res.site.shortName);
      setLine1(res.site.line1);
      setLine2(res.site.line2);
      toast.success("Site enregistré", { description: res.site.shortName });
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 400) setError(err.message);
      else toastError(err, "Site non enregistré");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setShortName(site.shortName);
    setLine1(site.line1);
    setLine2(site.line2);
    setError("");
  };

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="flex items-start gap-3 border-b p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground" aria-hidden>
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-title`} className="font-semibold break-words">
            {site.shortName}
          </h3>
          <p className="flex items-center gap-1.5 text-xs break-words text-muted-foreground">
            <Lock className="size-3 shrink-0" aria-hidden />
            <span>
              <span className="sr-only">Nom légal : </span>
              {site.name}
            </span>
          </p>
        </div>
        <span className="tabular shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{site.slug}</span>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-short`}>Nom court</Label>
          <Input
            id={`${id}-short`}
            value={shortName}
            onChange={(e) => {
              setShortName(e.target.value);
              if (error) setError("");
            }}
            maxLength={80}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-short-hint${error ? ` ${id}-error` : ""}`}
            className="h-11 sm:h-9"
          />
          <p id={`${id}-short-hint`} className="text-xs text-muted-foreground">
            Affiché dans l’application (choix du site, historique).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-line1`}>Adresse</Label>
          <Input
            id={`${id}-line1`}
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder={builtIn?.line1 || "Numéro et rue"}
            className="h-11 sm:h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-line2`}>Code postal, ville, pays</Label>
          <Input
            id={`${id}-line2`}
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder={builtIn?.line2 || "75000 Paris, France"}
            aria-describedby={builtIn ? `${id}-fallback` : undefined}
            className="h-11 sm:h-9"
          />
          {builtIn ? (
            <p id={`${id}-fallback`} className="text-xs text-muted-foreground">
              Une ligne laissée vide reprend l’adresse d’origine.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-dashed bg-muted/40 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="size-3.5" aria-hidden />
            Aperçu sur le PDF
          </p>
          <p className="text-sm leading-snug">
            <span className="block font-semibold">{site.name}</span>
            {preview.map((l, i) => (
              <span key={i} className="block text-muted-foreground">
                {l}
              </span>
            ))}
          </p>
        </div>

        {error ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3">
        <p className={cn("text-xs", dirty ? "text-warning" : "text-muted-foreground")} aria-live="polite">
          {dirty ? "Modifications non enregistrées" : "Enregistré"}
        </p>
        <div className="flex gap-2">
          {dirty ? (
            <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={reset} disabled={saving}>
              Annuler
            </Button>
          ) : null}
          <Button type="submit" variant={dirty ? "default" : "outline"} className="h-11 sm:h-9" disabled={!dirty || saving}>
            {saving ? <Spinner aria-hidden /> : null}
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  );
}
