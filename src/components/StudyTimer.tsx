import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Mode = "focus" | "short" | "long";
type Phase = "idle" | "running" | "paused" | "done";

const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS: Record<Mode, string> = {
  focus: "تركيز",
  short: "استراحة قصيرة",
  long: "استراحة طويلة",
};
const STORAGE_KEY = "study-timer";

type Stored = { mode: Mode; remaining: number; phase: Phase };

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    /* ignore */
  }
  return { mode: "focus", remaining: DURATIONS.focus, phase: "idle" };
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function StudyTimer() {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>(() => loadStored().mode);
  const [remaining, setRemaining] = useState<number>(() => loadStored().remaining);
  const [phase, setPhase] = useState<Phase>(() => loadStored().phase);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, remaining, phase }));
    } catch {
      /* ignore */
    }
  }, [mode, remaining, phase]);

  // Tick
  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setPhase("done");
            setFlash(true);
            setTimeout(() => {
              setFlash(false);
              setPhase("idle");
              setRemaining(DURATIONS[mode]);
            }, 2000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function changeMode(m: Mode) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode(m);
    setPhase("idle");
    setRemaining(DURATIONS[m]);
  }

  function start() {
    setPhase("running");
  }
  function pause() {
    setPhase("paused");
  }
  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("idle");
    setRemaining(DURATIONS[mode]);
  }

  const pct = ((DURATIONS[mode] - remaining) / DURATIONS[mode]) * 100;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="فتح مؤقت الدراسة"
        className={cn(
          "press fixed bottom-20 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-popover text-base shadow-md md:bottom-8",
          flash && "animate-in fade-in duration-1000 border-primary",
          phase === "running" && "border-primary/50 text-primary",
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-30 w-64 overflow-hidden rounded-md border border-border bg-popover shadow-md md:bottom-8",
        flash && "animate-in fade-in duration-1000 border-primary",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">مؤقت الدراسة</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="إغلاق"
          className="press h-6 w-6 rounded-lg text-sm text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-border">
        {(["focus", "short", "long"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => changeMode(m)}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-medium transition-colors",
              mode === m
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      {/* Countdown */}
      <div className="flex flex-col items-center gap-3 px-4 py-5">
        {/* Arc progress */}
        <div className="relative">
          <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/20"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000"
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-semibold tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {fmt(remaining)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {phase !== "running" ? (
            <button
              type="button"
              onClick={start}
              className="press rounded-md bg-brand px-5 py-1.5 text-xs font-medium text-primary-foreground"
            >
              ابدأ
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              className="press rounded-md border border-border px-5 py-1.5 text-xs font-medium"
            >
              إيقاف مؤقت
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="press rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            إعادة ضبط
          </button>
        </div>
      </div>
    </div>
  );
}
