import LogoMark from "@/components/brand/LogoMark";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "The first";
export const BRAND_NAME_AR = "العصر الجديد الأول";

export { LogoMark };

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5 text-foreground", className)}>
      <LogoMark size={28} title={compact ? BRAND_NAME : undefined} className="shrink-0" />
      {!compact && (
        <span dir="ltr" className="truncate font-display text-sm font-semibold tracking-tight">
          {BRAND_NAME}
        </span>
      )}
    </span>
  );
}
