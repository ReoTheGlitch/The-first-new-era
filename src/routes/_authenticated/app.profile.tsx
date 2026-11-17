import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { studentOverviewQuery, weeklyXpQuery } from "@/features/student/queries";
import { Card, EmptyState, PageHeader, ProgressRing } from "@/components/common";
import { AppIcon } from "@/components/icons/AppIcon";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي — The first" },
      { name: "description", content: "تقدمك وإنجازاتك." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(studentOverviewQuery),
  component: Profile,
});

function WeeklySparkline({ days }: { days: number[] }) {
  const W = 200,
    H = 40,
    padX = 8,
    padY = 4;
  const max = Math.max(...days, 1);
  const xs = days.map((_, i) => padX + (i * (W - 2 * padX)) / 6);
  const ys = days.map((v) => H - padY - (v / max) * (H - 2 * padY));
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const fillPts = `${xs[0]},${H} ${pts} ${xs[xs.length - 1]},${H}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="none"
      className="text-primary"
      aria-hidden
    >
      <defs>
        <linearGradient id="xp-week-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#xp-week-grad)" />
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="2" fill="currentColor" />
      ))}
    </svg>
  );
}

type Me = Awaited<ReturnType<NonNullable<typeof studentOverviewQuery.queryFn>>>;

function StatsGrid({ me }: { me: Me }) {
  const totalCorrect = me.attempts.reduce((a: number, r) => a + (r.correct_count ?? 0), 0);
  const totalAnswered = me.attempts.reduce((a: number, r) => a + (r.total_count ?? 0), 0);
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  const stats = [
    {
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
      value: accuracy !== null ? `${accuracy}٪` : "—",
      label: "نسبة الدقة",
    },
    {
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
      value: String(me.attempts.length),
      label: "جلسات التدريب",
    },
    {
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      value: String(me.streak),
      label: "أيام متواصلة",
    },
    {
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.11" />
          <path d="M15 7a3 3 0 1 0-6 0" />
          <path d="M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
          <path d="M6 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
        </svg>
      ),
      value: String(me.longestStreak),
      label: "أطول سلسلة",
    },
  ];

  return (
    <Card className="mt-6">
      <h2 className="mb-4 font-semibold">إحصائياتي</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-md bg-muted/50 px-3 py-4 text-center"
          >
            <span className="text-primary/70">{s.icon}</span>
            <span className="text-xl font-semibold tabular-nums">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Profile() {
  const { data: me } = useSuspenseQuery(studentOverviewQuery);
  const { data: weekly } = useQuery(weeklyXpQuery);
  return (
    <div>
      <PageHeader
        title={me.displayName}
        subtitle={me.email}
        icon="profile"
        actions={
          <Link
            to="/app/settings"
            className="press rounded-md border border-input px-4 py-2 text-sm"
          >
            الإعدادات
          </Link>
        }
      />
      <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="flex flex-col items-center gap-3 text-center">
          <ProgressRing value={me.level.progress} label={`م${me.level.level}`} size={120} />
          <p className="text-sm text-muted-foreground">
            {me.level.into}/{me.level.needed} نقطة للمستوى التالي
          </p>
          <div className="grid w-full grid-cols-2 gap-2 pt-2 text-sm">
            <div className="rounded-md bg-muted/60 p-3">
              <AppIcon name="streak" size={18} />
              <p className="mt-1">{me.streak} يوم</p>
            </div>
            <div className="rounded-md bg-muted/60 p-3">
              <AppIcon name="achievements" size={18} />
              <p className="mt-1">{me.totalXp} XP</p>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">الإنجازات</h2>
          {me.achievements.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {me.achievements.map((a, i) => (
                <li key={i} className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <AppIcon name="achievements" tile size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.achievements?.title_ar}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.achievements?.description_ar}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="achievements"
              title="لا إنجازات بعد"
              body="أكمل جلسة تدريب كاملة لتحصل على أول إنجاز."
            />
          )}
        </Card>
      </div>

      {weekly && (
        <Card className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">نشاط الأسبوع</h2>
            <span className="text-sm font-medium text-primary">+{weekly.total} XP</span>
          </div>
          <WeeklySparkline days={weekly.days} />
          {weekly.bestDayName && (
            <p className="mt-2 text-xs text-muted-foreground">أفضل يوم: {weekly.bestDayName}</p>
          )}
        </Card>
      )}

      <StatsGrid me={me} />
    </div>
  );
}
