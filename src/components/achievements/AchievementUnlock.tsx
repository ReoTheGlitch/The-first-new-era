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
      <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-popover px-5 py-3.5 shadow-md">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-primary"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">إنجاز</p>
          <p className="font-semibold">{titleAr}</p>
          {descriptionAr && <p className="mt-0.5 text-xs text-muted-foreground">{descriptionAr}</p>}
        </div>
      </div>
    </div>
  );
}
