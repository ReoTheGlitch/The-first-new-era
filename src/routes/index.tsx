import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <main className="relative z-10 w-full max-w-xl space-y-10 text-center">
        <Logo className="justify-center" />
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-semibold leading-snug sm:text-4xl">
            تعلم منهجك الدراسي بطريقة تفاعلية
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            منصة لطلاب الثانوية العامة في مصر.
          </p>
        </div>
        <Link
          to="/auth"
          className="press inline-block rounded-md bg-brand px-8 py-3 font-medium text-primary-foreground"
        >
          ابدأ الآن
        </Link>
      </main>
    </div>
  );
}
