import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/app/Logo";

export type StatusScreenProps = {
  icon: LucideIcon;
  /** Small line above the title, e.g. "Erreur 404". */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Buttons (the first one is the main action). */
  actions?: ReactNode;
  /** Extra line under the actions (e.g. an error reference). */
  footer?: ReactNode;
};

/** Full-page message (404, errors) with the logo. Server- and client-safe (no hooks). */
export function StatusScreen({ icon: Icon, eyebrow, title, description, actions, footer }: StatusScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="no-print border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
          <Link href="/" aria-label="BKTK International, accueil" className="rounded-md">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-6" aria-hidden />
          </div>
          {eyebrow ? <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{eyebrow}</p> : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {description ? <div className="mt-2 text-sm text-balance text-muted-foreground">{description}</div> : null}
          {actions ? <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-center">{actions}</div> : null}
          {footer ? <div className="mt-5 text-xs text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
