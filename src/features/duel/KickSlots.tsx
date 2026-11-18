import { cn } from "@/lib/utils";

/** خانات ركلات الجزاء: هدف أو خارج أو لم تُنفَّذ بعد. */
export function KickSlots({ kicks, slots = 5 }: { kicks: boolean[]; slots?: number }) {
  const count = Math.max(slots, kicks.length);
  return (
    <div className="mt-2 flex justify-center gap-1.5" aria-label="ركلات الجزاء">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "grid size-6 place-items-center rounded-full border text-xs",
            kicks[i] === true && "border-success bg-success/20 text-success",
            kicks[i] === false && "border-destructive bg-destructive/20 text-destructive",
            kicks[i] === undefined && "border-border text-muted-foreground",
          )}
        >
          {kicks[i] === true ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : kicks[i] === false ? (
            "×"
          ) : null}
        </span>
      ))}
    </div>
  );
}
