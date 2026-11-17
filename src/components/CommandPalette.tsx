import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppIcon, type AppIconName } from "@/components/icons/AppIcon";

type NavEntry = { label: string; icon: AppIconName; href: string };

const QUICK_NAV: NavEntry[] = [
  { label: "لوحة التحكم", icon: "home", href: "/app" },
  { label: "المساعد الذكي", icon: "assistant", href: "/app/assistant" },
  { label: "الامتحانات", icon: "exams", href: "/app/exams" },
  { label: "المتصدرون", icon: "competition", href: "/app/competition" },
  { label: "دفتر الأخطاء", icon: "mistakes", href: "/app/mistakes" },
  { label: "ملفي الشخصي", icon: "profile", href: "/app/profile" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? QUICK_NAV.filter((n) => n.label.includes(query.trim()))
    : QUICK_NAV;

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function go(href: string) {
    close();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void navigate({ to: href as any });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) go(item.href);
    } else if (e.key === "Escape") {
      close();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24"
      style={{ background: "oklch(0 0 0 / 0.5)" }}
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-md border border-border bg-popover/95 shadow-md backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            <path
              d="M20 20l-3-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ابحث عن درس أو مفهوم..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="بحث سريع"
          />
          <kbd className="hidden rounded-xs border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <ul role="listbox" aria-label="نتائج البحث" className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</li>
          )}
          {filtered.map((item, i) => (
            <li key={item.href} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                  i === active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60"
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item.href)}
              >
                <AppIcon name={item.icon} size={20} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            <kbd className="rounded-xs border border-border px-1 py-0.5">↑</kbd>
            <kbd className="ms-1 rounded-xs border border-border px-1 py-0.5">↓</kbd>
            {" للتنقل · "}
            <kbd className="rounded-xs border border-border px-1 py-0.5">Enter</kbd>
            {" للانتقال"}
          </span>
          <span>
            <kbd className="rounded-xs border border-border px-1 py-0.5">Ctrl</kbd>{" "}
            <kbd className="rounded-xs border border-border px-1 py-0.5">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
