"use client";

import { useCallback, useDeferredValue, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { SearchX, Users } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { matchesQuery } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SiteOption } from "@/types/delivery";
import { adminFetch, toastError } from "./api";
import { PERSON_GRID, PersonRow, personLabel, type UserPatch } from "./PersonRow";
import { SearchField } from "./SearchField";
import { ROLE_LABELS, type AdminUser } from "./types";

type Status = "all" | "pending" | "verified";
const ALL_SITES = "__all__";
const NO_SITE = "__none__";

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Fields of the local record changed by a patch (site "" → null). */
function localChanges(patch: UserPatch): Partial<AdminUser> {
  const out: Partial<AdminUser> = {};
  if (patch.verified !== undefined) out.verified = patch.verified;
  if (patch.role !== undefined) out.role = patch.role;
  if (patch.site !== undefined) out.site = patch.site || null;
  return out;
}

const byName = (a: AdminUser, b: AdminUser) => personLabel(a).localeCompare(personLabel(b), "fr", { sensitivity: "base" });
const newestFirst = (a: AdminUser, b: AdminUser) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

export type PeoplePanelProps = {
  users: AdminUser[];
  setUsers: Dispatch<SetStateAction<AdminUser[]>>;
  sites: SiteOption[];
  currentUserId: string;
};

/** Staff: validation, site and role. Changes show at once and are undone if the server refuses them. */
export function PeoplePanel({ users, setUsers, sites, currentUserId }: PeoplePanelProps) {
  const [query, setQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState(ALL_SITES);
  const [status, setStatus] = useState<Status>("all");
  const [saving, setSaving] = useState<Record<string, number>>({});
  const deferredQuery = useDeferredValue(query);

  const siteName = useCallback((slug: string | null) => (slug ? (sites.find((s) => s.slug === slug)?.shortName ?? slug) : "Aucun site"), [sites]);

  const patchUser = useCallback(
    async (user: AdminUser, patch: UserPatch) => {
      const changes = localChanges(patch);
      const keys = Object.keys(changes) as (keyof AdminUser)[];
      const label = personLabel(user);
      const mark = (d: number) =>
        setSaving((s) => {
          const n = (s[user._id] ?? 0) + d;
          const next = { ...s };
          if (n > 0) next[user._id] = n;
          else delete next[user._id];
          return next;
        });

      setUsers((list) => list.map((u) => (u._id === user._id ? { ...u, ...changes } : u)));
      mark(1);
      try {
        const res = await adminFetch<{ ok: true; user: AdminUser }>("/api/admin/users", {
          method: "PATCH",
          body: { id: user._id, ...patch },
        });
        // Keep only the saved fields: another change on this row may still be on its way.
        setUsers((list) =>
          list.map((u) => (u._id === user._id ? { ...u, ...Object.fromEntries(keys.map((k) => [k, res.user[k]])) } : u)),
        );
        if (patch.verified === true) {
          toast.success("Compte validé", { description: `${label} peut maintenant utiliser l’application.` });
        } else if (patch.verified === false) {
          toast("Accès retiré", {
            description: `${label} ne peut plus utiliser l’application.`,
            action: { label: "Annuler", onClick: () => void patchUser({ ...user, ...changes }, { verified: true }) },
          });
        } else if (patch.role !== undefined) {
          toast.success("Rôle modifié", { description: `${label} : ${ROLE_LABELS[patch.role]}` });
        } else if (patch.site !== undefined) {
          toast.success("Site modifié", { description: `${label} : ${siteName(patch.site || null)}` });
        }
      } catch (err) {
        // Undo, unless the value was changed again meanwhile.
        setUsers((list) =>
          list.map((u) => {
            if (u._id !== user._id) return u;
            const back: Partial<AdminUser> = {};
            for (const k of keys) if (u[k] === changes[k]) Object.assign(back, { [k]: user[k] });
            return { ...u, ...back };
          }),
        );
        toastError(err, `Modification non enregistrée pour ${label}`);
      } finally {
        mark(-1);
      }
    },
    [setUsers, siteName],
  );

  const counts = useMemo(() => {
    const pending = users.filter((u) => !u.verified).length;
    return { total: users.length, pending, verified: users.length - pending };
  }, [users]);

  const { pendingList, verifiedList } = useMemo(() => {
    const visible = users.filter(
      (u) =>
        (siteFilter === ALL_SITES || (siteFilter === NO_SITE ? !u.site : u.site === siteFilter)) &&
        matchesQuery(`${u.name} ${u.email}`, deferredQuery),
    );
    return {
      pendingList: status === "verified" ? [] : visible.filter((u) => !u.verified).sort(newestFirst),
      verifiedList: status === "pending" ? [] : visible.filter((u) => u.verified).sort(byName),
    };
  }, [users, siteFilter, status, deferredQuery]);

  const shown = pendingList.length + verifiedList.length;
  const filtered = Boolean(query.trim()) || siteFilter !== ALL_SITES || status !== "all";
  const clearFilters = () => {
    setQuery("");
    setSiteFilter(ALL_SITES);
    setStatus("all");
  };

  const statuses: { value: Status; label: string }[] = [
    { value: "all", label: "Tous" },
    { value: "pending", label: `En attente (${counts.pending})` },
    { value: "verified", label: "Validés" },
  ];

  const renderList = (list: AdminUser[], id: string, title: string, hint: string, tone: "pending" | "default") => (
    <section aria-labelledby={id} className="space-y-3">
      <div className="space-y-0.5">
        <h2 id={id} className="flex items-baseline gap-2 text-base font-semibold">
          {title}
          <span className="tabular text-sm font-normal text-muted-foreground">{list.length}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", tone === "pending" && "border-warning/40")}>
        <div
          aria-hidden
          className={cn(
            "hidden gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid",
            PERSON_GRID,
          )}
        >
          <span>Personne</span>
          <span>Site</span>
          <span>Rôle</span>
          <span>Accès</span>
        </div>
        <ul className="divide-y">
          {list.map((u) => (
            <PersonRow
              key={u._id}
              user={u}
              sites={sites}
              isSelf={u._id === currentUserId}
              saving={Boolean(saving[u._id])}
              onPatch={patchUser}
            />
          ))}
        </ul>
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      {/* Figures */}
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: counts.total, tone: "" },
          { label: "Validés", value: counts.verified, tone: "text-success" },
          { label: "En attente", value: counts.pending, tone: counts.pending > 0 ? "text-warning" : "" },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border bg-card p-3 shadow-sm sm:p-4",
              s.label === "En attente" && counts.pending > 0 && "border-warning/40",
            )}
          >
            <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{s.label}</dt>
            <dd className={cn("tabular mt-1 text-2xl font-semibold tracking-tight", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <section aria-label="Filtres du personnel" className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Nom ou e-mail…"
            label="Rechercher une personne par nom ou e-mail"
            className="lg:flex-1"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger
                aria-label="Filtrer par site"
                className="w-full bg-card data-[size=default]:h-11 sm:w-52 sm:data-[size=default]:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80">
                <SelectItem value={ALL_SITES} className="min-h-11 sm:min-h-8">
                  Tous les sites
                </SelectItem>
                <SelectItem value={NO_SITE} className="min-h-11 sm:min-h-8">
                  Sans site
                </SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.slug} value={s.slug} className="min-h-11 sm:min-h-8">
                    {s.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              variant="outline"
              aria-label="Statut"
              value={status}
              onValueChange={(v) => {
                if (v === "all" || v === "pending" || v === "verified") setStatus(v);
              }}
              className="w-full bg-card sm:w-fit"
            >
              {statuses.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value} className="tabular h-11 flex-auto px-3 sm:h-9 sm:flex-none">
                  {s.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {filtered ? `${plural(shown, "personne affichée", "personnes affichées")} sur ${counts.total}` : plural(counts.total, "personne", "personnes")}
        </p>
      </section>

      {/* Lists */}
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Personne pour l’instant"
          description="Les membres du personnel apparaissent ici après leur première connexion."
        />
      ) : shown === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucun résultat"
          description="Personne ne correspond à ces filtres."
          action={
            <Button variant="outline" className="h-11 sm:h-9" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {pendingList.length > 0
            ? renderList(
                pendingList,
                "people-pending",
                "En attente de validation",
                "Choisissez le site et le rôle, puis validez pour ouvrir l’accès.",
                "pending",
              )
            : null}
          {verifiedList.length > 0
            ? renderList(
                verifiedList,
                "people-verified",
                "Personnel validé",
                "Désactivez « Validé » pour retirer l’accès à l’application.",
                "default",
              )
            : null}
        </div>
      )}
    </div>
  );
}
