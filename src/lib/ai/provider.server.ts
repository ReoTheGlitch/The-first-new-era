/**
 * OpenRouter (OpenAI-compatible) provider. Stateless; pure HTTPS, no SDK.
 * Dev: OPENROUTER_API_KEY may be blank (the agent proxy injects the key).
 * Prod (Worker): set OPENROUTER_API_KEY as a Worker secret.
 */
import { AiProviderError } from "./provider-error";

export type JSONSchema = Record<string, unknown>;
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface GenerateOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}
export interface GenerateJsonOptions<_T = unknown> extends GenerateOptions {
  schema: JSONSchema;
  schemaName: string;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-2.5-flash";
export const FALLBACK_MODEL = "google/gemini-2.5-flash-lite";

export function getModel(): string {
  return (process.env["AI_MODEL"] || DEFAULT_MODEL).trim();
}
export function isAiConfigured(): boolean {
  // Dev works keyless through the proxy; always treat as configured.
  return true;
}

const isNode =
  typeof (globalThis as Record<string, unknown>).EdgeRuntime === "undefined" &&
  typeof process !== "undefined" &&
  process.release?.name === "node" &&
  typeof (globalThis as Record<string, unknown>).WebSocketPair === "undefined" &&
  !(typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers");

async function nodeDispatcher(): Promise<unknown> {
  const proxy = process.env["HTTPS_PROXY"] || process.env["https_proxy"];
  if (!isNode || !proxy) return undefined;
  try {
    // Indirect specifiers keep bundlers from resolving Node-only modules for the Worker.
    const undiciName = "undici";
    const fsName = "node:fs";
    const { ProxyAgent } = await import(/* @vite-ignore */ undiciName);
    const fs = await import(/* @vite-ignore */ fsName);
    const caPath = process.env["NODE_EXTRA_CA_CERTS"] || "/root/.ccr/ca-bundle.crt";
    const requestTls = fs.existsSync(caPath) ? { ca: fs.readFileSync(caPath) } : undefined;
    return new ProxyAgent({ uri: proxy, ...(requestTls ? { requestTls } : {}) });
  } catch {
    return undefined;
  }
}

function transientOrUnavailable(status: number, body: string): boolean {
  if (status >= 500 || status === 429) return true;
  const b = body.toLowerCase();
  return (
    status === 404 ||
    b.includes("no endpoints found") ||
    b.includes("model not found") ||
    b.includes("not a valid model") ||
    b.includes("unavailable")
  );
}

async function callOnce(
  model: string,
  opts: GenerateOptions,
  extra: Record<string, unknown>,
): Promise<string> {
  const dispatcher = await nodeDispatcher();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env["OPENROUTER_API_KEY"] || "proxy-injected"}`,
      "HTTP-Referer": "https://thefirst.mrwinter.org",
      "X-Title": "The first",
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...extra,
    }),
    ...(dispatcher ? { dispatcher } : {}),
  } as RequestInit);
  const raw = await res.text();
  if (!res.ok) throw new AiProviderError(res.status, raw.slice(0, 500));
  let json: {
    error?: { code?: number | string; message?: string };
    choices?: { message?: { content?: unknown } }[];
  };
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AiProviderError(502, "Invalid response from OpenRouter");
  }
  if (json?.error)
    throw new AiProviderError(Number(json.error.code) || 502, String(json.error.message ?? ""));
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text) throw new AiProviderError(500, "Empty model response");
  return text;
}

async function call(opts: GenerateOptions, extra: Record<string, unknown> = {}): Promise<string> {
  const primary = opts.model || getModel();
  try {
    return await callOnce(primary, opts, extra);
  } catch (err) {
    if (
      primary !== FALLBACK_MODEL &&
      err instanceof AiProviderError &&
      transientOrUnavailable(err.status, err.message)
    ) {
      console.warn(`[AI] ${primary} failed (${err.status}); retrying with ${FALLBACK_MODEL}`);
      return await callOnce(FALLBACK_MODEL, opts, extra);
    }
    throw err;
  }
}

export async function generateText(opts: GenerateOptions): Promise<{ text: string }> {
  return { text: await call(opts) };
}

function tryParse<T>(text: string): T | undefined {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return undefined;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return undefined;
    }
  }
}

export async function generateJson<T>(opts: GenerateJsonOptions<T>): Promise<{ data: T }> {
  const responseFormat = {
    response_format: {
      type: "json_schema",
      json_schema: { name: opts.schemaName, strict: true, schema: opts.schema },
    },
  };
  const first = await call(opts, responseFormat);
  const parsed = tryParse<T>(first);
  if (parsed !== undefined) return { data: parsed };

  const amended: GenerateOptions = {
    ...opts,
    messages: [
      ...opts.messages,
      {
        role: "user",
        content: `Return ONLY valid JSON matching this schema: ${JSON.stringify(opts.schema)}`,
      },
    ],
  };
  const second = await call(amended, responseFormat);
  const parsed2 = tryParse<T>(second);
  if (parsed2 !== undefined) return { data: parsed2 };
  throw new AiProviderError(502, "Model did not return valid JSON");
}
