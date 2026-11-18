import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TutorResult } from "./types";

export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { resolveProvider } = await import("./config.server");
    const p = resolveProvider();
    return { configured: p.kind !== "none", provider: p.kind };
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_chat_conversations")
      .select("id,title,subject,updated_at,created_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw new Error("تعذّر تحميل المحادثات المحفوظة.");
    return (data ?? []) as unknown as Array<{
      id: string;
      title: string;
      subject: string | null;
      updated_at: string;
      created_at: string;
    }>;
  });

export const loadTutorConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conversation, error: conversationError } = await context.supabase
      .from("ai_chat_conversations")
      .select("id,title,subject")
      .eq("id", data.conversationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (conversationError || !conversation)
      throw new Error("المحادثة غير موجودة أو لا تملك صلاحية الوصول إليها.");
    const { data: messages, error } = await context.supabase
      .from("ai_chat_messages")
      .select("role,content,created_at")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error("تعذّر تحميل رسائل المحادثة.");
    return {
      conversation,
      messages: (messages ?? []) as unknown as Array<{
        role: "user" | "assistant";
        content: string;
        created_at: string;
      }>,
    };
  });

export const deleteTutorConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_chat_conversations")
      .delete()
      .eq("id", data.conversationId)
      .eq("user_id", context.userId);
    if (error) throw new Error("تعذّر حذف المحادثة.");
    return { ok: true };
  });

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => req.parse(d))
  .handler(async ({ data, context }): Promise<TutorResult & { conversationId?: string }> => {
    const { resolveProvider, AI_LIMITS } = await import("./config.server");
    const { AiProviderError } = await import("./provider-error");
    const { createGeminiProvider } = await import("./gemini-adapter.server");
    const { getStudentAdaptiveSummary } = await import("./student-context.server");
    const { hasSupabaseAdminEnv, supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const choice = resolveProvider();
    if (choice.kind === "none")
      return {
        ok: false,
        code: "not_configured",
        message: "المساعد الذكي يحتاج إلى إعداد GEMINI_API_KEY أولًا.",
      };
    const last = data.messages[data.messages.length - 1]!;
    if (last.role !== "user" || last.content.length > AI_LIMITS.maxMessageChars)
      return {
        ok: false,
        code: "provider_error",
        message: `الرسالة طويلة جدًا (الحد ${AI_LIMITS.maxMessageChars} حرف).`,
      };

    const [rateLimitOk, student] = await Promise.all([
      (async () => {
        if (!hasSupabaseAdminEnv) return true;
        try {
          const since = new Date(Date.now() - 3_600_000).toISOString();
          const { count } = await supabaseAdmin
            .from("ai_interactions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", context.userId)
            .gte("created_at", since);
          return (count ?? 0) < AI_LIMITS.requestsPerHour;
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

    const provider = createGeminiProvider(choice);
    const history = data.messages.slice(-AI_LIMITS.maxHistoryMessages);
    let conversationId = data.conversationId ?? undefined;
    try {
      // Create or verify the conversation using the authenticated Supabase client (RLS applies).
      if (conversationId) {
        const { data: owned } = await context.supabase
          .from("ai_chat_conversations")
          .select("id")
          .eq("id", conversationId)
          .eq("user_id", context.userId)
          .maybeSingle();
        if (!owned) throw new Error("المحادثة غير متاحة.");
      } else {
        const title = last.content.slice(0, 72) || "محادثة جديدة";
        const { data: created, error } = await context.supabase
          .from("ai_chat_conversations")
          .insert({ user_id: context.userId, title, subject: data.subject ?? null })
          .select("id")
          .single();
        if (error || !created) throw new Error("تعذّر إنشاء محادثة محفوظة.");
        conversationId = (created as unknown as { id: string }).id;
      }
      const { error: userSaveError } = await context.supabase.from("ai_chat_messages").insert({
        conversation_id: conversationId,
        user_id: context.userId,
        role: "user",
        content: last.content,
      });
      if (userSaveError) throw new Error("تعذّر حفظ رسالتك.");

      const text = await provider.generate(system, history, AI_LIMITS.maxOutputTokens);
      const { error: assistantSaveError } = await context.supabase.from("ai_chat_messages").insert({
        conversation_id: conversationId,
        user_id: context.userId,
        role: "assistant",
        content: text,
      });
      if (assistantSaveError)
        console.error("assistant message persistence failed", assistantSaveError.message);
      await context.supabase
        .from("ai_chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("user_id", context.userId);
      if (hasSupabaseAdminEnv)
        supabaseAdmin
          .from("ai_interactions")
          .insert({
            user_id: context.userId,
            provider: provider.name,
            model: provider.model,
            prompt_chars: last.content.length,
            response_chars: text.length,
            status: "ok",
          })
          .then(undefined, () => {});
      return { ok: true, text, provider: provider.name, model: provider.model, conversationId };
    } catch (e) {
      const status = e instanceof AiProviderError ? e.status : 500;
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("ai tutor error", status, errMsg);
      if (hasSupabaseAdminEnv)
        supabaseAdmin
          .from("ai_interactions")
          .insert({
            user_id: context.userId,
            provider: provider.name,
            model: provider.model,
            prompt_chars: last.content.length,
            status: `error_${status}`,
          })
          .then(undefined, () => {});
      if (status === 429 || status === 503)
        return {
          ok: false,
          code: "rate_limited",
          message: "Gemini مشغول حاليًا. انتظر قليلًا ثم حاول مجددًا.",
        };
      if (status === 401 || status === 403 || status === 400)
        return {
          ok: false,
          code: "denied",
          message: "تعذّر الوصول إلى Gemini. راجع قيمة GEMINI_API_KEY في إعدادات Vercel.",
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
