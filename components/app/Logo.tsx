import Image from "next/image";
import { cn } from "@/lib/utils";

export type LogoProps = {
  /** sm = 32px (header), md = 40px (documents). */
  size?: "sm" | "md";
  /** true: always show the wordmark; "sm": only from 640px (screen readers always get it); false: mark only. */
  showText?: boolean | "sm";
  /** Alternative text of the image; defaults to "" when the wordmark is shown (it already names the company). */
  alt?: string;
  className?: string;
};

const PX = { sm: 32, md: 40 } as const;

/** BKTK logo mark + "BKTK International" wordmark. Server-safe (no hooks). */
export function Logo({ size = "sm", showText = true, alt, className }: LogoProps) {
  const px = PX[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo.jpg"
        alt={alt ?? (showText ? "" : "BKTK International")}
        width={px}
        height={px}
        loading="eager"
        className="shrink-0 rounded-md"
        style={{ width: px, height: px }}
      />
      {showText && (
        <span className={cn("flex flex-col leading-none", showText === "sm" && "sr-only sm:not-sr-only")}>
          <span className={cn("font-semibold tracking-tight text-foreground", size === "md" ? "text-lg" : "text-base")}>BKTK</span>
          <span className="mt-0.5 text-xs text-muted-foreground">International</span>
        </span>
      )}
    </span>
  );
}
