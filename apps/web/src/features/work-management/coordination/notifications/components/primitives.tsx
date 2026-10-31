"use client";

import type { ReactNode } from "react";
import { PAGE_SIZES, SOURCE_LABEL, SOURCE_TONE } from "../constants";
import type { NotificationSource } from "../types";

/* ---------- glyphs -------------------------------------------------------- */

const Glyph = ({ children, size = 16 }: { children: ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const SearchGlyph = () => (
  <Glyph>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.5-4.5" />
  </Glyph>
);
export const CloseGlyph = () => (
  <Glyph>
    <path d="m6 6 12 12M18 6 6 18" />
  </Glyph>
);
export const BellGlyph = () => (
  <Glyph>
    <path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 2.5h15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Glyph>
);
export const CheckGlyph = () => (
  <Glyph>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Glyph>
);
export const TrashGlyph = () => (
  <Glyph>
    <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />
  </Glyph>
);
export const ArrowGlyph = () => (
  <Glyph>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Glyph>
);

/* ---------- badges ------------------------------------------------------- */

/** Source badge: dot + Vietnamese word, so colour is never the only signal. */
export function SourceBadge({ source }: { source: NotificationSource }) {
  return (
    <span className={SOURCE_TONE[source] ?? "badge"}>
      <span className="dot" />
      {SOURCE_LABEL[source] ?? source}
    </span>
  );
}

export function ReadBadge({ read }: { read: boolean }) {
  return read ? (
    <span className="badge">
      <span className="dot" />
      Đã đọc
    </span>
  ) : (
    <span className="badge badge-accent">
      <span className="dot" />
      Chưa đọc
    </span>
  );
}

/* ---------- shared furniture --------------------------------------------- */

export function Pagination({
  id,
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  id: string;
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="spread wrap gap-3 px-4 py-3">
      <div className="row items-center gap-2">
        <label className="muted" htmlFor={`${id}-page-size`}>
          Số dòng
        </label>
        <select
          id={`${id}-page-size`}
          className="select"
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
          style={{ width: 88 }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="muted tabular">
          {from.toLocaleString("vi-VN")}–{to.toLocaleString("vi-VN")} trong{" "}
          {total.toLocaleString("vi-VN")}
        </span>
      </div>
      <div className="row items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          Trước
        </button>
        <span className="muted tabular">
          Trang {page}/{pages}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
        >
          Sau
        </button>
      </div>
    </div>
  );
}

export function SkeletonLines({ rows = 6 }: { rows?: number }) {
  return (
    <div className="stack gap-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="stack gap-2" key={index}>
          <span className="skeleton skeleton-line" style={{ width: "42%" }} />
          <span
            className="skeleton skeleton-line"
            style={{ width: index % 2 === 0 ? "90%" : "68%" }}
          />
        </div>
      ))}
    </div>
  );
}
