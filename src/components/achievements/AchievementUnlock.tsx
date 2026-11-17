import { useEffect, useState } from "react";

type Props = {
  titleAr: string;
  descriptionAr?: string | undefined;
  onDismiss: () => void;
};

export function AchievementUnlock({ titleAr, descriptionAr, onDismiss }: Props) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 3400);
    const dismissTimer = setTimeout(() => onDismiss(), 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="achievement-pop pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-8"
      style={{
        transition: fading ? "opacity 0.6s ease" : undefined,
        opacity: fading ? 0 : 1,
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-popover px-5 py-3.5 shadow-2xl">
        <span className="text-3xl" aria-hidden>
          ✦
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary">إنجاز جديد مفتوح!</p>
          <p className="font-semibold">{titleAr}</p>
          {descriptionAr && <p className="mt-0.5 text-xs text-muted-foreground">{descriptionAr}</p>}
        </div>
      </div>
    </div>
  );
}
