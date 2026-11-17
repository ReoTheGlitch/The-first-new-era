import logo from "@/assets/logo-glasses.png";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "The first";
export const BRAND_NAME_AR = "العصر الجديد الأول";

/** شعار النظارة، مقصوص من أيقونة التطبيق. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt={BRAND_NAME}
      width={406}
      height={186}
      className={cn("h-7 w-auto select-none drop-shadow-[0_0_14px_var(--violet)]", className)}
      draggable={false}
    />
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <LogoMark className="h-6 shrink-0 sm:h-7" />
      {!compact && (
        <span
          dir="ltr"
          className="truncate font-display text-sm font-semibold tracking-tight text-foreground"
        >
          {BRAND_NAME}
        </span>
      )}
    </span>
  );
}
