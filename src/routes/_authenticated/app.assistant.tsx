import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  askTutor,
  getAiStatus,
  listTutorConversations,
  loadTutorConversation,
  deleteTutorConversation,
} from "@/lib/ai/tutor.functions";
import type { ChatMessage, TutorLength, TutorStyle } from "@/lib/ai/types";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { Card, PageHeader, SkeletonBlock, StatusBadge } from "@/components/common";
import { AppIcon } from "@/components/icons/AppIcon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/assistant")({
  head: () => ({
    meta: [
      { title: "المساعد الذكي — العصر الجديد الأول" },
      { name: "description", content: "مساعد تعلم يشرح المفاهيم بأساليب مختلفة." },
    ],
  }),
  component: Assistant,
});

const styles: { v: TutorStyle; l: string }[] = [
  { v: "balanced", l: "متوازن" },
  { v: "simple", l: "مبسّط" },
  { v: "examples", l: "بالأمثلة" },
  { v: "socratic", l: "بالأسئلة" },
];

function Assistant() {
  const status = useServerFn(getAiStatus);
  const ask = useServerFn(askTutor);
  const listConversations = useServerFn(listTutorConversations);
  const loadConversation = useServerFn(loadTutorConversation);
  const removeConversation = useServerFn(deleteTutorConversation);
  const { data: st, isLoading } = useQuery({ queryKey: ["ai", "status"], queryFn: () => status() });
  const { data: conversations = [], refetch: refreshConversations } = useQuery({
    queryKey: ["ai", "conversations"],
    queryFn: () => listConversations(),
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [style, setStyle] = useState<TutorStyle>("balanced");
  const [length, setLength] = useState<TutorLength>("detailed");
  const [subject, setSubject] = useState<"physics" | "chemistry" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(
    () => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    [messages, busy],
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const r = await ask({ data: { messages: next, style, length, subject, conversationId } });
      if (r.ok) {
        setMessages([...next, { role: "assistant", content: r.text }]);
        if (r.conversationId) setConversationId(r.conversationId);
        await refreshConversations();
      } else setError(r.message);
    } catch {
      setError("تعذّر الاتصال بالمساعد. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function openConversation(id: string) {
    try {
      const result = await loadConversation({ data: { conversationId: id } });
      setConversationId(id);
      setMessages(result.messages.map((m) => ({ role: m.role, content: m.content })));
      setError(null);
    } catch {
      setError("تعذّر فتح المحادثة المحفوظة.");
    }
  }

  function newConversation() {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  async function removeSavedConversation(id: string) {
    if (!window.confirm("هل تريد حذف هذه المحادثة نهائيًا؟")) return;
    try {
      await removeConversation({ data: { conversationId: id } });
      if (conversationId === id) newConversation();
      await refreshConversations();
    } catch {
      setError("تعذّر حذف المحادثة.");
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col">
      <PageHeader
        title="المساعد الذكي"
        subtitle="مساعد متكيف مع مستواك يشرح المفاهيم ويستخرج الرسومات التوضيحية."
        icon="assistant"
      />

      <Card className="mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">محادثاتك السابقة</h2>
            <p className="text-xs text-muted-foreground">
              تُحفظ تلقائيًا في حسابك ويمكنك الرجوع إليها لاحقًا.
            </p>
          </div>
          <button
            type="button"
            onClick={newConversation}
            className="press rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-medium text-primary"
          >
            + محادثة جديدة
          </button>
        </div>
        {conversations.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`flex min-w-44 items-center gap-2 rounded-xl border p-2 ${conversationId === c.id ? "border-primary bg-primary/10" : "border-border bg-background/40"}`}
              >
                <button
                  type="button"
                  onClick={() => openConversation(c.id)}
                  className="min-w-0 flex-1 text-start"
                >
                  <span className="block truncate text-xs font-medium">{c.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.updated_at).toLocaleDateString("ar-EG")}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="حذف المحادثة"
                  onClick={() => removeSavedConversation(c.id)}
                  className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">لا توجد محادثات محفوظة بعد.</p>
        )}
      </Card>

      <Card className="mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">أسلوب الشرح:</span>
          {styles.map((s) => (
            <button
              key={s.v}
              onClick={() => setStyle(s.v)}
              aria-pressed={style === s.v}
              className={cn(
                "press rounded-full border px-3 py-1 text-xs",
                style === s.v ? "border-primary bg-accent" : "border-input",
              )}
            >
              {s.l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">الطول:</span>
          {(["concise", "detailed"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setLength(v)}
              aria-pressed={length === v}
              className={cn(
                "press rounded-full border px-3 py-1 text-xs",
                length === v ? "border-primary bg-accent" : "border-input",
              )}
            >
              {v === "concise" ? "مختصر" : "مفصّل"}
            </button>
          ))}
          <span className="ms-3 text-xs text-muted-foreground">المادة:</span>
          {([null, "physics", "chemistry"] as const).map((v) => (
            <button
              key={String(v)}
              onClick={() => setSubject(v)}
              aria-pressed={subject === v}
              className={cn(
                "press rounded-full border px-3 py-1 text-xs",
                subject === v ? "border-primary bg-accent" : "border-input",
              )}
            >
              {v === null ? "الكل" : v === "physics" ? "فيزياء" : "كيمياء"}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <SkeletonBlock className="h-40" />
      ) : !st?.configured ? (
        <Card className="text-center">
          <StatusBadge tone="setup" />
          <p className="mt-3 text-sm text-muted-foreground">
            المساعد الذكي غير مُفعّل بعد: لم يتم إعداد مزوّد الذكاء الاصطناعي.
          </p>
        </Card>
      ) : (
        <>
          <div className="min-h-[40vh] space-y-4 pb-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                <AppIcon name="assistant" tile size={64} className="animate-float" />
                <p className="text-sm">
                  اسأل عن أي مفهوم في الفيزياء أو الكيمياء، أو اطلب رسمًا توضيحيًا أو أسئلة تدريبية.
                </p>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-primary px-4 py-3 text-primary-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AppIcon name="assistant" size={18} />
                    <StatusBadge tone="ai" />
                  </div>
                  <div className="prose-sm max-w-none leading-8 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:ps-5">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ className, children, ...props }) {
                          const raw = String(children ?? "");
                          const isSvgBlock =
                            className?.includes("language-svg") ||
                            raw.trim().toLowerCase().startsWith("<svg");
                          if (isSvgBlock) {
                            const safe = sanitizeSvg(raw);
                            if (safe) {
                              return (
                                <div
                                  className="my-3 overflow-x-auto rounded-2xl border border-border bg-surface/80 p-4 [&_svg]:mx-auto [&_svg]:max-h-72 [&_svg]:w-full"
                                  dangerouslySetInnerHTML={{ __html: safe }}
                                />
                              );
                            }
                          }
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ),
            )}
            {busy && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AppIcon name="assistant" size={18} />
                  <StatusBadge tone="ai" />
                </div>
                <div className="flex items-center gap-1.5 px-1 text-muted-foreground" role="status">
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-current"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-current"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-current"
                    style={{ animationDelay: "300ms" }}
                  />
                  <span className="sr-only">يكتب المساعد…</span>
                </div>
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={send}
            className="sticky bottom-20 flex items-end gap-2 rounded-2xl border border-input bg-popover p-2 md:bottom-4"
          >
            <label htmlFor="q" className="sr-only">
              سؤالك
            </label>
            <textarea
              id="q"
              rows={1}
              maxLength={2000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="اكتب سؤالك…"
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="press h-11 shrink-0 rounded-xl bg-brand px-5 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              إرسال
            </button>
          </form>
        </>
      )}
    </div>
  );
}
