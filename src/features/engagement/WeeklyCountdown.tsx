import { useEffect, useState } from "react";

type Props = {
  /** ISO timestamp of the end of the current competition round (next Monday 00:00 Africa/Cairo). */
  endsAt: string;
  className?: string;
};

type Parts = { days: number; hours: number; minutes: number; expired: boolean };

function diff(target: number): Parts {
  const ms = target - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  return { days, hours, minutes: mins, expired: false };
}

/** Days/hours/minutes to the given instant. Ticks every 30s. */
export function WeeklyCountdown({ endsAt, className }: Props) {
  const target = new Date(endsAt).getTime();
  const [parts, setParts] = useState<Parts>(() => diff(target));

  useEffect(() => {
    setParts(diff(target));
    const id = setInterval(() => setParts(diff(target)), 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (parts.expired) {
    return (
      <p className={className}>
        <span className="text-sm text-muted-foreground">تُجدَّد المسابقة…</span>
      </p>
    );
  }

  return (
    <p className={className}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        المسابقة الحالية تنتهي خلال
      </span>
      <span className="mt-1 flex items-baseline gap-3 font-mono text-lg font-semibold tabular-nums">
        <Segment value={parts.days} label="يوم" />
        <Segment value={parts.hours} label="ساعة" />
        <Segment value={parts.minutes} label="دقيقة" />
      </span>
    </p>
  );
}

function Segment({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-foreground">{String(value).padStart(2, "0")}</span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </span>
  );
}
