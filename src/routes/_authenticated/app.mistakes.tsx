import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, PageHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import { getMistakes } from "@/features/mistakes/mistakes.functions";

export const Route = createFileRoute("/_authenticated/app/mistakes")({
  head: () => ({
    meta: [
      { title: "دفتر الأخطاء — The first" },
      { name: "description", content: "أخطاؤك مصنّفة بأسبابها مع طريقة علاج كل خطأ." },
    ],
  }),
  component: MistakesPage,
});

function CelebrationIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-green-500" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" />
      <path
        d="M18 33l10 10 18-18"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MistakesPage() {
  const load = useServerFn(getMistakes);
  const query = useQuery({
    queryKey: ["mistakes"],
    queryFn: () => load(),
    refetchOnMount: "always",
  });

  const [subjectFilter, setSubjectFilter] = useState<"all" | "physics" | "chemistry">("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const items = query.data?.items ?? [];
  const kinds = [...new Set(items.map((i) => i.cause.kind))];

  const shown = items
    .filter((i) => !dismissed.has(i.questionId))
    .filter((i) => subjectFilter === "all" || i.subjectSlug === subjectFilter)
    .filter((i) => kindFilter === "all" || i.cause.kind === kindFilter)
    .sort((a, b) => {
      const cmp = a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0;
      return sortOrder === "desc" ? cmp : -cmp;
    });

  const totalOpen = items.filter((i) => !dismissed.has(i.questionId)).length;
  const subtitleText =
    totalOpen === 0 && query.data
      ? "لا أخطاء مفتوحة"
      : query.data
        ? `${totalOpen} خطأ مفتوح`
        : undefined;

  function dismiss(questionId: string) {
    setDismissed((prev) => new Set([...prev, questionId]));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="دفتر الأخطاء"
        subtitle={subtitleText ?? "الأسئلة التي أخطأت فيها، مصنّفة بسبب الخطأ."}
        icon="mistakes"
      />

      {query.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>}
      {query.isError && (
        <p className="text-sm text-destructive">تعذّر تحميل الدفتر. أعد تحديث الصفحة.</p>
      )}

      {query.data && (
        <>
          <div className="grid grid-cols-2 gap-3 text-center">
            <Card className="p-4">
              <p className="text-3xl font-semibold">{items.length}</p>
              <p className="text-xs text-muted-foreground">أخطاء تحتاج مراجعة</p>
            </Card>
            <Card className="p-4">
              <p className="text-3xl font-semibold">{query.data.resolved}</p>
              <p className="text-xs text-muted-foreground">أخطاء تم علاجها</p>
            </Card>
          </div>

          {items.length === 0 ? (
            <Card className="flex flex-col items-center gap-4 py-12 text-center">
              <CelebrationIcon />
              <div>
                <p className="text-lg font-semibold text-foreground">لا أخطاء مسجّلة</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Filters + sort */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">المادة:</span>
                  {(
                    [
                      { v: "all", l: "الكل" },
                      { v: "physics", l: "فيزياء" },
                      { v: "chemistry", l: "كيمياء" },
                    ] as const
                  ).map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setSubjectFilter(v)}
                      className={cn(
                        "press rounded-full border px-3 py-1 text-xs",
                        subjectFilter === v
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button
                    onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
                    className="press rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {sortOrder === "desc" ? "الأحدث أولاً ↓" : "الأقدم أولاً ↑"}
                  </button>
                </div>

                {kinds.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">السبب:</span>
                    {["all", ...kinds].map((k) => (
                      <button
                        key={k}
                        onClick={() => setKindFilter(k)}
                        className={cn(
                          "press rounded-full border px-3 py-1 text-xs",
                          kindFilter === k
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {k === "all" ? "الكل" : k}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {shown.length === 0 ? (
                <Card className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">لا نتائج للفلتر الحالي.</p>
                  <button
                    onClick={() => {
                      setSubjectFilter("all");
                      setKindFilter("all");
                    }}
                    className="mt-3 text-xs text-primary underline"
                  >
                    إزالة الفلاتر
                  </button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {shown.map((m) => (
                    <Card key={m.questionId} className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-primary">
                          {m.cause.kind}
                        </span>
                        {m.subjectName && (
                          <span className="rounded-full bg-muted/60 px-3 py-1 text-muted-foreground">
                            {m.subjectName}
                          </span>
                        )}
                        <span className="text-muted-foreground">{m.lessonTitle}</span>
                        {m.wrongCount > 1 && (
                          <span className="text-muted-foreground">
                            أخطأت فيه {m.wrongCount} مرات
                          </span>
                        )}
                        <div className="flex-1" />
                        <button
                          onClick={() => dismiss(m.questionId)}
                          className="press rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-green-500"
                        >
                          تم المراجعة
                        </button>
                      </div>
                      <p className="leading-8">{m.prompt}</p>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <p className="rounded-md border border-border px-3 py-2">
                          إجابتك:{" "}
                          <b dir="auto" className="text-destructive">
                            {m.chosenLabel ?? "لم تجب"}
                          </b>
                        </p>
                        <p className="rounded-md border border-border px-3 py-2">
                          الصحيحة:{" "}
                          <b dir="auto" className="text-success">
                            {m.correctLabel}
                          </b>
                        </p>
                      </div>
                      <p className="text-sm">{m.cause.text}</p>
                      {m.explanation && (
                        <p className="text-sm text-muted-foreground">{m.explanation}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm">
                        <Link
                          to="/app/practice/$conceptId"
                          params={{ conceptId: m.conceptId }}
                          className="press rounded-lg bg-brand px-4 py-2 font-medium text-primary-foreground"
                        >
                          تدرّب على المفهوم
                        </Link>
                        {m.lessonId && (
                          <Link
                            to="/app/lessons/$lessonId"
                            params={{ lessonId: m.lessonId }}
                            className="rounded-md border border-border px-4 py-2"
                          >
                            راجع الدرس
                          </Link>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
