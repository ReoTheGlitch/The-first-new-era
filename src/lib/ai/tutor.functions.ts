/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import type { Db } from "@/lib/db/index.server";
import type { TutorResult } from "./types";

export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    return { configured: true, provider: "openrouter" };
  });

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});
const req = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  style: z.enum(["balanced", "simple", "examples", "socratic"]),
  length: z.enum(["concise", "detailed"]),
  subject: z.enum(["physics", "chemistry"]).nullable().optional(),
  conversationId: z.string().uuid().nullable().optional(),
});
const STYLE: Record<string, string> = {
  balanced: "اشرح بوضوح وتوازن بين الفكرة والمثال.",
  simple: "اشرح بأبسط لغة ممكنة كأنك تشرح لمبتدئ.",
  examples: "اعتمد على أمثلة محلولة خطوة بخطوة.",
  socratic: "وجّه الطالب بأسئلة متتابعة ليصل للإجابة بنفسه.",
};

export const listTutorConversations = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    try {
      const { results } = await (context.db as Db)
        .prepare(
          `SELECT id, title, subject, updated_at, created_at FROM ai_chat_conversations
            WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30`,
        )
        .bind(context.userId)
        .all<{
          id: string;
          title: string;
          subject: string | null;
          updated_at: string;
          created_at: string;
        }>();
      return results;
    } catch {
      throw new Error("تعذّر تحميل المحادثات المحفوظة.");
    }
  });

export const loadTutorConversation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.db as Db;
    const conversation = await db
      .prepare("SELECT id, title, subject FROM ai_chat_conversations WHERE id = ? AND user_id = ?")
      .bind(data.conversationId, context.userId)
      .first<{ id: string; title: string; subject: string | null }>();
    if (!conversation) throw new Error("المحادثة غير موجودة أو لا تملك صلاحية الوصول إليها.");
    let messages: Array<{ role: "user" | "assistant"; content: string; created_at: string }>;
    try {
      ({ results: messages } = await db
        .prepare(
          `SELECT role, content, created_at FROM ai_chat_messages
            WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC, rowid ASC`,
        )
        .bind(data.conversationId, context.userId)
        .all<{ role: "user" | "assistant"; content: string; created_at: string }>());
    } catch {
      throw new Error("تعذّر تحميل رسائل المحادثة.");
    }
    return { conversation, messages };
  });

export const deleteTutorConversation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      // ai_chat_messages rows go with it (ON DELETE CASCADE).
      await (context.db as Db)
        .prepare("DELETE FROM ai_chat_conversations WHERE id = ? AND user_id = ?")
        .bind(data.conversationId, context.userId)
        .run();
    } catch {
      throw new Error("تعذّر حذف المحادثة.");
    }
    return { ok: true };
  });

/** Fire-and-forget audit row; also what the hourly rate limit counts. */
function logInteraction(
  db: Db,
  i: {
    userId: string;
    provider: string;
    model: string;
    promptChars: number;
    responseChars: number;
    status: string;
  },
) {
  db.prepare(
    `INSERT INTO ai_interactions (id, user_id, provider, model, prompt_chars, response_chars, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      i.userId,
      i.provider,
      i.model,
      i.promptChars,
      i.responseChars,
      i.status,
      new Date().toISOString(),
    )
    .run()
    .then(undefined, () => {});
}

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => req.parse(d))
  .handler(async ({ data, context }): Promise<TutorResult & { conversationId?: string }> => {
    const { AI_LIMITS, getModel } = await import("./config.server");
    const { AiProviderError } = await import("./provider-error");
    const { generateText } = await import("./provider.server");
    const { getStudentAdaptiveSummary } = await import("./student-context.server");
    const db = context.db as Db;
    const last = data.messages[data.messages.length - 1]!;
    if (last.role !== "user" || last.content.length > AI_LIMITS.maxMessageChars)
      return {
        ok: false,
        code: "provider_error",
        message: `الرسالة طويلة جدًا (الحد ${AI_LIMITS.maxMessageChars} حرف).`,
      };

    const [rateLimitOk, student] = await Promise.all([
      (async () => {
        try {
          const since = new Date(Date.now() - 3_600_000).toISOString();
          const row = await db
            .prepare(
              "SELECT COUNT(*) AS n FROM ai_interactions WHERE user_id = ? AND created_at >= ?",
            )
            .bind(context.userId, since)
            .first<{ n: number }>();
          return (row?.n ?? 0) < AI_LIMITS.requestsPerHour;
        } catch {
          return true;
        }
      })(),
      getStudentAdaptiveSummary(context.userId),
    ]);
    if (!rateLimitOk)
      return {
        ok: false,
        code: "rate_limited",
        message: "وصلت للحد المسموح من الأسئلة هذه الساعة. حاول لاحقًا.",
      };

    const subject =
      data.subject === "physics"
        ? "الفيزياء"
        : data.subject === "chemistry"
          ? "الكيمياء"
          : "الفيزياء والكيمياء";
    const system = [
      `أنت مدرس مساعد ذكي متكيف لطلاب الصف الثالث الثانوي في مصر في مادة ${subject}.`,
      student.promptSummary,
      "أجب بالعربية الفصحى المبسطة. اكتب المعادلات بصيغة LaTeX بين $...$.",
      STYLE[data.style],
      data.length === "concise"
        ? "اجعل الإجابة مختصرة (فقرة أو فقرتان)."
        : "قدّم شرحًا مفصلًا منظمًا بعناوين قصيرة.",
      "يمكنك إنشاء أسئلة تدريبية عند طلب ذلك.",
      'إذا احتاج المفهوم إلى رسم، أخرج SVG داخل كتلة ```svg ... ``` بأبعاد viewBox="0 0 400 220".',
      "شرحك مولّد وليس من الكتاب المدرسي الرسمي. لا تدّعِ أنه رسمي، وصرّح عند عدم التأكد.",
    ]
      .filter(Boolean)
      .join("\n");

    const provider = { name: "openrouter", model: getModel() };
    const history = data.messages.slice(-AI_LIMITS.maxHistoryMessages);
    let conversationId = data.conversationId ?? undefined;
    try {
      const nowIso = () => new Date().toISOString();
      if (conversationId) {
        const owned = await db
          .prepare("SELECT id FROM ai_chat_conversations WHERE id = ? AND user_id = ?")
          .bind(conversationId, context.userId)
          .first();
        if (!owned) throw new Error("المحادثة غير متاحة.");
      } else {
        const title = last.content.slice(0, 72) || "محادثة جديدة";
        const id = crypto.randomUUID();
        try {
          await db
            .prepare(
              `INSERT INTO ai_chat_conversations (id, user_id, title, subject, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .bind(id, context.userId, title, data.subject ?? null, nowIso(), nowIso())
            .run();
        } catch {
          throw new Error("تعذّر إنشاء محادثة محفوظة.");
        }
        conversationId = id;
      }
      const saveMessage = (role: "user" | "assistant", content: string) =>
        db
          .prepare(
            `INSERT INTO ai_chat_messages (id, conversation_id, user_id, role, content, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(crypto.randomUUID(), conversationId, context.userId, role, content, nowIso())
          .run();
      try {
        await saveMessage("user", last.content);
      } catch {
        throw new Error("تعذّر حفظ رسالتك.");
      }
      try {
        const { tryTouchStreak } = await import("@/lib/engagement/streak.server");
        await tryTouchStreak(db, context.userId as string);
      } catch (err) {
        console.error("[streak] tutor", err);
      }

      // Gemini (via OpenRouter) requires the conversation to start with a user turn.
      const firstUser = history.findIndex((m) => m.role === "user");
      const turns = firstUser >= 0 ? history.slice(firstUser) : history;
      const { text } = await generateText({
        messages: [{ role: "system", content: system }, ...turns],
        maxTokens: AI_LIMITS.maxOutputTokens,
      });
      try {
        await saveMessage("assistant", text);
      } catch (assistantSaveError) {
        console.error(
          "assistant message persistence failed",
          assistantSaveError instanceof Error ? assistantSaveError.message : assistantSaveError,
        );
      }
      await db
        .prepare("UPDATE ai_chat_conversations SET updated_at = ? WHERE id = ? AND user_id = ?")
        .bind(nowIso(), conversationId, context.userId)
        .run();
      logInteraction(db, {
        userId: context.userId as string,
        provider: provider.name,
        model: provider.model,
        promptChars: last.content.length,
        responseChars: text.length,
        status: "ok",
      });
      return { ok: true, text, provider: provider.name, model: provider.model, conversationId };
    } catch (e) {
      const status = e instanceof AiProviderError ? e.status : 500;
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("ai tutor error", status, errMsg);
      logInteraction(db, {
        userId: context.userId as string,
        provider: provider.name,
        model: provider.model,
        promptChars: last.content.length,
        responseChars: 0,
        status: `error_${status}`,
      });
      if (status === 429 || status === 503)
        return {
          ok: false,
          code: "rate_limited",
          message: "المساعد مشغول حاليًا. انتظر قليلًا ثم حاول مجددًا.",
        };
      if (status === 401 || status === 403 || status === 400)
        return {
          ok: false,
          code: "denied",
          message:
            "تعذّر الوصول إلى خدمة الذكاء الاصطناعي. راجع قيمة OPENROUTER_API_KEY في أسرار الـ Worker.",
        };
      return {
        ok: false,
        code: "provider_error",
        message:
          e instanceof Error && e.message.includes("محادثة")
            ? e.message
            : "حدث خطأ أثناء إنشاء الرد. حاول مرة أخرى.",
      };
    }
  });
