import type { SVGProps } from "react";

/**
 * "The first" mark: a monoline numeral 1 (stem, short flag, flat foot)
 * on a 32x32 grid. Strokes use currentColor so it follows the foreground.
 */
export default function LogoMark({
  size = 28,
  title,
  ...props
}: { size?: number; title?: string | undefined } & Omit<
  SVGProps<SVGSVGElement>,
  "width" | "height"
>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      <path d="M17 5.5V26.5" />
      <path d="M10.5 10.5L17 5.5" />
      <path d="M10 26.5H24" />
    </svg>
  );
}
