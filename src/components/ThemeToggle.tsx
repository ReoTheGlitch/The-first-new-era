import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

const CYCLE: Record<Theme, Theme> = { dark: "light", light: "system", system: "dark" };
const ICON: Record<Theme, string> = { dark: "🌙", light: "☀️", system: "🖥" };
const LABEL: Record<Theme, string> = {
  dark: "الوضع الليلي",
  light: "الوضع النهاري",
  system: "وضع النظام",
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
      title={LABEL[theme]}
      className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-muted/40 text-base hover:bg-muted"
    >
      {ICON[theme]}
    </button>
  );
}
