import { GoogleGenAI } from "@google/genai";
import type { AiTutorProvider, ChatMessage } from "./types";
import type { ProviderChoice } from "./config.server";
import { AiProviderError } from "./provider-error";

const FALLBACK_MODELS = ["gemini-2.5-flash-lite"];
function isModelUnavailableError(err: unknown): boolean {
  const status =
    (err as { status?: number; statusCode?: number })?.status ??
    (err as { statusCode?: number })?.statusCode;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    status === 404 ||
    msg.includes("not found") ||
    msg.includes("not supported") ||
    msg.includes("invalid model")
  );
}

export function createGeminiProvider(
  choice: Extract<ProviderChoice, { kind: "gemini" }>,
  options?: { responseMimeType?: string },
): AiTutorProvider {
  const ai = new GoogleGenAI({
    apiKey: choice.apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  async function callModel(
    modelName: string,
    system: string,
    messages: ChatMessage[],
    maxOutputTokens: number,
  ): Promise<string> {
    // Gemini يتطلب أن تبدأ المحادثة برسالة من المستخدم
    const firstUserIdx = messages.findIndex((m) => m.role === "user");
    const normalized = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : messages;
    const contents = normalized.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: system,
        maxOutputTokens,
        ...(options?.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      },
    });

    const text = response.text ?? "";
    if (!text) {
      throw new AiProviderError(500, "Empty response from Gemini");
    }
    return text;
  }

  return {
    name: "gemini",
    model: choice.model,
    async generate(system: string, messages: ChatMessage[], maxOutputTokens: number) {
      const modelsToTry = [choice.model, ...FALLBACK_MODELS.filter((m) => m !== choice.model)];
      let lastErr: unknown;

      for (const modelName of modelsToTry) {
        try {
          return await callModel(modelName, system, messages, maxOutputTokens);
        } catch (err) {
          lastErr = err;
          const status =
            (err as { status?: number; statusCode?: number })?.status ??
            (err as { statusCode?: number })?.statusCode;
          if (isModelUnavailableError(err) || status === 503 || status === 429) {
            console.warn(`[Gemini] Model ${modelName} unavailable or busy; trying fallback...`);
            continue;
          }
          break;
        }
      }

      if (lastErr instanceof AiProviderError) throw lastErr;
      const status =
        (lastErr as { status?: number; statusCode?: number })?.status ??
        (lastErr as { statusCode?: number })?.statusCode ??
        500;
      const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
      throw new AiProviderError(status, message);
    },
  };
}
