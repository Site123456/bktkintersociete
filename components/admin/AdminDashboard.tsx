"use client";

import { useState } from "react";
import { Building2, Package, Users } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SiteOption } from "@/types/delivery";
import { PeoplePanel } from "./PeoplePanel";
import { ProductsPanel } from "./ProductsPanel";
import { SitesPanel } from "./SitesPanel";
import { isAdminTab, type AdminProduct, type AdminTab, type AdminUser, type BuiltInProduct } from "./types";

export type AdminDashboardProps = {
  initialTab: AdminTab;
  users: AdminUser[];
  products: AdminProduct[];
  builtIn: BuiltInProduct[];
  sites: SiteOption[];
  /** Database id of the signed-in admin. */
  currentUserId: string;
};

const TRIGGER = "min-h-11 flex-1 gap-2 px-3 sm:min-h-8 sm:flex-none sm:px-4";
/** Panels stay mounted (filters and drafts are kept when switching tabs). */
const PANEL = "mt-4 data-[state=inactive]:hidden sm:mt-6";

/** Admin area: Personnel | Produits | Sites. The current tab is kept in the address (?tab=). */
export function AdminDashboard({ initialTab, users: initialUsers, products, builtIn, sites, currentUserId }: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [users, setUsers] = useState(initialUsers);
  const [siteList, setSiteList] = useState(sites);
  const pending = users.filter((u) => !u.verified).length;

  const changeTab = (value: string) => {
    if (!isAdminTab(value)) return;
    setTab(value);
    const url = new URL(window.location.href);
    if (value === "personnel") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Validez le personnel, gérez les produits et les adresses des sites." />

      <Tabs value={tab} onValueChange={changeTab} className="gap-0">
        <TabsList className="h-auto w-full p-1 sm:w-fit">
          <TabsTrigger value="personnel" className={TRIGGER}>
            <Users className="hidden sm:block" aria-hidden />
            Personnel
            {pending > 0 ? (
              <span className="tabular rounded-full bg-warning/15 px-1.5 text-xs font-semibold text-warning">
                {pending}
                <span className="sr-only"> en attente</span>
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="produits" className={TRIGGER}>
            <Package className="hidden sm:block" aria-hidden />
            Produits
          </TabsTrigger>
          <TabsTrigger value="sites" className={TRIGGER}>
            <Building2 className="hidden sm:block" aria-hidden />
            Sites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" forceMount className={PANEL}>
          <PeoplePanel users={users} setUsers={setUsers} sites={siteList} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="produits" forceMount className={PANEL}>
          <ProductsPanel initialProducts={products} builtIn={builtIn} />
        </TabsContent>
        <TabsContent value="sites" forceMount className={PANEL}>
          <SitesPanel
            sites={siteList}
            onSaved={(next) => setSiteList((list) => list.map((s) => (s.slug === next.slug ? next : s)))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
