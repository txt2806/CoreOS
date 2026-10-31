"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import {
  PAGE_SIZES,
  REQUEST_STATUS_TONE,
  SLA_LABEL,
  SLA_TONE,
  STEP_STATUS_LABEL,
  STEP_STATUS_TONE,
  VOTE_LABEL,
  VOTE_TONE,
} from "../constants";
import type { RequestStatus, SlaState, StepStatus, VoteDecision } from "../types";
import { initials } from "../format";

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
export const CheckGlyph = () => (
  <Glyph>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Glyph>
);
export const RejectGlyph = () => (
  <Glyph>
    <path d="M7 7l10 10M17 7 7 17" />
  </Glyph>
);
export const AlertGlyph = () => (
  <Glyph>
    <path d="M12 4.5 21 19H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Glyph>
);
export const ClockGlyph = () => (
  <Glyph>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 8v4.5l3 1.8" />
  </Glyph>
);

/* ---------- status ------------------------------------------------------- */

/** Status always carries a word next to the dot; colour alone is never the signal. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={REQUEST_STATUS_TONE[status] ?? "badge"}>
      <span className="dot" />
      {status}
    </span>
  );
}

export function StepBadge({ status }: { status: StepStatus }) {
  return (
    <span className={STEP_STATUS_TONE[status] ?? "badge"}>
      <span className="dot" />
      {STEP_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function SlaBadge({ sla }: { sla: SlaState }) {
  return (
    <span className={SLA_TONE[sla] ?? "badge"}>
      <span className="dot" />
      {SLA_LABEL[sla] ?? sla}
    </span>
  );
}

export function VoteBadge({ decision }: { decision: VoteDecision }) {
  return (
    <span className={VOTE_TONE[decision] ?? "badge"}>
      <span className="dot" />
      {VOTE_LABEL[decision] ?? decision}
    </span>
  );
}

export function Person({ name }: { name: string }) {
  return (
    <span className="row items-center gap-2">
      <span className="avatar avatar-sm" aria-hidden="true">
        {initials(name)}
      </span>
      <span className="truncate">{name || "Chưa rõ"}</span>
    </span>
  );
}

/* ---------- overlay ------------------------------------------------------ */

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Dialog with `Esc`, backdrop click and first-field focus, per WCAG 2.2. */
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

export function Confirm({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{body}</p>
    </Modal>
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

export function SkeletonLines({ rows = 5 }: { rows?: number }) {
  return (
    <div className="stack gap-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="stack gap-2" key={index}>
          <span className="skeleton skeleton-line" style={{ width: "42%" }} />
          <span className="skeleton skeleton-line" style={{ width: index % 2 === 0 ? "84%" : "66%" }} />
        </div>
      ))}
    </div>
  );
}
