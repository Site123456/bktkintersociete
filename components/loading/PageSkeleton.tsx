import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Loading screens shown while a page gets its data (route-level loading.tsx). They mirror the final
 * layout so nothing jumps when the content arrives. Server-safe, no Clerk, no data.
 */

type Variant = "builder" | "list" | "document" | "admin";

function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-40 border-b bg-background/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-2 sm:gap-3 sm:px-6">
        <Image src="/logo.jpg" alt="" width={32} height={32} className="shrink-0 rounded-md" style={{ width: 32, height: 32 }} priority />
        <Skeleton className="hidden h-4 w-20 sm:block" />
        <div className="ml-auto flex items-center gap-1">
          <Skeleton className="size-9 rounded-md sm:w-28" />
          <Skeleton className="size-9 rounded-md sm:w-28" />
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function TitleSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {action ? <Skeleton className="h-10 w-40 rounded-md" /> : null}
    </div>
  );
}

function Rows({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("divide-y rounded-xl border bg-card", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function Body({ variant }: { variant: Variant }) {
  if (variant === "builder") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <TitleSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2 overflow-hidden">
          {[140, 120, 160, 110].map((w, i) => (
            <Skeleton key={i} className="h-10 shrink-0 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <Rows count={4} />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }
  if (variant === "document") {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap justify-end gap-2">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="space-y-6 rounded-2xl border bg-card p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
            </div>
            <div className="hidden space-y-2 sm:block">
              <Skeleton className="ml-auto h-6 w-48" />
              <Skeleton className="ml-auto h-4 w-36" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b pb-3 last:border-0">
                <Skeleton className="h-3 w-5" />
                <Skeleton className="h-4 flex-1" style={{ maxWidth: `${40 + ((i * 13) % 40)}%` }} />
                <Skeleton className="ml-auto h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <TitleSkeleton action={variant === "list"} />
      <div className="flex gap-2 overflow-hidden">
        {[96, 150, 120].map((w, i) => (
          <Skeleton key={i} className="h-9 shrink-0 rounded-md" style={{ width: w }} />
        ))}
      </div>
      {variant === "admin" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : null}
      <Rows count={variant === "admin" ? 5 : 7} />
    </div>
  );
}

export function PageSkeleton({ variant, header = true }: { variant: Variant; header?: boolean }) {
  return (
    <div className="min-h-dvh bg-background" aria-busy="true">
      <p className="sr-only" role="status">
        Chargement…
      </p>
      {header ? <HeaderSkeleton /> : null}
      <Body variant={variant} />
    </div>
  );
}
