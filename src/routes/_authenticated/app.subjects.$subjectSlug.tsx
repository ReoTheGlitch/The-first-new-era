import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { subjectQuery } from "@/features/student/queries";
import { Card, PageHeader, StatusBadge } from "@/components/common";

export const Route = createFileRoute("/_authenticated/app/subjects/$subjectSlug")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.nameAr ?? "المادة"} — العصر الجديد الأول`,
      },
      { name: "description", content: "وحدات ودروس المادة." },
    ],
  }),
  loader: async ({ context, params }) => {
    const s = await context.queryClient.ensureQueryData(subjectQuery(params.subjectSlug));
    if (!s) throw notFound();
    return { nameAr: s.name_ar };
  },
  component: SubjectPage,
});

function SubjectPage() {
  const { subjectSlug } = Route.useParams();
  const { data: s } = useSuspenseQuery(subjectQuery(subjectSlug));
  if (!s) return null;
  return (
    <div>
      <PageHeader
        title={s.name_ar}
        subtitle={s.description_ar ?? undefined}
        icon={s.slug === "physics" ? "physics" : "chemistry"}
      />
      {s.courses.map((c) => (
        <div key={c.id} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{c.title_ar}</h2>
            <span className="text-xs text-muted-foreground">العام الدراسي {c.academic_year}</span>
            <StatusBadge tone="unverified" />
          </div>
          <Card className="border-dashed text-sm text-muted-foreground">
            وحدات المنهج الرسمي لم تُضف بعد. سنضيفها فقط بعد التحقق من مصادر وزارة التربية والتعليم
            لعام 2026/2027. الوحدة أدناه للعرض التوضيحي فقط.
          </Card>
          {[...c.units]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((u) => (
              <Card key={u.id}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{u.title_ar}</h3>
                  {u.origin === "demo" && <StatusBadge tone="demo" />}
                </div>
                {u.summary_ar && (
                  <p className="mb-4 text-sm text-muted-foreground">{u.summary_ar}</p>
                )}
                <ul className="space-y-2">
                  {u.lessons.map((l) => (
                    <li key={l.id}>
                      <Link
                        to="/app/lessons/$lessonId"
                        params={{ lessonId: l.id }}
                        className="press flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-4 hover:bg-muted"
                      >
                        <span className="min-w-0 truncate">{l.title_ar}</span>
                        <span className="shrink-0 text-sm text-primary">افتح الدرس</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
        </div>
      ))}
    </div>
  );
}
