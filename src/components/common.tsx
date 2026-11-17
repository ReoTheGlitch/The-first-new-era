import type { ReactNode } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import { AppIcon, type AppIconName } from "@/components/icons/AppIcon";

/** Soft neutral tile used behind icons (PageHeader, EmptyState). Solid, no glow. */
function IconTile({ icon, size }: { icon: AppIconName; size: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center bg-muted text-muted-foreground"
      style={{ width: size, height: size, borderRadius: "var(--radius-md)" }}
    >
      <AppIcon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string | undefined;
  icon?: AppIconName | undefined;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 animate-rise">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconTile icon={icon} size={36} />}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 line-clamp-1 text-sm text-balance text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions}
    </header>
  );
}

type Tone = "demo" | "soon" | "unverified" | "ai" | "verified" | "setup";
const toneText: Record<Tone, string> = {
  demo: "تجريبي",
  soon: "قريبًا",
  unverified: "قيد المراجعة",
  ai: "مساعد ذكي",
  verified: "معتمد",
  setup: "يحتاج إعداد",
};
const toneClass: Record<Tone, string> = {
  demo: "bg-warning/12 text-warning",
  soon: "bg-electric/12 text-electric",
  unverified: "bg-warning/12 text-warning",
  ai: "bg-violet/12 text-violet",
  verified: "bg-success/12 text-success",
  setup: "bg-destructive/12 text-destructive",
};
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tracking-wide uppercase",
        toneClass[tone],
        className,
      )}
    >
      {children ?? toneText[tone]}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("surface-card p-4", className)}>{children}</section>;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: AppIconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[280px] flex-col items-center gap-2 px-4 py-10 text-center">
      <IconTile icon={icon} size={48} />
      <h3 className="mt-2 text-base font-medium tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function MathTex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return block ? (
    <div
      dir="ltr"
      className="overflow-x-auto rounded-md bg-muted/60 px-4 py-3 text-center"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export function ProgressRing({
  value,
  size = 88,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const stroke = 2;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--muted-foreground)"
          strokeOpacity="0.25"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }}
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums">
        {label ?? `${Math.round(v * 100)}%`}
      </span>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="جاري التحميل..."
      className={cn("animate-skeleton rounded-md bg-muted", className)}
    />
  );
}
