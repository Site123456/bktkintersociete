import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Loading screens shown while a page gets its data (route-level loading.tsx). They mirror the final
 * layout so nothing jumps when the content arrives. Server-safe, no Clerk, no data.
 */

type Variant = "builder" | "list" | "admin";

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
