import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, PageHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import {
  answerDuel,
  createDuel,
  getDuel,
  joinDuel,
  listPacks,
  quickMatch,
} from "@/features/duel/duel.functions";
import { GhostMode } from "@/features/duel/GhostMode";
import { KickSlots } from "@/features/duel/KickSlots";
import { ModePackPicker } from "@/features/duel/ModePackPicker";
import {
  MODES,
  modeMin,
  packKeyOf,
  parsePackKey,
  type DuelMode,
  type DuelState,
  type Pack,
  type Round,
} from "@/features/duel/types";

export const Route = createFileRoute("/_authenticated/app/duel")({
  head: () => ({
    meta: [
      { title: "تحدٍّ مباشر — The first" },
      { name: "description", content: "تنافس مع طالب آخر في أوضاع النقاط والسرعة وضربات الجزاء." },
    ],
  }),
  component: DuelPage,
});

const SUBJECT = "physics";

function DuelPage() {
  const loadPacks = useServerFn(listPacks);
  const packsQuery = useQuery({
    queryKey: ["packs", SUBJECT],
    queryFn: () => loadPacks({ data: { subject: SUBJECT } }) as Promise<Pack[]>,
  });
  const packs = packsQuery.data ?? [];

  const [tab, setTab] = useState<"duel" | "ghost">("duel");
  const [mode, setMode] = useState<DuelMode>("points");
  const [packKey, setPackKey] = useState("subject:");

  const picker = (
    <ModePackPicker
      mode={mode}
      onMode={setMode}
      packs={packs}
      packKey={packKey}
      onPack={setPackKey}
    />
  );
  const { scope, pack } = parsePackKey(packKey);
  const chosen = packs.find((p) => packKeyOf(p) === packKey);
  const enough = !chosen || chosen.count >= modeMin(mode);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="تحدٍّ مباشر"
        subtitle="اختر الوضع والباك، ثم تنافس مع طالب آخر أو مع الشبح."
        icon="competition"
      />
      <div role="tablist" className="mb-5 flex gap-2">
        {(
          [
            ["duel", "تحدٍّ بين طالبين"],
            ["ghost", "وضع الشبح (تجريبي)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm transition-colors",
              tab === key
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "duel" ? (
        <LiveDuel picker={picker} mode={mode} scope={scope} pack={pack} enough={enough} />
      ) : (
        <GhostMode picker={picker} mode={mode} scope={scope} pack={pack} enough={enough} />
      )}
    </div>
  );
}

type Setup = { mode: DuelMode; scope: "subject" | "unit" | "lesson"; pack: string | null };

function LiveDuel({
  picker,
  mode,
  scope,
  pack,
  enough,
}: { picker: React.ReactNode } & Setup & { enough: boolean }) {
  const create = useServerFn(createDuel);
  const quick = useServerFn(quickMatch);
  const join = useServerFn(joinDuel);
  const load = useServerFn(getDuel);
  const answer = useServerFn(answerDuel);
  const queryClient = useQueryClient();

  const [state, setState] = useState<DuelState | null>(null);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  // نحتفظ بأحدث نسخة من الدالة حتى لا يُعاد ضبط مؤقت التحديث مع كل عرض
  const loadRef = useRef(load);
  loadRef.current = load;

  const accept = useCallback((s: DuelState) => {
    setState(s);
    setOffset(s.server_now - Date.now());
  }, []);

  async function begin(action: () => Promise<DuelState>) {
    setBusy(true);
    try {
      accept(await action());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر بدء التحدي");
    } finally {
      setBusy(false);
    }
  }

  const duelId = state?.id;
  const status = state?.status;
  const index = state?.index;

  useEffect(() => {
    if (!duelId || status === "finished" || status === "cancelled") return;
    let stopped = false;
    const poll = async () => {
      try {
        const s = await loadRef.current({ data: { duelId } });
        if (!stopped) accept(s as DuelState);
      } catch {
        // نعيد المحاولة في الدورة التالية
      }
    };
    const timer = setInterval(poll, 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [duelId, status, accept]);

  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(() => setClock(Date.now()), 200);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => setPicked(null), [index, duelId]);

  useEffect(() => {
    if (status === "finished") {
      for (const key of ["student", "competition", "mistakes"])
        queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [status, queryClient]);

  async function pick(optionId: string) {
    if (!state || picked) return;
    setPicked(optionId);
    try {
      accept((await answer({ data: { duelId: state.id, optionId } })) as DuelState);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إرسال الإجابة");
      setPicked(null);
    }
  }

  const reset = () => {
    setState(null);
    setCode("");
  };

  if (!state || state.status === "cancelled") {
    const payload = { subject: SUBJECT, mode, scope, pack };
    return (
      <div className="space-y-4">
        {state?.status === "cancelled" && (
          <p className="text-sm text-muted-foreground">انتهت مهلة التحدي السابق. ابدأ من جديد.</p>
        )}
        <Card>{picker}</Card>
        {!enough && (
          <p className="text-sm text-destructive">
            هذا الباك لا يكفي لهذا الوضع. اختر باكًا أكبر أو وضعًا آخر.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="font-semibold">ابحث عن منافس</h2>
            <p className="text-sm text-muted-foreground">
              يطابقك النظام مع طالب اختار نفس الوضع والباك.
            </p>
            <button
              disabled={busy || !enough}
              onClick={() => begin(() => quick({ data: payload }) as Promise<DuelState>)}
              className="press w-full rounded-xl bg-brand py-3 font-medium text-primary-foreground disabled:opacity-50"
            >
              ابدأ البحث
            </button>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-semibold">تحدَّ صديقًا</h2>
            <p className="text-sm text-muted-foreground">أنشئ تحديًا وأرسل الكود لصديقك.</p>
            <button
              disabled={busy || !enough}
              onClick={() => begin(() => create({ data: payload }) as Promise<DuelState>)}
              className="press w-full rounded-xl border border-border py-3 font-medium disabled:opacity-50"
            >
              إنشاء تحدٍّ
            </button>
          </Card>
        </div>
        <Card className="space-y-3">
          <h2 className="font-semibold">انضم بكود</h2>
          <p className="text-sm text-muted-foreground">الوضع والباك يأتيان من صاحب التحدي.</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              dir="ltr"
              placeholder="ABC123"
              className="min-w-0 flex-1 rounded-xl border border-input bg-muted/60 px-3 py-3 text-center tracking-widest"
            />
            <button
              disabled={busy || code.length < 4}
              onClick={() => begin(() => join({ data: { code } }) as Promise<DuelState>)}
              className="press rounded-xl bg-brand px-6 font-medium text-primary-foreground disabled:opacity-50"
            >
              انضمام
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const modeLabel = MODES.find((m) => m.key === state.mode)?.label ?? "";

  if (state.status === "waiting") {
    return (
      <Card className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          وضع {modeLabel}. شارك الكود مع صديقك، أو انتظر حتى ينضم منافس.
        </p>
        <p dir="ltr" className="font-display text-5xl font-bold tracking-[0.3em]">
          {state.code}
        </p>
        <button
          onClick={() =>
            navigator.clipboard?.writeText(state.code).then(() => toast.success("تم نسخ الكود"))
          }
          className="text-sm text-primary"
        >
          نسخ الكود
        </button>
        <p className="animate-pulse text-sm">في انتظار المنافس...</p>
        <button onClick={reset} className="block w-full text-sm text-muted-foreground">
          إلغاء
        </button>
      </Card>
    );
  }

  if (state.status === "finished") {
    const headline =
      state.winner === "me"
        ? "فزت بالتحدي"
        : state.winner === "opp"
          ? "فاز المنافس هذه المرة"
          : "تعادل";
    return (
      <div className="space-y-4">
        <Scoreboard s={state} />
        <Card className="space-y-3 text-center">
          <h2 className="text-2xl font-semibold">{headline}</h2>
          <p className="text-sm text-muted-foreground">
            {state.xp > 0
              ? `حصلت على ${state.xp} نقطة خبرة`
              : "لم تُضف نقاط خبرة (بلغت الحد اليومي أو لم تكن هناك إجابات صحيحة)"}
          </p>
          <button
            onClick={reset}
            className="press rounded-xl bg-brand px-8 py-3 font-medium text-primary-foreground"
          >
            تحدٍّ جديد
          </button>
        </Card>
        {state.prev && <Reveal prev={state.prev} mode={state.mode} title="آخر سؤال" />}
      </div>
    );
  }

  const speed = state.mode === "speed";
  const elapsed = (clock + offset - (state.started_at ?? 0)) / 1000;
  const left = Math.max(0, state.time_limit - elapsed);
  const q = state.question;
  const header = speed
    ? `سؤال ${Math.min(state.index + 1, state.total)} من ${state.total} . أخطاؤك ${state.my_wrong} (+${state.my_wrong * 5} ث)`
    : state.mode === "penalties"
      ? state.sudden_death
        ? "موت مفاجئ"
        : `ركلة ${state.index + 1} من ${state.total}`
      : `سؤال ${state.index + 1} من ${state.total}`;

  return (
    <div>
      <Scoreboard s={state} />
      {elapsed < 0 ? (
        <Card className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {state.index === 0 ? `يبدأ تحدي ${modeLabel} خلال` : "الجولة التالية خلال"}
          </p>
          <p className="font-display text-6xl font-bold">{Math.ceil(-elapsed)}</p>
          {state.prev && !speed && (
            <Reveal
              prev={state.prev}
              mode={state.mode}
              title={`نتيجة الجولة ${state.prev.index + 1}`}
            />
          )}
        </Card>
      ) : speed && state.me_answered ? (
        <Card className="space-y-2 text-center">
          <p className="text-lg font-semibold">أنهيت الأسئلة</p>
          <p className="animate-pulse text-sm text-muted-foreground">
            في انتظار المنافس ({state.opp_count} من {state.total})...
          </p>
        </Card>
      ) : (
        q && (
          <Card className="animate-rise" key={q.id}>
            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{header}</span>
              <span dir="ltr">{Math.ceil(left)}s</span>
            </div>
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all duration-200",
                  left < 6 ? "bg-destructive" : "bg-brand",
                )}
                style={{ width: `${(left / state.time_limit) * 100}%` }}
              />
            </div>
            {speed && state.prev && (
              <p className="mb-3 text-xs text-muted-foreground">
                السؤال السابق:{" "}
                {state.prev.mine?.is_correct
                  ? "إجابة صحيحة"
                  : `خطأ، والصحيحة ${state.prev.correct_label}`}
              </p>
            )}
            <p className="mb-5 text-lg leading-8">{q.prompt}</p>
            <div role="radiogroup" className="grid gap-3">
              {q.options.map((o) => (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={picked === o.id}
                  disabled={state.me_answered || !!picked}
                  onClick={() => pick(o.id)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-start transition-colors disabled:cursor-default",
                    picked === o.id
                      ? "border-primary bg-primary/15"
                      : "border-border hover:border-primary/60",
                  )}
                  dir="auto"
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-4 min-h-5 text-sm text-muted-foreground">
              {speed
                ? `المنافس أجاب عن ${state.opp_count} من ${state.total}`
                : state.me_answered
                  ? state.opp_answered
                    ? "جارٍ عرض النتيجة..."
                    : "تم إرسال إجابتك. في انتظار المنافس..."
                  : state.opp_answered
                    ? "المنافس أجاب بالفعل"
                    : ""}
            </p>
          </Card>
        )
      )}
    </div>
  );
}

function Scoreboard({ s }: { s: DuelState }) {
  const finished = s.status === "finished";
  const value = (score: number, progress: number) => {
    if (s.mode === "speed")
      return finished ? `${(score / 1000).toFixed(1)} ث` : `${progress} من ${s.total}`;
    return String(score);
  };
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 text-center">
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">أنت</p>
        <p className="text-2xl font-semibold">{value(s.my_score, s.index)}</p>
        {s.mode === "penalties" && <KickSlots kicks={s.my_kicks} />}
      </Card>
      <Card className="p-3">
        <p className="truncate text-xs text-muted-foreground">{s.opp_name ?? "المنافس"}</p>
        <p className="text-2xl font-semibold">{value(s.opp_score, s.opp_count)}</p>
        {s.mode === "penalties" && <KickSlots kicks={s.opp_kicks} />}
      </Card>
    </div>
  );
}

function Reveal({ prev, mode, title }: { prev: Round; mode: DuelMode; title: string }) {
  const penalties = mode === "penalties";
  const mine = prev.mine?.is_correct
    ? penalties
      ? "هدف لك"
      : `إجابتك صحيحة (+${prev.mine.points})`
    : penalties
      ? "ركلتك خارج"
      : "إجابتك لم تصب";
  const theirs = prev.theirs?.is_correct
    ? penalties
      ? "هدف للمنافس"
      : `المنافس أصاب (+${prev.theirs.points})`
    : penalties
      ? "ركلة المنافس خارج"
      : "المنافس لم يصب";
  return (
    <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-3 text-start text-sm">
      <p className="font-medium">{title}</p>
      <p>
        الإجابة الصحيحة: <b dir="auto">{prev.correct_label}</b>
      </p>
      <p>
        {mine} . {theirs}
      </p>
      {prev.explanation && <p className="text-muted-foreground">{prev.explanation}</p>}
    </div>
  );
}
