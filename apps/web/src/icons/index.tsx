import type { ReactNode, SVGProps } from "react";

/**
 * Hand-drawn 24px stroke set owned by the application. Features keep their own
 * glyphs; the shell and the library pages share this one so the rail stays even.
 */
interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
}

const Glyph = ({
  size = 20,
  children,
  ...rest
}: GlyphProps & { children: ReactNode }) => (
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

export const IconOverview = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />
  </Glyph>
);

export const IconWork = (props: GlyphProps) => (
  <Glyph {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M8 4v16M3 10h5M12 9h5M12 13h5M12 17h3" />
  </Glyph>
);

export const IconPeople = (props: GlyphProps) => (
  <Glyph {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5" />
  </Glyph>
);

export const IconSystem = (props: GlyphProps) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M19.8 7.5l-1.9 1.1M6.1 15.4l-1.9 1.1" />
  </Glyph>
);

export const IconLibrary = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M4 5h7v14H4zM13 5h7v6h-7zM13 13h7v6h-7z" />
  </Glyph>
);

export const IconSearch = (props: GlyphProps) => (
  <Glyph {...props}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.5-4.5" />
  </Glyph>
);

export const IconBell = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </Glyph>
);

export const IconSun = (props: GlyphProps) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </Glyph>
);

export const IconMoon = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Glyph>
);

export const IconChevronDown = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="m6 9 6 6 6-6" />
  </Glyph>
);

export const IconChevronRight = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="m9 6 6 6-6 6" />
  </Glyph>
);

export const IconMenu = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Glyph>
);

export const IconClose = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Glyph>
);

export const IconPlus = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);

export const IconCheck = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="m5 13 4.5 4.5L19 7" />
  </Glyph>
);

export const IconAlert = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M12 4.5 21 19H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Glyph>
);

export const IconArrowRight = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Glyph>
);

export const IconLogout = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h9" />
  </Glyph>
);

export const IconLock = (props: GlyphProps) => (
  <Glyph {...props}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Glyph>
);

export const IconPalette = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H16a2 2 0 0 0-1.4 3.4c.6.7.2 2.6-2.6 2.6Z" />
    <circle cx="8" cy="10" r="1" />
    <circle cx="12" cy="7.5" r="1" />
    <circle cx="16" cy="9.5" r="1" />
  </Glyph>
);

export const IconSpark = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
  </Glyph>
);

export const IconFilter = (props: GlyphProps) => (
  <Glyph {...props}>
    <path d="M4 6h16l-6 7v6l-4-2v-4z" />
  </Glyph>
);
