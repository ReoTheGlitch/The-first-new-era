/** إعدادات المساعد الذكي (للسيرفر فقط). */
export const AI_LIMITS = {
  maxMessageChars: 2000,
  maxHistoryMessages: 12,
  maxOutputTokens: 2500,
  requestsPerHour: 30,
};

export type ProviderChoice = { kind: "gemini"; apiKey: string; model: string } | { kind: "none" };

/** Gemini هو المزوّد الوحيد المدعوم. */
export function resolveProvider(): ProviderChoice {
  const apiKey = (
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
    ""
  ).trim();
  if (!apiKey) return { kind: "none" };
  return {
    kind: "gemini",
    apiKey,
    model: (process.env["GEMINI_MODEL"] || "gemini-2.5-flash").trim(),
  };
}
