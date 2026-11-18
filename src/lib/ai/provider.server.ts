import type { AiTutorProvider } from "./types";
import type { ProviderChoice } from "./config.server";
import { createGeminiProvider } from "./gemini-adapter.server";
import { createOpenRouterProvider } from "./openrouter-adapter.server";

/** يختار المزوّد المناسب حسب الإعداد الحالي. */
export function createProvider(
  choice: Exclude<ProviderChoice, { kind: "none" }>,
  options?: { responseMimeType?: string },
): AiTutorProvider {
  return choice.kind === "openrouter"
    ? createOpenRouterProvider(choice, options)
    : createGeminiProvider(choice, options);
}
