"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { PAGE_SIZES, STATUS_LABELS } from "../constants";
import type { Status } from "../types";

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

export const AlertGlyph = () => (
  <Glyph>
    <path d="M12 4.5 21 19H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Glyph>
);

export const PlusGlyph = () => (
  <Glyph>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);

export const ClockGlyph = () => (
  <Glyph>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.5l3 1.8" />
  </Glyph>
);

export const SaveGlyph = () => (
  <Glyph>
    <path d="M5 4.5h11l3 3v12H5z" />
    <path d="M9 4.5v5h6v-5M9 19v-5h6v5" />
  </Glyph>
);

export const PencilGlyph = () => (
  <Glyph>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="m14 6 4 4" />
  </Glyph>
);

/** Status is always dot + text, so colour is never the only signal. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={status === "ACTIVE" ? "badge badge-success" : "badge"}>
      <span className="dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
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
        <label className="muted" htmlFor="policy-page-size">
          Số dòng
        </label>
        <select
          id="policy-page-size"
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
          Trang {page.toLocaleString("vi-VN")}/{pages.toLocaleString("vi-VN")}
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

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Dialog with `Esc`, a backdrop target and first-field focus, per WCAG 2.2. */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const focusable = ref.current?.querySelector<HTMLElement>("input, select, textarea, button");
    focusable?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
      >
        <div className="dialog-head">
          <h2 className="dialog-title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <CloseGlyph />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer ? <div className="dialog-foot">{footer}</div> : null}
      </div>
    </>
  );
}
