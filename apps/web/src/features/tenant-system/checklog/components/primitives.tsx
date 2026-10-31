"use client";

import type { ReactNode } from "react";
import { OVERRIDE_LABEL, PAGE_SIZES, RESULT_LABEL, RESULT_TONE } from "../constants";
import type { AuditResult } from "../types";

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
export const ShieldGlyph = () => (
  <Glyph>
    <path d="M12 3.5 20 6v6c0 4-3.3 7.3-8 8.5-4.7-1.2-8-4.5-8-8.5V6z" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Glyph>
);
export const SortGlyph = ({ direction }: { direction: "asc" | "desc" }) => (
  <Glyph size={13}>
    {direction === "asc" ? <path d="m7 14 5-5 5 5" /> : <path d="m7 10 5 5 5-5" />}
  </Glyph>
);
export const ShieldAlertGlyph = () => (
  <Glyph>
    <path d="M12 3.5 20 6v6c0 4-3.3 7.3-8 8.5-4.7-1.2-8-4.5-8-8.5V6z" />
    <path d="M12 8v4M12 15h.01" />
  </Glyph>
);

/* ---------- badges ------------------------------------------------------- */

/** Result carries a dot and a Vietnamese word — colour alone is never the signal. */
export function ResultBadge({ result }: { result: AuditResult }) {
  return (
    <span className={RESULT_TONE[result] ?? "badge"}>
      <span className="dot" />
      {RESULT_LABEL[result] ?? result}
    </span>
  );
}

/** Distinct badge: an override is a governance fact, not a second status colour. */
export function OverrideBadge() {
  return (
    <span className="badge badge-danger" title="Ghi đè ngoài phạm vi được cấp">
      <ShieldAlertGlyph />
      {OVERRIDE_LABEL}
    </span>
  );
}

/* ---------- table helpers ------------------------------------------------ */

export function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={onClick}
      aria-label={`Sắp xếp theo ${label}, hiện ${
        active ? (direction === "asc" ? "tăng dần" : "giảm dần") : "chưa sắp xếp"
      }`}
      style={{ paddingInline: 0, gap: 4 }}
    >
      {label}
      {active ? <SortGlyph direction={direction} /> : null}
    </button>
  );
}

export function SkeletonRows({ rows = 8, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <tbody aria-busy="true">
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (__, column) => (
            <td key={column}>
              <span
                className="skeleton skeleton-line"
                style={{ width: column === 0 ? "70%" : column % 2 === 0 ? "85%" : "55%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

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
