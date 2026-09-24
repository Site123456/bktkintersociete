import Link from "next/link";
import { Clock, RefreshCw } from "lucide-react";
import { AppHeader, type AppRole } from "@/components/app/AppHeader";
import { Button } from "@/components/ui/button";
import { SignOutCta } from "./AuthButtons";

export type PendingApprovalProps = {
  /** E-mail of the signed-in person (from Clerk), shown so they know which account is waiting. */
  email: string;
  role?: AppRole;
};

/** Signed in but not validated by an admin yet. Server component. */
export function PendingApproval({ email, role }: PendingApprovalProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader active={null} role={role} nav={false} />
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <section aria-labelledby="pending-title" className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <span className="flex size-11 items-center justify-center rounded-full bg-warning/10 text-warning" aria-hidden>
            <Clock className="size-5" />
          </span>
          <h1 id="pending-title" className="mt-5 text-2xl font-semibold tracking-tight">
            Compte en attente de validation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Un administrateur doit valider votre compte avant que vous puissiez créer des bons de livraison et des inventaires.
            Prévenez votre responsable si besoin.
          </p>

          {email ? (
            <div className="mt-5 rounded-lg bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">Connecté avec</p>
              <p className="mt-0.5 text-sm font-medium break-all">{email}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <SignOutCta className="text-muted-foreground" />
            <Button asChild variant="outline" className="h-11 sm:h-9">
              <Link href="/" prefetch={false}>
                <RefreshCw aria-hidden />
                Vérifier à nouveau
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
