import type { ReactNode } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import { AppIcon, type AppIconName } from "@/components/icons/AppIcon";

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string | undefined;
  icon?: AppIconName;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 animate-rise">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <AppIcon name={icon} tile size={44} />}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </header>
  );
}

type Tone = "demo" | "soon" | "unverified" | "ai" | "verified" | "setup";
const toneText: Record<Tone, string> = {
  demo: "بيانات تجريبية",
  soon: "قريبًا",
  unverified: "في انتظار مصدر معتمد",
  ai: "مولَّد بالذكاء الاصطناعي — غير رسمي",
  verified: "محتوى معتمد",
  setup: "يحتاج إعداد",
};
const toneClass: Record<Tone, string> = {
  demo: "border-warning/30 bg-warning/10 text-warning",
  soon: "border-electric/30 bg-electric/10 text-electric",
  unverified: "border-warning/30 bg-warning/10 text-warning",
  ai: "border-violet/30 bg-violet/10 text-violet",
  verified: "border-success/30 bg-success/10 text-success",
  setup: "border-destructive/30 bg-destructive/10 text-destructive",
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
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children ?? toneText[tone]}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("surface-card p-5", className)}>{children}</section>;
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
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <AppIcon name={icon} tile size={56} className="animate-float" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function MathTex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return block ? (
    <div
      dir="ltr"
      className="overflow-x-auto rounded-xl bg-muted/60 px-4 py-3 text-center"
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
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="var(--violet)" />
            <stop offset="1" stopColor="var(--electric)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--muted)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out)" }}
        />
      </svg>
      <span className="absolute text-sm font-semibold">{label ?? `${Math.round(v * 100)}%`}</span>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="جاري التحميل..."
      className={cn("animate-pulse rounded-xl bg-muted", className)}
    />
  );
}
