"use client";

import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/history/StatusScreen";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Next.js 16: re-fetches the page from the server before rendering it again. */
  unstable_retry?: () => void;
};

/** Error boundary of every page. Shows no error details (only the server log reference). */
export default function ErrorPage({ error, reset, unstable_retry }: ErrorPageProps) {
  const retry = () => (unstable_retry ?? reset)();

  return (
    <StatusScreen
      icon={TriangleAlert}
      title="Une erreur est survenue"
      description="La page n’a pas pu s’afficher. Réessayez dans un instant ; si le problème continue, prévenez un responsable."
      actions={
        <>
          <Button type="button" className="h-11 sm:h-9" onClick={retry}>
            <RotateCw aria-hidden />
            Réessayer
          </Button>
          <Button asChild variant="outline" className="h-11 sm:h-9">
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        </>
      }
      footer={
        error.digest ? (
          <>
            Référence : <span className="tabular font-mono">{error.digest}</span>
          </>
        ) : null
      }
    />
  );
}
