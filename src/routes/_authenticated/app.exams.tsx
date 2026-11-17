import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { Card, PageHeader } from "@/components/common";
import {
  generateAiExam,
  saveExamResult,
  listSavedExams,
  type AiExamQuestion,
} from "@/features/exams/exams.functions";
import { sanitizeSvg } from "@/lib/sanitize-svg";

export const Route = createFileRoute("/_authenticated/app/exams")({
  head: () => ({
    meta: [
      { title: "الامتحانات — العصر الجديد الأول" },
      {
        name: "description",
        content: "اختبر نفسك بامتحانات متجددة يولّدها الذكاء الاصطناعي حسب مستواك.",
      },
    ],
  }),
  component: ExamsPage,
});

function ExamsPage() {
  const runGenerateExam = useServerFn(generateAiExam);
  const persistExamResult = useServerFn(saveExamResult);
  const getSavedExams = useServerFn(listSavedExams);
  const [examId, setExamId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      subject: string;
      exam_title: string;
      score: number | null;
      submitted: boolean;
      created_at: string;
    }>
  >([]);
  const [subject, setSubject] = useState<"physics" | "chemistry">("physics");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState<number>(5);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const [examTitle, setExamTitle] = useState("");
  const [questions, setQuestions] = useState<AiExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  async function refreshHistory() {
    try {
      const rows = await getSavedExams();
      setHistory(rows as typeof history);
    } catch {
      /* history remains optional */
    }
  }
  useEffect(() => {
    void refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startExam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await runGenerateExam({
        data: { subject, difficulty, count, topic: topic.trim() || undefined },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setExamId(res.examId);
      setExamTitle(res.examTitle);
      setQuestions(res.questions);
      await refreshHistory();
      setAnswers({});
      setSubmitted(false);
    } catch {
      toast.error("تعذّر إنشاء الامتحان. حاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }

  const score = questions.reduce((acc, q) => (answers[q.id] === q.correctIndex ? acc + 1 : acc), 0);
  async function submitExam() {
    if (!examId) return;
    try {
      await persistExamResult({ data: { examId, answers, score } });
      setSubmitted(true);
      await refreshHistory();
      toast.success("تم حفظ إجابتك ونتيجتك في سجل الامتحانات.");
    } catch {
      toast.error("تعذّر حفظ النتيجة. حاول مرة أخرى.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الامتحانات"
        subtitle="اختبر نفسك بامتحان يولّده الذكاء الاصطناعي بأسئلة جديدة في كل مرة."
        icon="exams"
      />

      <Card className="p-5">
        <form onSubmit={startExam} className="grid gap-4 sm:grid-cols-4">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">المادة</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as "physics" | "chemistry")}
              className="w-full rounded-xl border border-input bg-muted/60 px-3 py-2.5 text-sm"
            >
              <option value="physics">الفيزياء</option>
              <option value="chemistry">الكيمياء</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">المستوى</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
              className="w-full rounded-xl border border-input bg-muted/60 px-3 py-2.5 text-sm"
            >
              <option value="easy">تمهيدي</option>
              <option value="medium">قياسي (ثانوية عامة)</option>
              <option value="hard">متفوقين</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">عدد الأسئلة</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-muted/60 px-3 py-2.5 text-sm"
            >
              <option value={3}>3 أسئلة</option>
              <option value={5}>5 أسئلة</option>
              <option value={10}>10 أسئلة</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">موضوع محدد (اختياري)</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: قانون أوم، الحث..."
              className="w-full rounded-xl border border-input bg-muted/60 px-3 py-2.5 text-sm"
            />
          </label>

          <div className="sm:col-span-4">
            <button
              type="submit"
              disabled={busy}
              className="press rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "جاري توليد امتحان جديد..." : "إنشاء امتحان جديد"}
            </button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">سجل امتحاناتك</h2>
          <span className="text-xs text-muted-foreground">آخر 20 امتحانًا</span>
        </div>
        {history.length ? (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.exam_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.subject === "physics" ? "فيزياء" : "كيمياء"} ·{" "}
                    {new Date(item.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.submitted && item.score !== null
                    ? `النتيجة: ${item.score}`
                    : "لم يُصحح بعد"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">ستظهر امتحاناتك هنا بعد إنشاء أول امتحان.</p>
        )}
      </Card>

      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{examTitle}</h2>
            {submitted && (
              <span className="rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold">
                النتيجة: {score} / {questions.length}
              </span>
            )}
          </div>

          {questions.map((q, idx) => {
            const chosen = answers[q.id];
            const safeDiagram = q.svgDiagram ? sanitizeSvg(q.svgDiagram) : null;
            return (
              <Card key={q.id || idx} className="space-y-4 p-5">
                <div className="font-medium leading-relaxed [&_p]:inline">
                  <span>{idx + 1}. </span>
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {q.prompt}
                  </ReactMarkdown>
                </div>

                {safeDiagram && (
                  <div
                    className="overflow-x-auto rounded-xl border border-border bg-background/60 p-3 [&_svg]:mx-auto [&_svg]:max-h-64 [&_svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: safeDiagram }}
                  />
                )}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosen === optIdx;
                    const isCorrect = q.correctIndex === optIdx;
                    let stateClass = "border-border hover:border-primary/60";
                    if (submitted) {
                      if (isCorrect) stateClass = "border-success bg-success/10 text-success";
                      else if (isSelected && !isCorrect)
                        stateClass = "border-destructive bg-destructive/10 text-destructive";
                    } else if (isSelected) {
                      stateClass = "border-primary bg-primary/10";
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                        className={`rounded-xl border px-4 py-3 text-start text-sm transition-colors [&_p]:inline ${stateClass}`}
                      >
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {opt}
                        </ReactMarkdown>
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground [&_p]:inline">
                    <strong className="text-foreground">التفسير: </strong>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {q.explanation}
                    </ReactMarkdown>
                  </div>
                )}
              </Card>
            );
          })}

          {!submitted && (
            <button
              type="button"
              onClick={submitExam}
              className="press rounded-xl bg-brand px-6 py-3 font-medium text-primary-foreground"
            >
              تصحيح الامتحان
            </button>
          )}
        </div>
      )}
    </div>
  );
}
