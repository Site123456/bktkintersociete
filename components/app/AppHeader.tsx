"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { FilePlus2, History, LogIn, Monitor, Moon, ShieldCheck, Sun, type LucideIcon } from "lucide-react";
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
import { Logo } from "./Logo";
import { SiteSwitcher } from "./SiteSwitcher";

export type NavKey = "new" | "history" | "admin";
export type AppRole = "employee" | "manager" | "admin";

export type AppHeaderProps = {
  /** Current section (highlighted in the nav). */
  active: NavKey | null;
  role?: AppRole;
  site?: SiteOption | null;
  /** When given (with onSiteChange), a site switcher is shown next to the logo. */
  sites?: SiteOption[];
  onSiteChange?: (slug: string) => void;
  /** false hides the section links (e.g. an account that is not validated yet cannot use them). */
  nav?: boolean;
};

const NAV: { key: NavKey; href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { key: "new", href: "/", label: "Nouveau", icon: FilePlus2 },
  { key: "history", href: "/deliveries", label: "Historique", icon: History },
  { key: "admin", href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

/** Light / dark / system theme menu. */
function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 text-muted-foreground sm:size-9" aria-label="Thème" title="Thème">
          <Sun className="size-5 dark:hidden" aria-hidden />
          <Moon className="hidden size-5 dark:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Thème</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light" className="min-h-11 sm:min-h-8">
            <Sun aria-hidden /> Clair
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="min-h-11 sm:min-h-8">
            <Moon aria-hidden /> Sombre
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="min-h-11 sm:min-h-8">
            <Monitor aria-hidden /> Système
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Sticky app header: logo, optional site switcher, nav (icons only under 640px), theme menu, Clerk user menu.
 * Fits a 360px wide screen. Pages should give their <main> the id "main" (skip link target).
 */
export function AppHeader({ active, role, site = null, sites, onSiteChange, nav = true }: AppHeaderProps) {
  const items = nav ? NAV.filter((n) => !n.adminOnly || role === "admin") : [];
  const showSwitcher = Boolean(sites && sites.length > 0 && onSiteChange);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg print:hidden">
      <a
        href="#main"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Aller au contenu
      </a>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-2 sm:gap-3 sm:px-6">
        {/* Under 640px the site name matters more than the logo: the logo is hidden when a site switcher is shown. */}
        <Link
          href="/"
          aria-label="BKTK International, accueil"
          className={cn("shrink-0 items-center rounded-md p-1 sm:flex sm:p-0", showSwitcher ? "hidden" : "flex")}
        >
          <Logo showText="sm" />
        </Link>

        {showSwitcher && sites && onSiteChange ? (
          <div className="flex min-w-0 flex-1 sm:flex-none">
            <SiteSwitcher site={site} sites={sites} onChange={onSiteChange} />
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center sm:gap-1">
          <nav aria-label="Navigation principale" className="flex items-center sm:gap-1">
            {items.map(({ key, href, label, icon: Icon }) => {
              const current = active === key;
              return (
                <Link
                  key={key}
                  href={href}
                  aria-label={label}
                  title={label}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex size-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                    "sm:h-9 sm:w-auto sm:px-3",
                    current
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className={cn("size-5 sm:size-4", current && "text-primary")} aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <ThemeMenu />

          <SignedIn>
            <div className="flex size-9 items-center justify-center">
              <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="redirect">
              <Button variant="outline" className="h-11 px-3 sm:h-9" aria-label="Se connecter">
                <LogIn aria-hidden />
                <span className="hidden sm:inline">Connexion</span>
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
