import { ClipboardList, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocKind } from "@/types/delivery";

export type KindBadgeProps = {
  kind: DocKind;
  /** Short label ("BL" / "Stock") for dense lists. */
  compact?: boolean;
  className?: string;
};

/** Document type badge: red outline for bons de livraison, blue outline for états des stocks. Server-safe. */
export function KindBadge({ kind, compact = false, className }: KindBadgeProps) {
  const bl = kind === "bl";
  const Icon = bl ? Truck : ClipboardList;
  const label = bl ? (compact ? "BL" : "Bon de livraison") : compact ? "Stock" : "État des stocks";
  return (
    <Badge
      variant="outline"
      title={compact ? (bl ? "Bon de livraison" : "État des stocks") : undefined}
      className={cn(
        "gap-1.5",
        bl
          ? "border-primary/30 bg-primary/5 text-primary dark:bg-primary/15 dark:text-foreground"
          : "border-info/30 bg-info/5 text-info dark:bg-info/10",
        className,
      )}
    >
      <Icon aria-hidden className={bl ? "text-primary" : undefined} />
      {label}
    </Badge>
  );
}
