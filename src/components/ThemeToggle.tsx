import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

const CYCLE: Record<Theme, Theme> = { dark: "light", light: "system", system: "dark" };
const ICONS: Record<Theme, string> = {
  dark: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  light: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  system: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      const initial: Theme = saved === "light" || saved === "system" ? saved : "dark";
      setTheme(initial);
      applyTheme(initial);
    } catch {
      /* ignore */
    }
  }, []);

  function cycle() {
    const next = CYCLE[theme];
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label="تغيير المظهر"
      className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <span dangerouslySetInnerHTML={{ __html: ICONS[theme] }} />
    </button>
  );
}
