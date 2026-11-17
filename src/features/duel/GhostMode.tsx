import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/common";
import { cn } from "@/lib/utils";
import { gradeGhostAnswer, startGhost } from "./duel.functions";
import { KickSlots } from "./KickSlots";
import { GHOST_LEVELS, type DuelMode, type GhostLevel } from "./types";

type Ghost = Awaited<ReturnType<typeof startGhost>>;
type Feedback = {
  isCorrect: boolean;
  correctLabel: string;
  explanation: string;
  ready: boolean;
  timedOut: boolean;
};
type Answer = { correct: boolean; ms: number };

const POINTS_LIMIT = 20000;
const KICK_LIMIT = 15000;
const SPEED_TOTAL = 150000;
const PENALTY_MS = 5000;
const speedPoints = (ms: number) => 100 + Math.floor((50 * (POINTS_LIMIT - ms)) / POINTS_LIMIT);

type Props = {
  picker: React.ReactNode;
  mode: DuelMode;
  scope: "subject" | "unit" | "lesson";
  pack: string | null;
  enough: boolean;
};

/** وضع الشبح: منافس محاكى يلعب نفس الوضع والباك. نموذج أولي لا يمنح نقاط خبرة. */
export function GhostMode({ picker, mode, scope, pack, enough }: Props) {
  const start = useServerFn(startGhost);
  const grade = useServerFn(gradeGhostAnswer);

  const [level, setLevel] = useState<GhostLevel>("pro");
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const [qStart, setQStart] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [mine, setMine] = useState<Answer[]>([]);

  const total = ghost?.questions.length ?? 0;
  const finished = ghost !== null && idx >= total;
  const running = ghost !== null && !finished && !feedback;
  const spentSpeedMs = mine.reduce((n, a) => n + a.ms, 0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setClock(Date.now()), 200);
    return () => clearInterval(timer);
  }, [running]);

  const sinceQuestion = running ? clock - qStart : 0;
  const limitMs = ghost?.mode === "penalties" ? KICK_LIMIT : POINTS_LIMIT;
  const overtime =
    ghost?.mode === "speed"
      ? spentSpeedMs + sinceQuestion >= SPEED_TOTAL
      : sinceQuestion >= limitMs;
  useEffect(() => {
    if (running && overtime) settle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overtime, running]);

  async function begin() {
    setBusy(true);
    try {
      const g = await start({ data: { subject: "physics", mode, scope, pack, level } });
      setGhost(g);
      setIdx(0);
      setMine([]);
      setFeedback(null);
      setQStart(Date.now());
      setClock(Date.now());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر بدء وضع الشبح");
    } finally {
      setBusy(false);
    }
  }

  async function settle(optionId: string | null) {
    if (!ghost) return;
    const q = ghost.questions[idx];
    if (!q) return;
    const cap = ghost.mode === "speed" ? SPEED_TOTAL : limitMs;
    const ms = Math.min(cap, Date.now() - qStart);
    if (!optionId) {
      setMine((m) => [...m, { correct: false, ms }]);
      setFeedback({
        isCorrect: false,
        correctLabel: "",
        explanation: "",
        ready: true,
        timedOut: true,
      });
      return;
    }
    setFeedback({
      isCorrect: false,
      correctLabel: "",
      explanation: "",
      ready: false,
      timedOut: false,
    });
    try {
      const r = await grade({ data: { questionId: q.id, optionId } });
      setMine((m) => [...m, { correct: r.isCorrect, ms }]);
      setFeedback({ ...r, ready: true, timedOut: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تصحيح الإجابة");
      setMine((m) => [...m, { correct: false, ms }]);
      setFeedback({
        isCorrect: false,
        correctLabel: "",
        explanation: "",
        ready: true,
        timedOut: false,
      });
    }
  }

  function next() {
    const speedOver = ghost?.mode === "speed" && spentSpeedMs >= SPEED_TOTAL;
    setFeedback(null);
    setIdx(speedOver ? total : idx + 1);
    setQStart(Date.now());
    setClock(Date.now());
  }

  if (!ghost) {
    return (
      <div className="space-y-4">
        <Card className="space-y-4">
          <span className="inline-block rounded-full bg-warning/15 px-3 py-1 text-xs text-warning">
            نموذج أولي
          </span>
          <p className="text-sm leading-7 text-muted-foreground">
            تلعب ضد منافس محاكى بمستوى دقة تختاره، على نفس الوضع والباك. لا يمنح نقاط خبرة بعد.
          </p>
          {picker}
          <div role="radiogroup" aria-label="مستوى الشبح" className="grid grid-cols-3 gap-2">
            {GHOST_LEVELS.map((l) => (
              <button
                key={l.key}
                role="radio"
                aria-checked={level === l.key}
                onClick={() => setLevel(l.key)}
                className={cn(
                  "rounded-md border px-2 py-3 text-sm",
                  level === l.key
                    ? "border-primary bg-primary/15"
                    : "border-border text-muted-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          {!enough && (
            <p className="text-sm text-destructive">
              هذا الباك لا يكفي لهذا الوضع. اختر باكًا أكبر أو وضعًا آخر.
            </p>
          )}
          <button
            disabled={busy || !enough}
            onClick={begin}
            className="press rounded-lg bg-brand px-8 py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            ابدأ ضد الشبح
          </button>
        </Card>
      </div>
    );
  }

  const gm = ghost.mode;
  const upto = finished ? total : idx + (feedback ? 1 : 0);
  const myDone = mine.slice(0, upto);
  const ghostDone = ghost.plan.slice(0, upto);
  const myKicks = myDone.map((a) => a.correct);
  const ghostKicks = ghostDone.map((a) => a.correct);

  // أي سؤال لم يُجب عنه (انتهى الوقت الكلي) يُحتسب خطأً
  const myWrong = upto - myDone.filter((a) => a.correct).length;
  const ghostWrong = upto - ghostDone.filter((a) => a.correct).length;
  const myPoints = myDone.reduce((n, a) => n + (a.correct ? speedPoints(a.ms) : 0), 0);
  const ghostPoints = ghostDone.reduce((n, a) => n + (a.correct ? speedPoints(a.ms) : 0), 0);
  const myTime = myDone.reduce((n, a) => n + a.ms, 0) + myWrong * PENALTY_MS;
  const ghostTime = ghostDone.reduce((n, a) => n + a.ms, 0) + ghostWrong * PENALTY_MS;
  const myGoals = myKicks.filter(Boolean).length;
  const ghostGoals = ghostKicks.filter(Boolean).length;

  const show = (mineValue: number, ghostValue: number) =>
    gm === "speed"
      ? [`${(mineValue / 1000).toFixed(1)} ث`, `${(ghostValue / 1000).toFixed(1)} ث`]
      : [String(mineValue), String(ghostValue)];
  const [myText, ghostText] =
    gm === "points"
      ? show(myPoints, ghostPoints)
      : gm === "speed"
        ? show(myTime, ghostTime)
        : show(myGoals, ghostGoals);

  const board = (
    <div className="mb-4 grid grid-cols-2 gap-3 text-center">
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">أنت</p>
        <p className="text-2xl font-semibold">{myText}</p>
        {gm === "penalties" && <KickSlots kicks={myKicks} />}
      </Card>
      <Card className="p-3">
        <p className="truncate text-xs text-muted-foreground">{ghost.ghostName}</p>
        <p className="text-2xl font-semibold">{ghostText}</p>
        {gm === "penalties" && <KickSlots kicks={ghostKicks} />}
      </Card>
    </div>
  );

  if (finished) {
    const result =
      gm === "points"
        ? Math.sign(myPoints - ghostPoints)
        : gm === "speed"
          ? Math.sign(ghostTime - myTime)
          : Math.sign(myGoals - ghostGoals);
    return (
      <div className="space-y-4">
        {board}
        <Card className="space-y-3 text-center">
          <h2 className="text-2xl font-semibold">
            {result > 0 ? "تغلبت على الشبح" : result < 0 ? "سبقك الشبح" : "تعادل"}
          </h2>
          <button
            onClick={() => setGhost(null)}
            className="press rounded-lg bg-brand px-8 py-3 font-medium text-primary-foreground"
          >
            العب مرة أخرى
          </button>
        </Card>
      </div>
    );
  }

  const q = ghost.questions[idx];
  if (!q) return null;
  const leftMs =
    gm === "speed"
      ? Math.max(0, SPEED_TOTAL - spentSpeedMs - sinceQuestion)
      : Math.max(0, limitMs - sinceQuestion);
  const ghostAnswered = !feedback && sinceQuestion >= (ghost.plan[idx]?.ms ?? Infinity);
  const heading =
    gm === "penalties" ? `ركلة ${idx + 1} من ${total}` : `سؤال ${idx + 1} من ${total}`;

  return (
    <div>
      {board}
      <Card key={q.id}>
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{heading}</span>
          <span dir="ltr">{feedback ? "" : `${Math.ceil(leftMs / 1000)}s`}</span>
        </div>
        <p className="mb-5 text-lg leading-8">{q.prompt}</p>
        <div role="radiogroup" className="grid gap-3">
          {q.options.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={false}
              disabled={!!feedback}
              onClick={() => settle(o.id)}
              className="rounded-md border border-border px-4 py-3 text-start transition-colors hover:border-primary/60 disabled:cursor-default"
              dir="auto"
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-4 min-h-5 text-sm text-muted-foreground">
          {ghostAnswered ? "الشبح أجاب قبلك" : ""}
        </p>
        {feedback && (
          <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
            {!feedback.ready ? (
              <p>جارٍ التصحيح...</p>
            ) : feedback.timedOut ? (
              <p>انتهى الوقت.</p>
            ) : (
              <p>
                {feedback.isCorrect
                  ? gm === "penalties"
                    ? "هدف"
                    : "إجابة صحيحة"
                  : gm === "penalties"
                    ? "خارج"
                    : "إجابة غير صحيحة"}
              </p>
            )}
            {feedback.correctLabel && (
              <p>
                الإجابة الصحيحة: <b dir="auto">{feedback.correctLabel}</b>
              </p>
            )}
            {feedback.explanation && (
              <p className="text-muted-foreground">{feedback.explanation}</p>
            )}
            <p className="text-muted-foreground">
              {ghost.ghostName}:{" "}
              {ghost.plan[idx]?.correct
                ? gm === "penalties"
                  ? "سجّل هدفًا"
                  : "أصاب"
                : gm === "penalties"
                  ? "أخطأ الركلة"
                  : "لم يصب"}
            </p>
            {feedback.ready && (
              <button
                onClick={next}
                className="press rounded-lg bg-brand px-6 py-2 font-medium text-primary-foreground"
              >
                {idx + 1 >= total ? "النتيجة" : "التالي"}
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
