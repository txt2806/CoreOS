import type { ReactNode, SVGProps } from "react";

/**
 * The library layer is self-contained by rule: files under design-system may not
 * import anything above them, including the app icon set. These four glyphs are
 * the only ones the gallery needs, so they live here rather than being shared.
 */
interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
}

const Glyph = ({ size = 20, children, ...rest }: GlyphProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

export const SearchGlyph = (props: GlyphProps) => (
  <Glyph {...props}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.5-4.5" />
  </Glyph>
);

export const CloseGlyph = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Glyph>
);

export const PlusGlyph = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);

export const CheckGlyph = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="m5 13 4.5 4.5L19 7" />
  </Glyph>
);
