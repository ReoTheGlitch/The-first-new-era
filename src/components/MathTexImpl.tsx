import katex from "katex";

export function MathTexImpl({ tex, block }: { tex: string; block: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return block ? (
    <div
      dir="ltr"
      className="overflow-x-auto rounded-md bg-muted/60 px-4 py-3 text-center"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
