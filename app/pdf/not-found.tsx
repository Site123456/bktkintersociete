import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/history/StatusScreen";

export const metadata: Metadata = { title: "Document introuvable", robots: { index: false, follow: false } };

/** Unknown or malformed document link (e.g. a damaged QR code). */
export default function DocumentNotFound() {
  return (
    <StatusScreen
      icon={FileQuestion}
      eyebrow="Erreur 404"
      title="Document introuvable"
      description="Ce lien ne correspond à aucun document. Vérifiez l’adresse ou scannez à nouveau le QR code."
      actions={
        <Button asChild className="h-11 sm:h-9">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      }
    />
  );
}
