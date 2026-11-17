/** إعدادات المساعد الذكي (للسيرفر فقط). */
export const AI_LIMITS = {
  maxMessageChars: 2000,
  maxHistoryMessages: 12,
  maxOutputTokens: 2500,
  requestsPerHour: 30,
};

export { DEFAULT_MODEL, FALLBACK_MODEL, getModel } from "./provider.server";
