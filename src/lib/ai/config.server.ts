/** إعدادات المساعد الذكي (للسيرفر فقط). */
export const AI_LIMITS = {
  maxMessageChars: 2000,
  maxHistoryMessages: 12,
  maxOutputTokens: 2500,
  requestsPerHour: 30,
};

export type ProviderChoice =
  | { kind: "openrouter"; apiKey: string; model: string }
  | { kind: "gemini"; apiKey: string; model: string }
  | { kind: "none" };

/** يُفضّل OpenRouter عند توفّر مفتاحه، وإلا يعود إلى Gemini المباشر. */
export function resolveProvider(): ProviderChoice {
  const openRouterKey = (process.env["OPENROUTER_API_KEY"] || "").trim();
  if (openRouterKey) {
    return {
      kind: "openrouter",
      apiKey: openRouterKey,
      model: (process.env["OPENROUTER_MODEL"] || "google/gemini-2.5-flash").trim(),
    };
  }

  const geminiKey = (
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
    ""
  ).trim();
  if (!geminiKey) return { kind: "none" };
  return {
    kind: "gemini",
    apiKey: geminiKey,
    model: (process.env["GEMINI_MODEL"] || "gemini-2.5-flash").trim(),
  };
}
