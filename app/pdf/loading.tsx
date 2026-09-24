import { PdfPageFrame, PdfPageSkeleton, pdfBackdropClass, pdfColumnClass } from "@/components/pdf/PdfSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Same bar and white page as the viewer, so nothing jumps when the document arrives. */
export default function Loading() {
  return (
    <div className={cn("flex min-h-dvh flex-col", pdfBackdropClass)} aria-busy="true">
      <p role="status" className="sr-only">
        Chargement du document…
      </p>
      <div className="sticky top-0 z-40 border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-2 px-1.5 sm:px-3">
          <Skeleton className="m-1 size-9 shrink-0 rounded-md sm:m-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36 max-w-full sm:w-64" />
            <Skeleton className="h-3 w-28 max-w-full sm:w-40" />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-md sm:w-28" />
          <Skeleton className="mr-1 size-9 shrink-0 rounded-md sm:mr-0 sm:w-32" />
        </div>
      </div>
      <div className={pdfColumnClass}>
        <PdfPageFrame>
          <PdfPageSkeleton />
        </PdfPageFrame>
      </div>
    </div>
  );
}
