/** Provider-independent AI tutor contract (safe to import anywhere). */
export type TutorStyle = "balanced" | "simple" | "examples" | "socratic";
export type TutorLength = "concise" | "detailed";
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type TutorRequest = {
  messages: ChatMessage[];
  style: TutorStyle;
  length: TutorLength;
  subject?: "physics" | "chemistry" | null;
};

export type TutorResult =
  | { ok: true; text: string; provider: string; model: string }
  | {
      ok: false;
      code: "not_configured" | "rate_limited" | "provider_error" | "denied" | "credits";
      message: string;
    };
