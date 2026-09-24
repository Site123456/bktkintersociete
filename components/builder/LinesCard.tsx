"use client";

import { useId, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { LineRow } from "@/components/app/LineRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuilderLine } from "./lines";
import type { LineList } from "./use-line-list";

export type LinesCardProps = {
  title: string;
  lines: BuilderLine[];
  list: LineList;
  /** Shown instead of the card when there is no line. */
  empty: ReactNode;
  /** Extra content under the title (e.g. an explanation). */
  intro?: ReactNode;
  /** Extra content under the lines. */
  footer?: ReactNode;
  clear: { title: string; description: string; onConfirm: () => void };
  /** Lines at 0 get a muted background (inventaire). */
  muteZero?: boolean;
};

/** "Vider" button with a confirmation. */
function ClearButton({ title, description, onConfirm }: LinesCardProps["clear"]) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="h-11 gap-1.5 px-3 text-muted-foreground hover:text-destructive sm:h-8">
          <Trash2 className="size-4" aria-hidden />
          Vider
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 sm:h-9">Annuler</AlertDialogCancel>
          <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }), "h-11 sm:h-9")} onClick={onConfirm}>
            Vider
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The list of lines being edited, in a card, with the "Vider" action. */
export function LinesCard({ title, lines, list, empty, intro, footer, clear, muteZero = false }: LinesCardProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <p className="sr-only" aria-live="polite">
        {list.status}
      </p>
      {lines.length === 0 ? (
        <>
          <h2 id={headingId} className="sr-only">
            {title}
          </h2>
          {empty}
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b py-1 pr-1.5 pl-4">
            <h2 id={headingId} className="text-sm font-semibold">
              {title} <span className="tabular font-normal text-muted-foreground">({lines.length})</span>
            </h2>
            <ClearButton {...clear} />
          </div>
          {intro}
          <ol ref={list.listRef} className="divide-y">
            {lines.map((line, i) => (
              <LineRow
                key={line.id}
                index={i}
                line={line}
                onQty={(n) => list.setQty(line.id, n)}
                onRemove={() => list.remove(line.id)}
                onUnitChange={(u) => list.setUnit(line.id, u)}
                onNameChange={(n) => list.setName(line.id, n)}
                className={cn(
                  "scroll-mt-24 scroll-mb-32 transition-colors duration-700 lg:scroll-mb-6",
                  muteZero && !(line.qty > 0) && "bg-muted/50",
                  list.flashId === line.id && "bg-accent duration-150",
                )}
              />
            ))}
          </ol>
          {footer}
        </div>
      )}
    </section>
  );
}
