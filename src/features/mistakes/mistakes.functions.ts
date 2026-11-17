/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { classifyMistake } from "./classify";

export type MistakeItem = {
  questionId: string;
  conceptId: string;
  lessonId: string;
  lessonTitle: string;
  subjectSlug: string;
  subjectName: string;
  prompt: string;
  chosenLabel: string | null;
  correctLabel: string;
  explanation: string | null;
  cause: ReturnType<typeof classifyMistake>;
  wrongCount: number;
  lastAt: string;
};

/**
 * دفتر الأخطاء: كل سؤال كانت آخر إجابة عنه خاطئة (من التدريب أو من التحديات).
 * يخرج السؤال من الدفتر تلقائيًا عندما تجيب عنه صحيحًا.
 */
export const getMistakes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const [practice, duels] = await Promise.all([
      db
        .from("attempt_answers")
        .select("question_id, option_id, is_correct, answered_at")
        .eq("user_id", context.userId)
        .order("answered_at", { ascending: false })
        .limit(1000),
      db
        .from("duel_answers")
        .select("question_id, option_id, is_correct, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    type Row = { question_id: string; option_id: string | null; is_correct: boolean; at: string };
    const rows: Row[] = [
      ...(practice.data ?? []).map((r: any) => ({
        question_id: r.question_id,
        option_id: r.option_id,
        is_correct: r.is_correct,
        at: r.answered_at,
      })),
      ...(duels.data ?? []).map((r: any) => ({
        question_id: r.question_id,
        option_id: r.option_id,
        is_correct: r.is_correct,
        at: r.created_at,
      })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));

    const latest = new Map<string, Row>();
    const wrongCount = new Map<string, number>();
    const everWrong = new Set<string>();
    for (const r of rows) {
      if (!latest.has(r.question_id)) latest.set(r.question_id, r);
      if (!r.is_correct) {
        wrongCount.set(r.question_id, (wrongCount.get(r.question_id) ?? 0) + 1);
        everWrong.add(r.question_id);
      }
    }
    const open = [...latest.values()].filter((r) => !r.is_correct).slice(0, 60);
    const resolved = [...everWrong].filter((id) => latest.get(id)?.is_correct).length;
    if (!open.length) return { items: [] as MistakeItem[], resolved };

    const { data: qs } = await db
      .from("questions")
      .select(
        "id, prompt_ar, explanation_ar, concept_id, concepts(id, lesson_id, lessons(id, title_ar, units(courses(subjects(slug, name_ar))))), question_options(id, label_ar, is_correct)",
      )
      .in(
        "id",
        open.map((r) => r.question_id),
      );
    const byId = new Map<string, any>((qs ?? []).map((q: any) => [q.id, q]));

    const items: MistakeItem[] = open.flatMap((r) => {
      const q = byId.get(r.question_id);
      if (!q) return [];
      const options: { id: string; label_ar: string; is_correct: boolean }[] =
        q.question_options ?? [];
      const correct = options.find((o) => o.is_correct)?.label_ar ?? "";
      const chosen = options.find((o) => o.id === r.option_id)?.label_ar ?? null;
      return [
        {
          questionId: q.id,
          conceptId: q.concept_id,
          lessonId: q.concepts?.lessons?.id ?? "",
          lessonTitle: q.concepts?.lessons?.title_ar ?? "",
          subjectSlug: q.concepts?.lessons?.units?.courses?.subjects?.slug ?? "",
          subjectName: q.concepts?.lessons?.units?.courses?.subjects?.name_ar ?? "",
          prompt: q.prompt_ar,
          chosenLabel: chosen,
          correctLabel: correct,
          explanation: q.explanation_ar,
          cause: classifyMistake(correct, chosen),
          wrongCount: wrongCount.get(q.id) ?? 1,
          lastAt: r.at,
        },
      ];
    });
    return { items, resolved };
  });
