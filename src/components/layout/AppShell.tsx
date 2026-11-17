import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AppIcon } from "@/components/icons/AppIcon";
import { Logo } from "@/components/brand/Logo";
import { mobileNav, primaryNav, secondaryNav, type NavItem } from "@/config/navigation";
import { signOut } from "@/features/auth/auth.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/CommandPalette";
import { PageTransition } from "@/components/PageTransition";
import { StudyTimer } from "@/components/StudyTimer";
import { ThemeToggle } from "@/components/ThemeToggle";

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };
}

function NavLink({
  item,
  variant,
}: {
  item: NavItem;
  variant: "full" | "rail" | "bottom" | "sheet";
}) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact ?? false }}
      className={cn(
        "press group relative flex items-center rounded-md text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground",
        variant === "full" && "gap-3 px-3 py-2.5 text-sm",
        variant === "sheet" && "gap-3 px-3 py-3 text-base",
        variant === "rail" && "h-12 w-12 justify-center",
        variant === "bottom" &&
          "min-h-14 flex-1 flex-col justify-center gap-1 text-[11px] data-[status=active]:bg-transparent",
      )}
    >
      <span>
        <AppIcon name={item.icon} size={variant === "bottom" ? 22 : 22} />
      </span>
      {variant !== "rail" ? (
        <span className="truncate">{item.label}</span>
      ) : (
        <span className="sr-only">{item.label}</span>
      )}
      {variant === "bottom" && (
        <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand opacity-0 group-data-[status=active]:opacity-100" />
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const signOut = useSignOut();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <div className="ambient" aria-hidden />
      <div className="relative z-10 flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar p-4 backdrop-blur-xl xl:flex">
          <Link to="/app" className="mb-4 px-2 pt-2">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
              )
            }
            className="press mb-4 flex w-full items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              بحث سريع...
            </span>
            <span className="flex gap-1">
              <kbd className="rounded border border-border px-1 py-0.5 font-sans text-[10px]">
                ⌘
              </kbd>
              <kbd className="rounded border border-border px-1 py-0.5 font-sans text-[10px]">
                K
              </kbd>
            </span>
          </button>
          <nav className="flex flex-col gap-1" aria-label="التنقل الرئيسي">
            {primaryNav.map((i) => (
              <NavLink key={i.to} item={i} variant="full" />
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-4">
            {secondaryNav.map((i) => (
              <NavLink key={i.to} item={i} variant="full" />
            ))}
            <button
              onClick={signOut}
              className="press rounded-md px-3 py-2.5 text-start text-sm text-muted-foreground hover:bg-sidebar-accent/60"
            >
              تسجيل الخروج
            </button>
            <div className="flex items-center gap-2 px-2 pt-1">
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* Tablet rail */}
        <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col items-center gap-2 border-e border-sidebar-border bg-sidebar py-4 backdrop-blur-xl md:flex xl:hidden">
          <Link to="/app" className="mb-6" aria-label="الرئيسية">
            <Logo compact />
          </Link>
          {primaryNav.map((i) => (
            <NavLink key={i.to} item={i} variant="rail" />
          ))}
          <div className="mt-auto flex flex-col gap-2">
            {secondaryNav.map((i) => (
              <NavLink key={i.to} item={i} variant="rail" />
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phone top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:hidden">
            <Link to="/app">
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
                  )
                }
                aria-label="البحث السريع"
                className="press hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground sm:flex"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M20 20l-3-3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <kbd className="font-sans">⌘K</kbd>
              </button>
              <ThemeToggle />
              <Link
                to="/app/profile"
                aria-label="الملف الشخصي"
                className="press grid h-10 w-10 place-items-center rounded-md"
              >
                <AppIcon name="profile" size={22} />
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-10 lg:pt-10">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>

      {/* Phone bottom bar */}
      <nav
        aria-label="التنقل السفلي"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {mobileNav.map((i) => (
          <NavLink key={i.to} item={i} variant="bottom" />
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="press flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] text-sidebar-foreground/75"
        >
          <AppIcon name="more" size={22} />
          المزيد
        </button>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-lg border-border bg-popover">
          <SheetHeader>
            <SheetTitle className="text-start">المزيد</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-2 pb-6" onClick={() => setMoreOpen(false)}>
            <NavLink item={primaryNav[4]!} variant="sheet" />
            {secondaryNav.map((i) => (
              <NavLink key={i.to} item={i} variant="sheet" />
            ))}
            <button
              onClick={signOut}
              className="press rounded-md px-3 py-3 text-start text-base text-muted-foreground"
            >
              تسجيل الخروج
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <StudyTimer />
      <CommandPalette />
    </div>
  );
}
