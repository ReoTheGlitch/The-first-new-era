import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { lessonQuery } from "@/features/student/queries";
import { Card, MathTex, PageHeader, StatusBadge } from "@/components/common";
import { AppIcon } from "@/components/icons/AppIcon";
import { LessonLab } from "@/components/labs/LessonLab";

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
  if (!l) return null;
  const blocks = (Array.isArray(l.body) ? l.body : []) as Block[];
  const subject = l.units?.courses?.subjects;
  return (
    <div className="mx-auto max-w-4xl">
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
                <LessonLab key={i} id={b.lab} />
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
          <h2 className="text-sm font-medium text-muted-foreground">
            المفاهيم — اختر مفهومًا للتدريب عليه
          </h2>
          {[...l.concepts]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((c) => (
              <Card key={c.id} className="p-4">
                <p className="font-medium">{c.title_ar}</p>
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
        </aside>
      </div>
    </div>
  );
}
