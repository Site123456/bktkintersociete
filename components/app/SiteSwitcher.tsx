"use client";

import { Building2, Check, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SiteOption } from "@/types/delivery";

export type SiteSwitcherProps = {
  site: SiteOption | null;
  sites: SiteOption[];
  onChange: (slug: string) => void;
  disabled?: boolean;
  className?: string;
};

/** Compact site picker (dropdown) for headers and toolbars. */
export function SiteSwitcher({ site, sites, onChange, disabled, className }: SiteSwitcherProps) {
  const label = site ? `Site : ${site.shortName}. Changer de site` : "Choisir un site";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          aria-label={label}
          title={label}
          className={cn("h-11 max-w-full min-w-0 shrink justify-start gap-1.5 px-2.5 sm:h-9 sm:max-w-64", className)}
        >
          <Building2 className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
          <span className="min-w-0 truncate">{site?.shortName ?? "Choisir un site"}</span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-1rem)]">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Site</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={site?.slug ?? ""}
          onValueChange={(slug) => {
            if (slug !== site?.slug) onChange(slug);
          }}
        >
          {sites.map((s) => (
            <DropdownMenuRadioItem key={s.slug} value={s.slug} className="min-h-11 gap-3 sm:min-h-9">
              <span className="min-w-0 flex-1 truncate">{s.shortName}</span>
              <span className="tabular text-xs text-muted-foreground">{s.slug}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type SiteGridProps = {
  sites: SiteOption[];
  /** Slug of the selected site, if any. */
  value?: string | null;
  onSelect: (slug: string) => void;
  className?: string;
};

/** Big selectable site cards, for the first choice of a site. */
export function SiteGrid({ sites, value = null, onSelect, className }: SiteGridProps) {
  return (
    <div role="group" aria-label="Choix du site" className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {sites.map((s) => {
        const selected = s.slug === value;
        return (
          <button
            key={s.slug}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(s.slug)}
            className={cn(
              "flex min-h-11 flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
              "hover:border-foreground/20 hover:bg-accent/40",
              selected && "border-primary ring-1 ring-primary hover:border-primary",
            )}
          >
            <span className="flex w-full items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  selected ? "bg-primary text-primary-foreground" : "bg-brand text-brand-foreground",
                )}
                aria-hidden
              >
                {selected ? <Check className="size-5" /> : <Building2 className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.shortName}</span>
                <span className="block text-xs break-words text-muted-foreground">{s.name}</span>
              </span>
              <span className="tabular shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{s.slug}</span>
            </span>
            {s.line1 || s.line2 ? (
              <span className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {s.line1}
                  {s.line1 && s.line2 ? <br /> : null}
                  {s.line2}
                </span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
