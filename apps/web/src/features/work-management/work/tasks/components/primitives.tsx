"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type SelectHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import { PAGE_SIZES } from "../constants";
import { formatDate } from "../format";
import type { TaskStatus } from "../types";

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
export const PlusGlyph = () => (
  <Glyph>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);
export const ChevronGlyph = ({ down }: { down?: boolean }) => (
  <Glyph size={14}>
    <path d={down ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6"} />
  </Glyph>
);
export const DownloadGlyph = () => (
  <Glyph>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
  </Glyph>
);
export const AlertGlyph = () => (
  <Glyph>
    <path d="M12 4.5 21 19H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Glyph>
);
export const CheckGlyph = () => (
  <Glyph>
    <path d="m5 13 4.5 4.5L19 7" />
  </Glyph>
);

/* ---------- status ------------------------------------------------------- */

const TONE: Record<string, string> = {
  "Cần làm": "badge",
  "Đang làm": "badge badge-info",
  "Làm lại": "badge badge-warning",
  "Chờ kiểm tra": "badge badge-accent",
  "Hoãn lại": "badge",
  "Hoàn thành": "badge badge-success",
  "Đã hủy": "badge badge-danger",
};

/** Status always carries a word next to the dot; colour alone is never the signal. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={TONE[status] ?? "badge"}>
      <span className="dot" />
      {status}
    </span>
  );
}

export function PriorityBadge({ value }: { value?: string }) {
  if (!value) return <span className="subtle">—</span>;
  const tone =
    value === "Khẩn cấp"
      ? "badge badge-danger"
      : value === "Cao"
        ? "badge badge-warning"
        : value === "Trung bình"
          ? "badge badge-info"
          : "badge";
  return <span className={tone}>{value}</span>;
}

export function DeadlineCell({ date, status }: { date: string; status: TaskStatus }) {
  const closed = status === "Hoàn thành" || status === "Đã hủy";
  if (closed) return <span className="subtle tabular">{formatDate(date)}</span>;
  const limit = new Date(`${date}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((limit.getTime() - now.getTime()) / 86_400_000);
  if (Number.isNaN(days)) return <span className="subtle">—</span>;
  if (days < 0)
    return (
      <span className="deadline deadline-danger">
        <AlertGlyph /> Quá hạn {Math.abs(days)} ngày
      </span>
    );
  if (days <= 3)
    return (
      <span className="deadline deadline-warning">
        {days === 0 ? "Hạn hôm nay" : `Còn ${days} ngày`}
      </span>
    );
  return <span className="tabular">{formatDate(date)}</span>;
}

/* ---------- form field --------------------------------------------------- */

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  counter?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  counter,
  children,
}: FieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="field-required" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (bắt buộc)</span> : null}
        {counter ? <span className="field-hint">{counter}</span> : null}
      </label>
      {children}
      {error ? (
        <span className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint" id={`${htmlFor}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className="input"
      aria-invalid={invalid ? "true" : undefined}
      aria-describedby={invalid && rest.id ? `${rest.id}-error` : undefined}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className="select"
      aria-invalid={invalid ? "true" : undefined}
      aria-describedby={invalid && rest.id ? `${rest.id}-error` : undefined}
      {...rest}
    >
      {children}
    </select>
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

/** Dialog with `Esc`, backdrop click and a first-field focus, per WCAG 2.2. */
export function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const focusable = ref.current?.querySelector<HTMLElement>(
      "input, select, textarea, button",
    );
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
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function Confirm({ title, body, confirmLabel, busy, onConfirm, onClose }: ConfirmProps) {
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

/* ---------- table furniture ---------------------------------------------- */

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
      aria-label={`Sắp xếp theo ${label}${
        active ? `, đang ${direction === "asc" ? "tăng" : "giảm"}` : ""
      }`}
    >
      {label}
      <span aria-hidden="true" className={active ? "" : "subtle"}>
        {active && direction === "desc" ? "↓" : "↑"}
      </span>
    </button>
  );
}

export function SkeletonRows({ rows = 6, columns }: { rows?: number; columns: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index}>
          {Array.from({ length: columns }, (_, cell) => (
            <td key={cell}>
              <span
                className="skeleton skeleton-line"
                style={{ width: cell === 0 ? "60%" : "80%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
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
        <label className="muted" htmlFor="task-page-size">
          Số dòng
        </label>
        <select
          id="task-page-size"
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
