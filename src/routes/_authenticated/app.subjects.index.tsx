import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { subjectsQuery } from "@/features/student/queries";
import { AppIcon } from "@/components/icons/AppIcon";
import { PageHeader, StatusBadge } from "@/components/common";

export const Route = createFileRoute("/_authenticated/app/subjects/")({
  head: () => ({
    meta: [
      { title: "المواد الدراسية — The first" },
      { name: "description", content: "الفيزياء والكيمياء للصف الثالث الثانوي." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(subjectsQuery),
  component: Subjects,
});

const comingSoon = ["الأحياء", "اللغة العربية", "اللغة الإنجليزية"];

function Subjects() {
  const { data } = useSuspenseQuery(subjectsQuery);
  return (
    <div>
      <PageHeader
        title="المواد الدراسية"
        subtitle="منهج 2026/2027 — المحتوى الرسمي في انتظار التحقق من مصادر الوزارة."
        icon="lessons"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((s) => (
          <Link
            key={s.id}
            to="/app/subjects/$subjectSlug"
            params={{ subjectSlug: s.slug }}
            className="press surface-card flex items-start gap-4 p-6 hover:glow-edge animate-rise"
          >
            <AppIcon name={s.slug === "physics" ? "physics" : "chemistry"} tile size={60} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{s.name_ar}</h2>
                <StatusBadge tone="unverified" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.description_ar}</p>
            </div>
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-10 text-sm font-medium text-muted-foreground">مواد قادمة</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {comingSoon.map((n) => (
          <div key={n} className="surface-card flex items-center justify-between p-4 opacity-70">
            <span>{n}</span>
            <StatusBadge tone="soon" />
          </div>
        ))}
      </div>
    </div>
  );
}
