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
      { title: "لوحة الطالب — The first" },
      { name: "description", content: "تقدمك وسلسلة تعلمك ونقاط الخبرة." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(studentOverviewQuery),
      context.queryClient.ensureQueryData(subjectsQuery),
    ]),
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-6 text-center">
      <p className="font-medium text-destructive">حدث خطأ في تحميل الصفحة</p>
      <p className="mt-1 text-xs text-muted-foreground">{(error as Error)?.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="press mt-4 rounded-md bg-brand px-4 py-2 text-sm text-primary-foreground"
      >
        تحديث
      </button>
    </div>
  ),
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
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
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
              <p className="text-xs text-muted-foreground">لوحة الطالب</p>
              <h1 className="mt-1 truncate text-2xl font-semibold sm:text-4xl">{me.displayName}</h1>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                {fresh
                  ? "لم تبدأ أي جلسة بعد. اختر مفهومًا وابدأ التدريب."
                  : `المستوى ${me.level.level}. المتبقي للمستوى التالي: ${me.level.needed - me.level.into} نقطة.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/app/subjects"
                  className="press rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  {fresh ? "ابدأ التعلم" : "تابع التعلم"}
                </Link>
                <Link
                  to="/app/assistant"
                  className="press flex items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm"
                >
                  <AppIcon name="assistant" size={18} /> اسأل المساعد
                </Link>
                {subjects.slice(0, 3).map((s) => (
                  <Link
                    key={s.id}
                    to="/app/subjects/$subjectSlug"
                    params={{ subjectSlug: s.slug }}
                    className="press rounded-full border border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {s.name_ar}
                  </Link>
                ))}
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
          {/* Streak card with flame icon */}
          <Card className="flex items-center gap-4 p-4">
            <svg
              viewBox="0 0 24 24"
              width="44"
              height="44"
              fill="oklch(0.75 0.18 50)"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M12 2C9.5 5 8 7.5 9 10.5c-1.5-1-2-2.5-1.5-4C5 8.5 4 11.5 5 14c-.5 0-1-.1-1.5-.3C4 16.5 7 20 12 20s8-3.5 8.5-6.3c-.5.2-1 .3-1.5.3 1-2.5 0-5.5-2.5-7.5.5 1.5 0 3-1.5 4C15.5 7.5 14 5 12 2Z" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">سلسلة التعلم</p>
              <p className="text-2xl font-semibold tabular-nums">
                {me.streak > 0 ? `${me.streak} يوم` : "لا يوجد نشاط اليوم"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                أطول سلسلة: {me.longestStreak}
              </p>
            </div>
          </Card>

          {/* XP card with level progress bar */}
          <Card className="flex items-center gap-4 p-4">
            <AppIcon name="achievements" tile size={44} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">نقاط الخبرة</p>
              <p className="text-2xl font-semibold tabular-nums">
                {me.totalXp.toLocaleString("ar-EG")}
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${Math.round(me.level.progress * 100)}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {me.level.into} / {me.level.needed} XP • المستوى {me.level.level}
              </p>
            </div>
          </Card>

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
                  className="press flex items-center justify-between gap-3 rounded-md bg-muted/60 p-4 hover:bg-muted"
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
                    className="press surface-card group flex flex-col gap-3 p-5 hover:border-primary/40"
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
                    <p className="text-xs text-muted-foreground">{lessons} درس تجريبي</p>
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
                          className="press block rounded-md bg-muted/60 p-3 text-sm hover:bg-muted"
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
