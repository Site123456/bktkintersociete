import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/history/StatusScreen";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <StatusScreen
      icon={Compass}
      eyebrow="Erreur 404"
      title="Page introuvable"
      description="Cette page n’existe pas ou a été déplacée."
      actions={
        <Button asChild className="h-11 sm:h-9">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      }
    />
  );
}
