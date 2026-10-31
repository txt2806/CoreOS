"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { PAGE_SIZES, OUTCOME_LABELS, TRIGGER_LABELS } from "../constants";
import { outcomeTone } from "../format";
import type { RunOutcome, Trigger } from "../types";

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

export const TrashGlyph = () => (
  <Glyph>
    <path d="M5 7h14M10 7V4.5h4V7M7 7l1 12h8l1-12" />
  </Glyph>
);

export const PlayGlyph = () => (
  <Glyph>
    <path d="M8 5.5 18 12 8 18.5z" />
  </Glyph>
);

export const BoltGlyph = () => (
  <Glyph>
    <path d="M13 3 5 13h5l-1 8 8-10h-5z" />
  </Glyph>
);

/** Status is always dot + text, so colour is never the only signal. */
export function EnabledBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="badge badge-success">
      <span className="dot" aria-hidden="true" />
      Đang bật
    </span>
  ) : (
    <span className="badge">
      <span className="dot" aria-hidden="true" />
      Đang tắt
    </span>
  );
}

export function TriggerBadge({ trigger }: { trigger: Trigger }) {
  return (
    <span className={trigger === "created" ? "badge badge-accent" : "badge badge-info"}>
      <span className="dot" aria-hidden="true" />
      {TRIGGER_LABELS[trigger]}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: RunOutcome }) {
  return (
    <span className={`badge ${outcomeTone(outcome)}`}>
      <span className="dot" aria-hidden="true" />
      {OUTCOME_LABELS[outcome]}
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
        <label className="muted" htmlFor="rule-page-size">
          Số dòng
        </label>
        <select
          id="rule-page-size"
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

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Dialog with `Esc`, a backdrop target and first-field focus, per WCAG 2.2. */
export function Modal({ title, onClose, children, footer, wide }: ModalProps) {
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
        className={wide ? "dialog dialog-wide" : "dialog"}
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

interface ConfirmProps {
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  problem?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function Confirm({
  title,
  body,
  confirmLabel,
  busy,
  problem,
  onConfirm,
  onClose,
}: ConfirmProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Quay lại
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack gap-3">
        <p className="muted">{body}</p>
        {problem ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{problem}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
