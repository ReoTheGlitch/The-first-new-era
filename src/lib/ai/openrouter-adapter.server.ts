import type { AiTutorProvider, ChatMessage } from "./types";
import type { ProviderChoice } from "./config.server";
import { AiProviderError } from "./provider-error";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** مزوّد OpenRouter (متوافق مع OpenAI): يرسل المفتاح في ترويسة Authorization. */
export function createOpenRouterProvider(
  choice: Extract<ProviderChoice, { kind: "openrouter" }>,
  options?: { responseMimeType?: string },
): AiTutorProvider {
  return {
    name: "openrouter",
    model: choice.model,
    async generate(system: string, messages: ChatMessage[], maxOutputTokens: number) {
      const body = {
        model: choice.model,
        messages: [{ role: "system" as const, content: system }, ...messages],
        max_tokens: maxOutputTokens,
        ...(options?.responseMimeType === "application/json"
          ? { response_format: { type: "json_object" as const } }
          : {}),
      };

      let res: Response;
      try {
        res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${choice.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://thefirst.mrwinter.org",
            "X-Title": "The First",
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new AiProviderError(503, err instanceof Error ? err.message : String(err));
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new AiProviderError(res.status, text || `OpenRouter error ${res.status}`);
      }

      const json = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      } | null;

      const content = json?.choices?.[0]?.message?.content ?? "";
      if (!content) {
        throw new AiProviderError(500, json?.error?.message || "Empty response from OpenRouter");
      }
      return content;
    },
  };
}
