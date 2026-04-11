"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the real viewer and disable SSR to prevent DOMMatrix or Worker errors during server rendering.
const PdfViewerClient = dynamic(() => import("./PdfViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary w-8 h-8 mb-4" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chargement du PDF...</p>
    </div>
  ),
});

export default function PdfViewerNoSSR(props: any) {
  return <PdfViewerClient {...props} />;
}
