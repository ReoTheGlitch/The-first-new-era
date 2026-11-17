import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  leaderboardQuery,
  studentOverviewQuery,
  weeklyCompetitionQuery,
} from "@/features/student/queries";
import { Card, EmptyState, PageHeader, SkeletonBlock } from "@/components/common";
import { AppIcon } from "@/components/icons/AppIcon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyCountdown } from "@/features/engagement/WeeklyCountdown";

export const Route = createFileRoute("/_authenticated/app/competition")({
  head: () => ({
    meta: [
      { title: "المنافسة — The first" },
      { name: "description", content: "لوحة الترتيب الأسبوعية والمواسم." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(leaderboardQuery),
      context.queryClient.ensureQueryData(studentOverviewQuery),
      context.queryClient.ensureQueryData(weeklyCompetitionQuery),
    ]),
  pendingComponent: LeaderboardSkeleton,
  component: Competition,
});

type BoardRow = {
  user_id: string;
  rank: number;
  display_name: string;
  total_xp: number;
  is_me: boolean;
};

const MEDAL_COLORS = [
  "oklch(0.80 0.05 220)",
  "oklch(0.85 0.17 85)",
  "oklch(0.65 0.09 50)",
] as const;
const PEDESTAL_H = ["5rem", "7rem", "3.5rem"] as const; // 2nd, 1st, 3rd

function Podium({ board }: { board: BoardRow[] }) {
  if (board.length < 3) return null;
  // podium order: 2nd (left), 1st (center), 3rd (right)
  const order = [board[1]!, board[0]!, board[2]!];
  return (
    <div className="mb-6 hidden items-end justify-center gap-6 md:flex">
      {order.map((r, i) => (
        <div key={r.user_id} className="flex flex-col items-center gap-1.5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
            style={{ backgroundColor: MEDAL_COLORS[i], color: "#0a0b0e" }}
          >
            {r.display_name.slice(0, 1)}
          </div>
          <p
            className={`max-w-[88px] truncate text-center text-sm font-semibold ${r.is_me ? "text-primary" : ""}`}
          >
            {r.display_name}
          </p>
          <p className="text-xs text-muted-foreground">{r.total_xp} XP</p>
          <div
            className="flex w-20 items-center justify-center rounded-t-md font-semibold"
            style={{
              height: PEDESTAL_H[i],
              backgroundColor: MEDAL_COLORS[i],
              color: "#0a0b0e",
            }}
          >
            #{r.rank}
          </div>
        </div>
      ))}
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  return (
    <span className="flex w-10 shrink-0 items-center justify-center gap-1">
      <span className="font-semibold text-muted-foreground">{rank}</span>
      {/* rank-change indicator — static "–" until historical data is available */}
      <span className="text-xs text-muted-foreground/50">–</span>
    </span>
  );
}

function BoardRow({ r }: { r: BoardRow }) {
  const meClass = r.is_me ? "rounded-md border border-primary/40 bg-primary/5" : "";
  return (
    <>
      {/* Desktop row */}
      <li
        aria-current={r.is_me ? "true" : undefined}
        className={`hidden items-center gap-3 px-2 py-3 md:flex ${meClass}`}
      >
        <RankCell rank={r.rank} />
        <span className="min-w-0 flex-1 truncate">
          {r.display_name}
          {r.is_me && (
            <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              أنت
            </span>
          )}
        </span>
        <span className="font-medium">{r.total_xp} XP</span>
      </li>

      {/* Mobile card */}
      <li
        aria-current={r.is_me ? "true" : undefined}
        className={`flex items-center gap-3 rounded-md border border-border p-3 md:hidden ${r.is_me ? "border-primary/40 bg-primary/5" : "bg-background/40"}`}
      >
        <RankCell rank={r.rank} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {r.display_name}
            {r.is_me && (
              <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                أنت
              </span>
            )}
          </p>
        </div>
        <span className="shrink-0 font-medium">{r.total_xp} XP</span>
      </li>
    </>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-10 w-48" />
      <SkeletonBlock className="h-64" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}

function Competition() {
  const { data: board } = useSuspenseQuery(leaderboardQuery);
  const { data: me } = useSuspenseQuery(studentOverviewQuery);
  const { data: weekly } = useSuspenseQuery(weeklyCompetitionQuery);
  const myWeekly = weekly.rows.find((r) => r.is_me);
  return (
    <div>
      <PageHeader title="المنافسة" icon="competition" />
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <WeeklyCountdown endsAt={weekly.round.endsAt} />
        <div className="text-end">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">نقاطك هذا الأسبوع</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{myWeekly?.points ?? 0}</p>
        </div>
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">نقاطك الإجمالية</p>
          <p className="text-2xl font-semibold">{me.totalXp}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">مستواك</p>
          <p className="text-2xl font-semibold">{me.level.level}</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="text-xs text-muted-foreground">ترتيبك العام</p>
          <p className="text-2xl font-semibold">{board.find((r) => r.is_me)?.rank ?? "—"}</p>
        </Card>
      </div>
      <Tabs defaultValue="weekly" dir="rtl">
        <TabsList className="mb-4 h-9 gap-1 rounded-md border border-border bg-muted/40 p-1">
          <TabsTrigger
            className="rounded-sm px-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            value="weekly"
          >
            المسابقة الأسبوعية
          </TabsTrigger>
          <TabsTrigger
            className="rounded-sm px-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            value="leaderboard"
          >
            الترتيب العام
          </TabsTrigger>
          <TabsTrigger
            className="rounded-sm px-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            value="challenges"
          >
            التحديات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card className="p-2 sm:p-4">
            <div className="mb-2 flex items-center justify-between px-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <AppIcon name="leaderboard" size={20} /> هذا الأسبوع
              </h2>
              <span className="text-xs text-muted-foreground">تُجدَّد كل يوم إثنين 00:00</span>
            </div>
            {weekly.rows.length === 0 ? (
              <EmptyState
                icon="leaderboard"
                title="لم يبدأ أحد بعد"
                body="أكمل جلسة تدريب أو امتحانًا لتكون أول اسم هذا الأسبوع."
              />
            ) : (
              <ol aria-label="لوحة الترتيب الأسبوعية" className="divide-y divide-border">
                {weekly.rows.map((r) => (
                  <li
                    key={r.user_id}
                    aria-current={r.is_me ? "true" : undefined}
                    className={`flex items-center gap-3 px-2 py-3 ${r.is_me ? "rounded-md border border-primary/40 bg-primary/5" : ""}`}
                  >
                    <RankCell rank={r.rank} />
                    <span className="min-w-0 flex-1 truncate">
                      {r.display_name}
                      {r.is_me && (
                        <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          أنت
                        </span>
                      )}
                    </span>
                    <span className="font-medium tabular-nums">{r.points}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card className="p-2 sm:p-4">
            <div className="mb-2 flex items-center justify-between px-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <AppIcon name="leaderboard" size={20} /> الترتيب العام
              </h2>
              <span className="text-xs text-muted-foreground">الترتيب حسب المادة: قريبًا</span>
            </div>
            {board.length === 0 ? (
              <EmptyState
                icon="leaderboard"
                title="لا يوجد متنافسون بعد"
                body="أكمل جلسة تدريب لتكون أول اسم في لوحة الترتيب."
              />
            ) : (
              <>
                <Podium board={board as BoardRow[]} />
                <ol aria-label="لوحة الترتيب" className="divide-y divide-border md:divide-y">
                  {(board as BoardRow[]).map((r) => (
                    <BoardRow key={r.user_id} r={r} />
                  ))}
                </ol>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="challenges">
          <Card className="space-y-3">
            <h2 className="font-semibold">تحدٍّ مباشر</h2>
            <p className="text-sm text-muted-foreground">
              تنافس مع طالب آخر على نفس الأسئلة في نفس اللحظة، أو جرّب وضع الشبح.
            </p>
            <Link
              to="/app/duel"
              className="press inline-flex rounded-lg bg-brand px-5 py-2.5 font-medium text-primary-foreground"
            >
              ادخل التحدي
            </Link>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
