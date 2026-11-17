import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import React, { Suspense, useEffect, useState } from "react";
import { lessonQuery } from "@/features/student/queries";
import { Card, MathTex, PageHeader, SkeletonBlock, StatusBadge } from "@/components/common";
import { AppIcon } from "@/components/icons/AppIcon";
import { LessonNotes } from "@/components/LessonNotes";

const LessonLab = React.lazy(() =>
  import("@/components/labs/LessonLab").then((m) => ({ default: m.LessonLab })),
);

export const Route = createFileRoute("/_authenticated/app/lessons/$lessonId")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${(loaderData as { titleAr?: string } | undefined)?.titleAr ?? "الدرس"} — العصر الجديد الأول`,
      },
      { name: "description", content: "شرح الدرس ومفاهيمه والتدريب عليها." },
    ],
  }),
  loader: async ({ context, params }): Promise<{ titleAr: string }> => {
    const l = await context.queryClient.ensureQueryData(lessonQuery(params.lessonId));
    if (!l) throw notFound();
    return { titleAr: l.title_ar };
  },
  component: LessonPage,
});

type Block = {
  type: "text" | "formula" | "note" | "lab";
  text?: string;
  tex?: string;
  lab?: string;
};

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { data: l } = useSuspenseQuery(lessonQuery(lessonId));
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [checkedConcepts, setCheckedConcepts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`lesson_${lessonId}_concepts`);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setScrollProgress(total > 0 ? (scrolled / total) * 100 : 0);
      setShowBackToTop(scrolled > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleConcept(id: string) {
    setCheckedConcepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(`lesson_${lessonId}_concepts`, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (!l) return null;
  const blocks = (Array.isArray(l.body) ? l.body : []) as Block[];
  const subject = l.units?.courses?.subjects;
  const sortedConcepts = [...l.concepts].sort((a, b) => a.sort_order - b.sort_order);
  const checkedCount = sortedConcepts.filter((c) => checkedConcepts.has(c.id)).length;
  const allChecked = sortedConcepts.length > 0 && checkedCount === sortedConcepts.length;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Reading progress bar */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-violet-500 to-indigo-500 transition-transform duration-100"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
      />

      {subject && (
        <Link
          to="/app/subjects/$subjectSlug"
          params={{ subjectSlug: subject.slug }}
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          → {subject.name_ar} / {l.units?.title_ar}
        </Link>
      )}
      <PageHeader
        title={l.title_ar}
        subtitle={l.overview_ar ?? undefined}
        icon="lessons"
        actions={l.origin === "demo" ? <StatusBadge tone="demo" /> : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">أهداف الدرس</h2>
            <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {l.objectives_ar.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-4 leading-8">
            <h2 className="font-semibold">الشرح</h2>
            {blocks.map((b, i) =>
              b.type === "formula" && b.tex ? (
                <MathTex key={i} tex={b.tex} block />
              ) : b.type === "lab" && b.lab ? (
                <Suspense key={i} fallback={<SkeletonBlock className="h-80" />}>
                  <LessonLab id={b.lab} />
                </Suspense>
              ) : b.type === "note" ? (
                <p
                  key={i}
                  className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
                >
                  {b.text}
                </p>
              ) : (
                <p key={i}>{b.text}</p>
              ),
            )}
          </Card>
        </div>
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              المفاهيم — اختر مفهومًا للتدريب عليه
            </h2>
            {sortedConcepts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {checkedCount} / {sortedConcepts.length}
              </span>
            )}
          </div>

          {allChecked && (
            <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm font-medium text-green-400">
              أحسنت! أكملت جميع مفاهيم الدرس ✓
            </p>
          )}

          {sortedConcepts.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="mb-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  id={`concept-${c.id}`}
                  checked={checkedConcepts.has(c.id)}
                  onChange={() => toggleConcept(c.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-violet-500"
                />
                <label
                  htmlFor={`concept-${c.id}`}
                  className="cursor-pointer font-medium leading-tight"
                >
                  {c.title_ar}
                </label>
              </div>
              {c.formula_tex && (
                <div className="my-3">
                  <MathTex tex={c.formula_tex} block />
                </div>
              )}
              <p className="text-xs text-muted-foreground">{c.questions.length} أسئلة</p>
              <Link
                to="/app/practice/$conceptId"
                params={{ conceptId: c.id }}
                className="press mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <AppIcon name="practice" size={18} /> تدرّب على هذا المفهوم
              </Link>
            </Card>
          ))}

          <LessonNotes lessonId={lessonId} lessonTitle={l.title_ar} />
        </aside>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="العودة للأعلى"
          className="press fixed bottom-20 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-input bg-popover text-sm shadow-lg md:bottom-8"
        >
          ↑
        </button>
      )}
    </div>
  );
}
