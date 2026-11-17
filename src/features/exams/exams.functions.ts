/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const generateAiExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => generateExamSchema.parse(d))
  .handler(async ({ data, context }): Promise<GenerateExamResult> => {
    const { resolveProvider } = await import("@/lib/ai/config.server");
    const { AiProviderError } = await import("@/lib/ai/provider-error");
    const { createGeminiProvider } = await import("@/lib/ai/gemini-adapter.server");
    const { getStudentAdaptiveSummary } = await import("@/lib/ai/student-context.server");
    const choice = resolveProvider();
    if (choice.kind === "none")
      return {
        ok: false,
        message: "توليد الامتحانات يحتاج إلى إعداد GEMINI_API_KEY في إعدادات السيرفر.",
      };
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await (context.supabase as any)
      .from("ai_generated_exams")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= 5)
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
      `أرجع JSON صالحًا فقط بالشكل: {"examTitle":"عنوان","questions":[{"id":"q1","prompt":"السؤال","options":["أ","ب","ج","د"],"correctIndex":0,"explanation":"التفسير","svgDiagram":"<svg...> (اختياري)"}]}`,
      "تأكد من وجود أربعة اختيارات وفهرس إجابة صحيح من 0 إلى 3 لكل سؤال.",
    ].join("\n");
    const provider = createGeminiProvider(choice, { responseMimeType: "application/json" });
    try {
      const raw = await provider.generate(
        systemPrompt,
        [{ role: "user", content: `أنشئ امتحان ${subjectAr} من ${data.count} أسئلة الآن.` }],
        4096,
      );
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned) as {
        examTitle?: string;
        questions?: AiExamQuestion[];
      };
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
      const { data: saved, error } = await (context.supabase as any)
        .from("ai_generated_exams")
        .insert({
          user_id: context.userId,
          subject: data.subject,
          difficulty: data.difficulty,
          topic: data.topic?.trim() || null,
          exam_title: examTitle,
          questions: parsed.questions,
          answers: {},
          submitted: false,
        })
        .select("id")
        .single();
      if (error || !saved)
        return {
          ok: false,
          message: "تم إنشاء الامتحان لكن تعذّر حفظه. راجع إعدادات قاعدة البيانات ثم حاول مجددًا.",
        };
      return {
        ok: true,
        examId: (saved as unknown as { id: string }).id,
        examTitle,
        questions: parsed.questions,
        provider: provider.name,
      };
    } catch (e) {
      const status = e instanceof AiProviderError ? e.status : 500;
      console.error("generateAiExam error", status, e instanceof Error ? e.message : e);
      if (status === 401 || status === 403 || status === 400)
        return { ok: false, message: "تعذّر الاتصال بـ Gemini. راجع مفتاح GEMINI_API_KEY." };
      if (status === 429 || status === 503)
        return { ok: false, message: "Gemini مشغول حاليًا. حاول بعد قليل." };
      return { ok: false, message: "حدث خطأ أثناء توليد الامتحان. حاول مرة أخرى." };
    }
  });

export const saveExamResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { data: exam, error: readError } = await (context.supabase as any)
      .from("ai_generated_exams")
      .select("questions")
      .eq("id", data.examId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readError || !exam) throw new Error("الامتحان غير موجود.");
    const questions = (exam as unknown as { questions: AiExamQuestion[] }).questions;
    if (data.score > questions.length) throw new Error("نتيجة غير صالحة.");
    const { error } = await (context.supabase as any)
      .from("ai_generated_exams")
      .update({
        answers: data.answers,
        score: data.score,
        submitted: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.examId)
      .eq("user_id", context.userId);
    if (error) throw new Error("تعذّر حفظ نتيجة الامتحان.");
    return { ok: true };
  });

export const listSavedExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("ai_generated_exams")
      .select("id,subject,difficulty,topic,exam_title,score,submitted,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("تعذّر تحميل سجل الامتحانات.");
    return data ?? [];
  });
