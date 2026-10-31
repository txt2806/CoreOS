"use client";

import { useId, type ReactNode, type RefObject } from "react";

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

export const ShieldGlyph = ({ size = 20 }: { size?: number }) => (
  <Glyph size={size}>
    <path d="M12 3.5 19 6v6c0 4-3 7-7 8.5C8 19 5 16 5 12V6z" />
    <path d="m9 12 2 2 4-4" />
  </Glyph>
);

export const EyeGlyph = () => (
  <Glyph>
    <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </Glyph>
);

export const EyeOffGlyph = () => (
  <Glyph>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.2A9.9 9.9 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9" />
    <path d="M6.4 7.7A16.6 16.6 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 3.6-.7" />
  </Glyph>
);

export const AlertGlyph = () => (
  <Glyph>
    <path d="M12 4.5 21 19H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Glyph>
);

export const LockGlyph = () => (
  <Glyph>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Glyph>
);

/** Busy indicator for a submit button; the label carries the state in text. */
export const Spinner = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
    className="animate-spin"
  >
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

/* ---------- form field --------------------------------------------------- */

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, counter, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        <span className="field-required" aria-hidden="true">
          *
        </span>
        <span className="sr-only"> (bắt buộc)</span>
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

/**
 * Password entry with a show/hide control. The toggle is a real button so the
 * state is announced through `aria-pressed` instead of colour.
 */
export function PasswordInput({
  id,
  value,
  visible,
  onToggle,
  invalid,
  autoComplete,
  maxLength,
  inputRef,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  invalid?: boolean;
  autoComplete: "current-password" | "new-password";
  maxLength: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div className="relative flex">
      <input
        id={id}
        ref={inputRef}
        className="input pr-12"
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={invalid ? "true" : undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
        aria-pressed={visible}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        onClick={onToggle}
      >
        {visible ? <EyeOffGlyph /> : <EyeGlyph />}
      </button>
    </div>
  );
}

/** Small inline summary of what a session guarantees, kept out of the alert. */
export function SessionFootnote({ text }: { text: string }) {
  const id = useId();
  return (
    <p className="muted" id={id}>
      {text}
    </p>
  );
}
