"use client";

import { useId, useRef, type ReactNode, type RefObject } from "react";
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
import { LINE_SCROLL_MARGIN, SEARCH_ID } from "./BuilderLayout";
import type { BuilderLine } from "./lines";
import type { LineList } from "./use-line-list";

export type LinesCardProps = {
  title: string;
  lines: BuilderLine[];
  list: LineList;
  /** Ref of the <ol> (used to scroll to / focus a line). */
  listRef: RefObject<HTMLOListElement | null>;
  /** Shown instead of the list when there is no line. */
  empty: ReactNode;
  /** Extra content between the title and the lines (e.g. an explanation). */
  intro?: ReactNode;
  /** Extra content under the lines. */
  footer?: ReactNode;
  clear: { title: string; description: string; onConfirm: () => void };
  /**
   * Inventaire: 0 means "out of stock" and is kept. Lines at 0 are muted and marked "en rupture",
   * and the minus goes down to 0 before turning into a trash button.
   */
  muteZero?: boolean;
};

/** "Vider" button with a confirmation. */
function ClearButton({ title, description, onConfirm }: LinesCardProps["clear"]) {
  // Once emptied, the "Vider" button is gone: continue in the product search instead of losing focus.
  const confirmed = useRef(false);
  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (open) confirmed.current = false;
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="-mr-2 h-9 gap-1.5 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive pointer-coarse:h-11"
        >
          <Trash2 className="size-4" aria-hidden />
          Vider
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={(e) => {
          if (!confirmed.current) return;
          e.preventDefault();
          document.getElementById(SEARCH_ID)?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 sm:h-9">Annuler</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }), "h-11 sm:h-9")}
            onClick={() => {
              confirmed.current = true;
              onConfirm();
            }}
          >
            Vider
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The lines being edited: a title with the "Vider" action, then one compact row per product. */
export function LinesCard({ title, lines, list, listRef, empty, intro, footer, clear, muteZero = false }: LinesCardProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="min-w-0">
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
        <>
          <div className="flex min-h-9 items-center justify-between gap-3">
            <h2 id={headingId} className="text-sm font-semibold">
              {title}
              <span className="tabular ml-1.5 font-normal text-muted-foreground">{lines.length}</span>
            </h2>
            <ClearButton {...clear} />
          </div>
          {intro}
          <ol ref={listRef} className="mt-2 divide-y overflow-hidden rounded-xl border bg-card">
            {lines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                onQty={(n) => list.setQty(line.id, n)}
                onRemove={() => list.remove(line.id)}
                onUnitChange={(u) => list.setUnit(line.id, u)}
                onNameChange={(n) => list.setName(line.id, n)}
                removeAt={muteZero ? 0 : 1}
                zeroLabel={muteZero ? "en rupture" : "non envoyé"}
                inputClassName={LINE_SCROLL_MARGIN}
                className={cn(
                  LINE_SCROLL_MARGIN,
                  "duration-700",
                  list.flashId === line.id && "bg-accent duration-150",
                )}
              />
            ))}
          </ol>
          {footer}
        </>
      )}
    </section>
  );
}
