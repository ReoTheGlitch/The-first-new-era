import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { leaderboardQuery, studentOverviewQuery } from "@/features/student/queries";
import { Card, EmptyState, PageHeader, SkeletonBlock, StatusBadge } from "@/components/common";
import { AppIcon } from "@/components/icons/AppIcon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/competition")({
  head: () => ({
    meta: [
      { title: "المنافسة — العصر الجديد الأول" },
      { name: "description", content: "لوحة الترتيب والتحديات والمواسم." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(leaderboardQuery),
      context.queryClient.ensureQueryData(studentOverviewQuery),
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
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
            style={{ backgroundColor: MEDAL_COLORS[i], color: "#0f0b1a" }}
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
            className="flex w-20 items-center justify-center rounded-t-xl font-bold"
            style={{
              height: PEDESTAL_H[i],
              backgroundColor: MEDAL_COLORS[i],
              color: "#0f0b1a",
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
  const meClass = r.is_me ? "rounded-xl border border-primary/40 bg-primary/5" : "";
  return (
    <>
      {/* Desktop row */}
      <li className={`hidden items-center gap-3 px-2 py-3 md:flex ${meClass}`}>
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
        className={`flex items-center gap-3 rounded-xl border border-border p-3 md:hidden ${r.is_me ? "border-primary/40 bg-primary/5" : "bg-background/40"}`}
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
  return (
    <div>
      <PageHeader
        title="المنافسة"
        subtitle="الترتيب مبني على نقاط خبرة حقيقية يمنحها الخادم فقط."
        icon="competition"
      />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">نقاطك</p>
          <p className="text-2xl font-semibold">{me.totalXp}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">مستواك</p>
          <p className="text-2xl font-semibold">{me.level.level}</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="text-xs text-muted-foreground">ترتيبك</p>
          <p className="text-2xl font-semibold">{board.find((r) => r.is_me)?.rank ?? "—"}</p>
        </Card>
      </div>
      <Tabs defaultValue="leaderboard" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="leaderboard">لوحة الترتيب</TabsTrigger>
          <TabsTrigger value="challenges">التحديات</TabsTrigger>
          <TabsTrigger value="seasons">المواسم</TabsTrigger>
        </TabsList>

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
                <ol className="divide-y divide-border md:divide-y">
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
              className="press inline-flex rounded-xl bg-brand px-5 py-2.5 font-medium text-primary-foreground"
            >
              ادخل التحدي
            </Link>
          </Card>
        </TabsContent>

        <TabsContent value="seasons">
          <Card className="p-2 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <AppIcon name="achievements" size={20} /> السكور بورد الأسبوعية
                </h2>
                <p className="text-xs text-muted-foreground">
                  أفضل الطلاب نشاطًا وتقدمًا خلال هذا الأسبوع
                </p>
              </div>
              <StatusBadge tone="verified">تحدي الأسبوع</StatusBadge>
            </div>
            {board.length === 0 ? (
              <EmptyState
                icon="achievements"
                title="لا توجد نقاط أسبوعية بعد"
                body="ابدأ التدريب أو الامتحانات لتتصدر قائمة هذا الأسبوع."
              />
            ) : (
              <ol className="space-y-2 md:divide-y md:divide-border md:space-y-0">
                {(board as BoardRow[]).slice(0, 15).map((r) => (
                  <BoardRow key={r.user_id} r={r} />
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
