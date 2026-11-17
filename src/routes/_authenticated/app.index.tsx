import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { studentOverviewQuery, subjectsQuery } from "@/features/student/queries";
import { AppIcon } from "@/components/icons/AppIcon";
import { Card, EmptyState, ProgressRing, StatusBadge } from "@/components/common";
import { AchievementUnlock } from "@/components/achievements";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "لوحة الطالب — العصر الجديد الأول" },
      { name: "description", content: "تقدمك وسلسلة تعلمك ونقاط الخبرة." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(studentOverviewQuery),
      context.queryClient.ensureQueryData(subjectsQuery),
    ]),
  component: Dashboard,
});

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: Parameters<typeof AppIcon>[0]["name"];
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <AppIcon name={icon} tile size={44} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}

function Dashboard() {
  const { data: me } = useSuspenseQuery(studentOverviewQuery);
  const { data: subjects } = useSuspenseQuery(subjectsQuery);
  const lastAttempt = me.attempts.find((a) => a.completed_at);
  const fresh = me.attempts.length === 0;
  const goal = Math.min(1, me.todayXp / me.dailyGoal);

  type PendingAch = { titleAr: string; descriptionAr?: string } | null;
  const [pendingAch, setPendingAch] = useState<PendingAch>(null);

  useEffect(() => {
    try {
      const latest = me.achievements[0];
      if (!latest?.earned_at || !latest.achievements?.title_ar) return;
      const earnedMs = new Date(latest.earned_at).getTime();
      if (Date.now() - earnedMs > 60_000) return;
      const key = "shown_achievements";
      const shown: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (shown.includes(latest.earned_at)) return;
      setPendingAch({
        titleAr: latest.achievements.title_ar,
        descriptionAr: latest.achievements.description_ar ?? undefined,
      });
      localStorage.setItem(key, JSON.stringify([...shown, latest.earned_at].slice(-50)));
    } catch {
      /* non-critical */
    }
  }, [me.achievements]);

  return (
    <>
      {pendingAch && (
        <AchievementUnlock
          titleAr={pendingAch.titleAr}
          descriptionAr={pendingAch.descriptionAr}
          onDismiss={() => setPendingAch(null)}
        />
      )}
      <div className="space-y-6">
        <section className="surface-card relative overflow-hidden p-6 animate-rise sm:p-8">
          <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">أهلًا بك،</p>
              <h1 className="mt-1 truncate text-3xl font-semibold sm:text-4xl">{me.displayName}</h1>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                {fresh
                  ? "ابدأ أول جلسة تدريب لتبدأ سلسلة تعلمك وتكسب نقاط الخبرة."
                  : `المستوى ${me.level.level} — باقي ${me.level.needed - me.level.into} نقطة للمستوى التالي.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/app/subjects"
                  className="press rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-primary-foreground glow-edge"
                >
                  {fresh ? "ابدأ التعلم" : "تابع التعلم"}
                </Link>
                <Link
                  to="/app/assistant"
                  className="press flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm"
                >
                  <AppIcon name="assistant" size={18} /> اسأل المساعد
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ProgressRing value={goal} label={`${me.todayXp}/${me.dailyGoal}`} size={104} />
              <div className="text-xs text-muted-foreground">
                هدف اليوم
                <br />
                (نقاط خبرة)
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            icon="streak"
            label="سلسلة التعلم"
            value={`${me.streak} يوم`}
            hint={`أطول سلسلة: ${me.longestStreak}`}
          />
          <Stat
            icon="achievements"
            label="نقاط الخبرة"
            value={me.totalXp.toLocaleString("ar-EG")}
            hint={`المستوى ${me.level.level}`}
          />
          <Stat
            icon="practice"
            label="جلسات التدريب"
            value={me.attempts.length.toLocaleString("ar-EG")}
            hint="آخر 10 جلسات"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <h2 className="mb-4 text-lg font-semibold">تابع من حيث توقفت</h2>
              {lastAttempt?.concepts ? (
                <Link
                  to="/app/practice/$conceptId"
                  params={{ conceptId: lastAttempt.concept_id }}
                  className="press flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-4 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lastAttempt.concepts.title_ar}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lastAttempt.concepts.lessons?.title_ar} · {lastAttempt.correct_count}/
                      {lastAttempt.total_count} صحيحة
                    </p>
                  </div>
                  <span className="text-sm text-primary">تدرّب مجددًا</span>
                </Link>
              ) : (
                <EmptyState
                  icon="lessons"
                  title="لا يوجد نشاط بعد"
                  body="اختر مادة وابدأ بمفهوم واحد صغير."
                />
              )}
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              {subjects.map((s) => {
                const lessons = s.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)).length;
                return (
                  <Link
                    key={s.id}
                    to="/app/subjects/$subjectSlug"
                    params={{ subjectSlug: s.slug }}
                    className="press surface-card group flex flex-col gap-3 p-5 hover:glow-edge"
                  >
                    <div className="flex items-center justify-between">
                      <AppIcon
                        name={s.slug === "physics" ? "physics" : "chemistry"}
                        tile
                        size={48}
                      />
                      <StatusBadge tone="unverified" />
                    </div>
                    <h3 className="text-lg font-semibold">{s.name_ar}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.description_ar}</p>
                    <p className="text-xs text-muted-foreground">{lessons} درس تجريبي متاح</p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="mb-3 text-lg font-semibold">مهام المراجعة</h2>
              {me.attempts.some((a) => a.correct_count < a.total_count) ? (
                <ul className="space-y-2">
                  {me.attempts
                    .filter((a) => a.correct_count < a.total_count)
                    .slice(0, 3)
                    .map((a) => (
                      <li key={a.id}>
                        <Link
                          to="/app/practice/$conceptId"
                          params={{ conceptId: a.concept_id }}
                          className="press block rounded-xl bg-muted/60 p-3 text-sm hover:bg-muted"
                        >
                          راجع: {a.concepts?.title_ar}
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  ستظهر هنا المفاهيم التي أخطأت فيها لمراجعتها.
                </p>
              )}
            </Card>
            <Card>
              <h2 className="mb-3 text-lg font-semibold">آخر الإنجازات</h2>
              {me.achievements.length ? (
                <ul className="space-y-2">
                  {me.achievements.slice(0, 3).map((a, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <AppIcon name="achievements" size={20} /> {a.achievements?.title_ar}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  أكمل أول جلسة تدريب لتحصل على أول إنجاز.
                </p>
              )}
            </Card>
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">المنافسة</h2>
                <AppIcon name="competition" size={22} />
              </div>
              <p className="text-sm text-muted-foreground">
                ترتيبك يعتمد على نقاط الخبرة الحقيقية فقط.
              </p>
              <Link to="/app/competition" className="mt-3 inline-block text-sm text-primary">
                عرض لوحة الترتيب ←
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
