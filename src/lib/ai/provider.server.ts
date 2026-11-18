import type { AiTutorProvider } from "./types";
import type { ProviderChoice } from "./config.server";
import { createOpenRouterProvider } from "./openrouter-adapter.server";

/**
 * يختار المزوّد المناسب حسب الإعداد الحالي.
 * OpenRouter (المعتمد) يُحمّل مباشرة؛ محوّل Gemini يُحمّل كسولًا عند الحاجة فقط
 * حتى لا تُضمّن حزمة @google/genai الكبيرة في الحالة الافتراضية.
 */
export async function createProvider(
  choice: Exclude<ProviderChoice, { kind: "none" }>,
  options?: { responseMimeType?: string },
): Promise<AiTutorProvider> {
  if (choice.kind === "openrouter") return createOpenRouterProvider(choice, options);
  const { createGeminiProvider } = await import("./gemini-adapter.server");
  return createGeminiProvider(choice, options);
}
