"use client";

import { memo } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { formatDateFr } from "@/lib/format";
import { parisDay } from "@/components/history/format";
import { cn } from "@/lib/utils";
import type { SiteOption } from "@/types/delivery";
import { ADMIN_ROLES, ROLE_LABELS, isAdminRole, type AdminUser } from "./types";

/** Changes sent to PATCH /api/admin/users (site "" = no site). */
export type UserPatch = { verified?: boolean; site?: string; role?: AdminUser["role"] };

const NO_SITE = "__none__";

/** Columns of the desktop layout (the header row uses the same template). */
export const PERSON_GRID = "md:grid-cols-[minmax(0,1fr)_11rem_9rem_9rem]";

export const personLabel = (u: Pick<AdminUser, "name" | "email">) => u.name.trim() || u.email.split("@")[0] || "Sans nom";

function initials(u: Pick<AdminUser, "name" | "email">): string {
  const words = personLabel(u).split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export type PersonRowProps = {
  user: AdminUser;
  sites: SiteOption[];
  /** The signed-in admin: role and validation cannot be changed on this row. */
  isSelf: boolean;
  saving: boolean;
  onPatch: (user: AdminUser, patch: UserPatch) => void;
};

/**
 * One person: a card on phones, a table-like row from 768px (columns: person, site, role, access).
 * Every control is named with the person's name for screen readers.
 */
export const PersonRow = memo(function PersonRow({ user, sites, isSelf, saving, onPatch }: PersonRowProps) {
  const label = personLabel(user);
  const pending = !user.verified;
  const siteKnown = !user.site || sites.some((s) => s.slug === user.site);
  const since = user.createdAt ? formatDateFr(parisDay(user.createdAt)) : "";

  return (
    <li className={cn("grid gap-3 p-4 md:items-center md:gap-4 md:py-3", PERSON_GRID)}>
      {/* Person */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            pending ? "bg-warning/15 text-warning" : user.role === "admin" ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {initials(user)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{label}</span>
            {isSelf ? (
              <Badge variant="secondary" className="shrink-0">
                Vous
              </Badge>
            ) : null}
            {saving ? (
              <span className="flex shrink-0 items-center text-muted-foreground">
                <Spinner className="size-3.5" aria-hidden />
                <span className="sr-only">Enregistrement…</span>
              </span>
            ) : null}
          </p>
          <p className="truncate text-sm text-muted-foreground" title={user.email}>
            {user.email}
          </p>
          {since ? (
            <p className="text-xs text-muted-foreground">
              Inscription le{" "}
              <span className="tabular">{since}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Site + role: side by side on phones, own columns on larger screens */}
      <div className="grid grid-cols-2 gap-3 md:contents">
        <div className="min-w-0 space-y-1.5 md:space-y-0">
          <span className="block text-xs font-medium text-muted-foreground md:hidden" aria-hidden>
            Site
          </span>
          <Select
            value={user.site ?? NO_SITE}
            onValueChange={(v) => {
              const next = v === NO_SITE ? "" : v;
              if (next !== (user.site ?? "")) onPatch(user, { site: next });
            }}
          >
            <SelectTrigger
              aria-label={`Site de ${label}`}
              className={cn(
                "w-full bg-card data-[size=default]:h-11 md:data-[size=default]:h-9",
                !user.site && "text-muted-foreground",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-80">
              <SelectItem value={NO_SITE} className="min-h-11 sm:min-h-8">
                Aucun site
              </SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.slug} value={s.slug} className="min-h-11 sm:min-h-8">
                  {s.shortName}
                </SelectItem>
              ))}
              {!siteKnown && user.site ? (
                <SelectItem value={user.site} className="min-h-11 sm:min-h-8">
                  {user.site}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1.5 md:space-y-0">
          <span className="block text-xs font-medium text-muted-foreground md:hidden" aria-hidden>
            Rôle
          </span>
          <Select
            value={user.role}
            disabled={isSelf}
            onValueChange={(v) => {
              if (isAdminRole(v) && v !== user.role) onPatch(user, { role: v });
            }}
          >
            <SelectTrigger
              aria-label={`Rôle de ${label}`}
              title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle" : undefined}
              className="w-full bg-card data-[size=default]:h-11 md:data-[size=default]:h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {ADMIN_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="min-h-11 sm:min-h-8">
                  {r === "admin" ? <ShieldCheck className="text-info" aria-hidden /> : null}
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Access */}
      <div className="min-w-0">
        {pending ? (
          <Button className="h-11 w-full md:h-9" onClick={() => onPatch(user, { verified: true })} aria-label={`Valider ${label}`}>
            <Check aria-hidden />
            Valider
          </Button>
        ) : (
          <label
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md md:min-h-9",
              isSelf ? "cursor-not-allowed" : "cursor-pointer",
            )}
            title={isSelf ? "Vous ne pouvez pas retirer votre propre validation" : undefined}
          >
            <Switch
              checked={user.verified}
              disabled={isSelf}
              onCheckedChange={(checked) => onPatch(user, { verified: checked })}
              aria-label={`Validé : ${label}`}
            />
            <span className={cn("text-sm", isSelf && "text-muted-foreground")}>Validé</span>
          </label>
        )}
      </div>
    </li>
  );
});
