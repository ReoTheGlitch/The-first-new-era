import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { studentOverviewQuery, weeklyXpQuery } from "@/features/student/queries";
import { Card, EmptyState, PageHeader, ProgressRing } from "@/components/common";
import { AppIcon } from "@/components/icons/AppIcon";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي — العصر الجديد الأول" },
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
            className="press rounded-xl border border-input px-4 py-2 text-sm"
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
            <div className="rounded-xl bg-muted/60 p-3">
              <AppIcon name="streak" size={18} />
              <p className="mt-1">{me.streak} يوم</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
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
                <li key={i} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
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
    </div>
  );
}
