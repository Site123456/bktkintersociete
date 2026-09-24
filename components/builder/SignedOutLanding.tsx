import Image from "next/image";
import { ClipboardList, FileText, Lock, Truck } from "lucide-react";
import { COMPANY } from "@/lib/sites";
import { SignInCta } from "./AuthButtons";

const FEATURES = [
  { icon: Truck, label: "Bons de livraison" },
  { icon: ClipboardList, label: "Inventaires mensuels" },
  { icon: FileText, label: "PDF prêts à imprimer" },
] as const;

/** Home page for visitors who are not signed in. Server component. */
export function SignedOutLanding() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <section className="rounded-xl border bg-card px-6 py-8 text-center shadow-sm sm:px-10 sm:py-10">
            <Image
              src="/logo.jpg"
              alt="BKTK International"
              width={64}
              height={64}
              priority
              className="mx-auto rounded-xl"
              style={{ width: 64, height: 64 }}
            />
            <p className="mt-5 text-xs font-medium tracking-wider text-muted-foreground uppercase">BKTK International</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">Bons de livraison BKTK</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-balance text-muted-foreground">
              Créez et suivez les bons de livraison et inventaires des restaurants Indian Nepali Swad.
            </p>

            <SignInCta className="mt-7 w-full" />

            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              Accès réservé au personnel
            </p>
          </section>

          <ul className="mt-6 grid grid-cols-3 gap-2 text-center" aria-label="Fonctionnalités">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-2 px-1 text-xs text-muted-foreground">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted" aria-hidden>
                  <Icon className="size-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </main>
      <footer className="px-4 pb-safe text-center text-xs text-muted-foreground">
        {COMPANY.name} · {COMPANY.line2}
      </footer>
    </div>
  );
}
