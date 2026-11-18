/** خطأ موحّد لمزوّدات الذكاء الاصطناعي. */
export class AiProviderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
