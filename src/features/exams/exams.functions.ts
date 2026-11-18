/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";

export type AiExamQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  svgDiagram?: string;
};
export type GenerateExamResult =
  | { ok: true; examId: string; examTitle: string; questions: AiExamQuestion[]; provider: string }
  | { ok: false; message: string };
const generateExamSchema = z.object({
  subject: z.enum(["physics", "chemistry"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  count: z.number().int().min(3).max(10),
  topic: z.string().max(120).optional(),
});

const EXAM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["examTitle", "questions"],
  properties: {
    examTitle: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "prompt", "options", "correctIndex", "explanation", "svgDiagram"],
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
          svgDiagram: { type: "string" },
        },
      },
    },
  },
};

export const generateAiExam = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => generateExamSchema.parse(d))
  .handler(async ({ data, context }): Promise<GenerateExamResult> => {
    const { AiProviderError } = await import("@/lib/ai/provider-error");
    const { generateJson, getModel } = await import("@/lib/ai/provider.server");
    const { getStudentAdaptiveSummary } = await import("@/lib/ai/student-context.server");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const db = context.db as import("@/lib/db/index.server").Db;
    const recent = await db
      .prepare("SELECT COUNT(*) AS n FROM ai_generated_exams WHERE user_id = ? AND created_at >= ?")
      .bind(context.userId, oneHourAgo)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= 5)
      return {
        ok: false,
        message: "وصلت الحد الأقصى لعدد الامتحانات في الساعة (5 امتحانات). حاول بعد قليل.",
      };
    const student = await getStudentAdaptiveSummary(context.userId);
    const subjectAr = data.subject === "physics" ? "الفيزياء" : "الكيمياء";
    const diffAr =
      data.difficulty === "easy"
        ? "تمهيدي"
        : data.difficulty === "medium"
          ? "ثانوية عامة قياسي"
          : "متفوقين وتحدي";
    const topicPart = data.topic?.trim()
      ? `في موضوع: ${data.topic.trim()}`
      : student.weakConcepts.length
        ? `مع التركيز على نقاط تحتاج تقوية (${student.weakConcepts.join("، ")}) وموضوعات متنوعة من المنهج`
        : "في موضوعات متنوعة من المنهج";
    const systemPrompt = [
      `أنت خبير وضع امتحانات ${subjectAr} للصف الثالث الثانوي في مصر.`,
      student.promptSummary,
      `أنشئ ${data.count} أسئلة اختيار من متعدد ${topicPart} بمستوى ${diffAr}.`,
      `أرجع JSON صالحًا فقط بالشكل: {"examTitle":"عنوان","questions":[{"id":"q1","prompt":"السؤال","options":["أ","ب","ج","د"],"correctIndex":0,"explanation":"التفسير","svgDiagram":"<svg...> أو نص فارغ إن لم يلزم رسم"}]}`,
      "تأكد من وجود أربعة اختيارات وفهرس إجابة صحيح من 0 إلى 3 لكل سؤال.",
    ].join("\n");
    const provider = { name: "openrouter", model: getModel() };
    try {
      const { data: parsed } = await generateJson<{
        examTitle?: string;
        questions?: AiExamQuestion[];
      }>({
        schemaName: "exam",
        schema: EXAM_JSON_SCHEMA,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `أنشئ امتحان ${subjectAr} من ${data.count} أسئلة الآن.` },
        ],
        maxTokens: 4096,
      });
      if (
        !Array.isArray(parsed.questions) ||
        parsed.questions.length !== data.count ||
        parsed.questions.some(
          (q) =>
            !q.prompt ||
            !Array.isArray(q.options) ||
            q.options.length !== 4 ||
            !Number.isInteger(q.correctIndex) ||
            q.correctIndex < 0 ||
            q.correctIndex > 3,
        )
      )
        return { ok: false, message: "الأسئلة المولّدة لم تجتز التحقق. حاول إنشاء امتحان جديد." };
      const examTitle = parsed.examTitle || `امتحان ${subjectAr} (${diffAr})`;
      const examId = crypto.randomUUID();
      let saveFailed = false;
      try {
        await db
          .prepare(
            `INSERT INTO ai_generated_exams
               (id, user_id, subject, difficulty, topic, exam_title, questions, answers, submitted, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 0, ?)`,
          )
          .bind(
            examId,
            context.userId,
            data.subject,
            data.difficulty,
            data.topic?.trim() || null,
            examTitle,
            JSON.stringify(parsed.questions),
            new Date().toISOString(),
          )
          .run();
      } catch (dbErr) {
        console.error("exam persistence failed", dbErr instanceof Error ? dbErr.message : dbErr);
        saveFailed = true;
      }
      if (saveFailed)
        return {
          ok: false,
          message: "تم إنشاء الامتحان لكن تعذّر حفظه. راجع إعدادات قاعدة البيانات ثم حاول مجددًا.",
        };
      return {
        ok: true,
        examId,
        examTitle,
        questions: parsed.questions,
        provider: provider.name,
      };
    } catch (e) {
      const status = e instanceof AiProviderError ? e.status : 500;
      console.error("generateAiExam error", status, e instanceof Error ? e.message : e);
      if (status === 401 || status === 403 || status === 400)
        return {
          ok: false,
          message: "تعذّر الاتصال بخدمة الذكاء الاصطناعي. راجع مفتاح OPENROUTER_API_KEY.",
        };
      if (status === 429 || status === 503)
        return { ok: false, message: "المساعد مشغول حاليًا. حاول بعد قليل." };
      return { ok: false, message: "حدث خطأ أثناء توليد الامتحان. حاول مرة أخرى." };
    }
  });

export const saveExamResult = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        examId: z.string().uuid(),
        answers: z.record(z.string(), z.number().int().min(0).max(3)),
        score: z.number().int().min(0).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    const exam = await db
      .prepare("SELECT questions FROM ai_generated_exams WHERE id = ? AND user_id = ?")
      .bind(data.examId, context.userId)
      .first<{ questions: string }>();
    if (!exam) throw new Error("الامتحان غير موجود.");
    const questions = JSON.parse(exam.questions) as AiExamQuestion[];
    if (data.score > questions.length) throw new Error("نتيجة غير صالحة.");
    try {
      await db
        .prepare(
          `UPDATE ai_generated_exams
              SET answers = ?, score = ?, submitted = 1, completed_at = ?
            WHERE id = ? AND user_id = ?`,
        )
        .bind(
          JSON.stringify(data.answers),
          data.score,
          new Date().toISOString(),
          data.examId,
          context.userId,
        )
        .run();
    } catch {
      throw new Error("تعذّر حفظ نتيجة الامتحان.");
    }
    try {
      const { tryTouchStreak } = await import("@/lib/engagement/streak.server");
      await tryTouchStreak(db, context.userId as string);
    } catch (err) {
      console.error("[streak] exam", err);
    }
    if (data.score > 0) {
      try {
        const { awardCompetitionPoints } = await import("@/lib/engagement/competition.server");
        await awardCompetitionPoints(db, context.userId as string, data.score * 5);
      } catch (err) {
        console.error("[competition] exam points failed", err);
      }
    }
    return { ok: true };
  });

export const listSavedExams = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = context.db as import("@/lib/db/index.server").Db;
    try {
      const { results } = await db
        .prepare(
          `SELECT id, subject, difficulty, topic, exam_title, score, submitted, created_at
             FROM ai_generated_exams WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
        )
        .bind(context.userId)
        .all<any>();
      return results.map((r) => ({ ...r, submitted: r.submitted === 1 }));
    } catch {
      throw new Error("تعذّر تحميل سجل الامتحانات.");
    }
  });
