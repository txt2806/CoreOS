"use client";

import { useId, useState } from "react";
import { ApiError } from "../api/client";
import { LOCKED_REASON_MAX, PASSWORD_MAX, PASSWORD_MIN, REASON_MAX } from "../constants";
import type { Account, AccountStatus } from "../types";
import { AlertGlyph, Field, LockGlyph, Modal, UnlockGlyph } from "./primitives";

export interface AccessPatch {
  status: AccountStatus;
  lockedReason?: string;
  reason: string;
}

interface AccessProps {
  account: Account;
  mode: "lock" | "unlock";
  onSubmit: (patch: AccessPatch) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Lock and unlock share one dialog because both are the same call with a
 * different target status; only the consequence copy changes.
 */
export function AccessDialog({ account, mode, onSubmit, onClose }: AccessProps) {
  const uid = useId();
  const formId = `${uid}-form`;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locking = mode === "lock";

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(
        locking
          ? "Ghi lý do khoá để người dùng biết vì sao và để nhật ký có căn cứ."
          : "Ghi lý do mở khoá để nhật ký kiểm toán đầy đủ.",
      );
      return;
    }
    if (trimmed.length > (locking ? LOCKED_REASON_MAX : REASON_MAX)) {
      setError(`Lý do tối đa ${LOCKED_REASON_MAX} ký tự.`);
      return;
    }
    setError(null);
    setServerError(null);
    setBusy(true);
    try {
      await onSubmit(
        locking
          ? { status: "LOCKED", lockedReason: trimmed, reason: trimmed }
          : { status: "ACTIVE", reason: trimmed },
      );
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) setServerError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={locking ? `Khoá tài khoản ${account.username}` : `Mở khoá ${account.username}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="submit"
            form={formId}
            className={locking ? "btn btn-danger" : "btn btn-primary"}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : locking ? "Khoá tài khoản" : "Mở khoá"}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="row wrap">
          <span className="badge">{account.displayName}</span>
          <span className="badge mono">@{account.username}</span>
          {account.isSystemAdmin ? <span className="badge badge-info">Quản trị hệ thống</span> : null}
        </div>

        {locking ? (
          <div className="alert alert-warning">
            <LockGlyph />
            <span>
              Người dùng đang mở phiên sẽ bị đẩy ra ở yêu cầu kế tiếp và không đăng nhập lại được.
              Lý do dưới đây hiển thị cạnh trạng thái khoá và được ghi vào nhật ký kiểm toán.
            </span>
          </div>
        ) : (
          <div className="alert alert-success">
            <UnlockGlyph />
            <span>Tài khoản dùng lại được ngay sau khi mở khoá; mật khẩu cũ vẫn giữ nguyên.</span>
          </div>
        )}

        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{serverError}</span>
          </div>
        ) : null}

        <Field
          label={locking ? "Lý do khoá" : "Lý do mở khoá"}
          htmlFor={`${uid}-reason`}
          required
          error={error ?? undefined}
          counter={`${reason.length}/${LOCKED_REASON_MAX}`}
        >
          <textarea
            id={`${uid}-reason`}
            className="textarea"
            rows={3}
            value={reason}
            maxLength={LOCKED_REASON_MAX}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${uid}-reason-error` : undefined}
            onChange={(event) => {
              setReason(event.target.value);
              setError(null);
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}

interface ResetProps {
  account: Account;
  onSubmit: (password: string, reason: string) => Promise<unknown>;
  onClose: () => void;
}

export function ResetPasswordDialog({ account, onSubmit, onClose }: ResetProps) {
  const uid = useId();
  const formId = `${uid}-form`;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const found: { password?: string; confirm?: string } = {};
    if (!password) found.password = "Nhập mật khẩu mới.";
    else if (password.length < PASSWORD_MIN)
      found.password = `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự.`;
    else if (password.length > PASSWORD_MAX)
      found.password = `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`;
    if (!confirm) found.confirm = "Nhập lại mật khẩu mới.";
    else if (confirm !== password) found.confirm = "Mật khẩu nhập lại không khớp.";

    setErrors(found);
    if (found.password || found.confirm) {
      document.getElementById(`${uid}-${found.password ? "password" : "confirm"}`)?.focus();
      return;
    }

    setServerError(null);
    setBusy(true);
    try {
      await onSubmit(password, reason.trim());
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) setServerError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Đặt lại mật khẩu cho ${account.username}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary"
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : "Đặt lại mật khẩu"}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="muted">
          Mật khẩu mới không hiển thị lại ở bất kỳ đâu. Người dùng sẽ được yêu cầu tự đổi ở lần
          đăng nhập kế tiếp.
        </p>

        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="field-grid">
          <Field
            label="Mật khẩu mới"
            htmlFor={`${uid}-password`}
            required
            error={errors.password}
            hint={`${PASSWORD_MIN}–${PASSWORD_MAX} ký tự.`}
          >
            <input
              id={`${uid}-password`}
              className="input"
              type="password"
              value={password}
              autoComplete="new-password"
              aria-invalid={errors.password ? "true" : undefined}
              aria-describedby={errors.password ? `${uid}-password-error` : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
            />
          </Field>

          <Field
            label="Nhập lại mật khẩu"
            htmlFor={`${uid}-confirm`}
            required
            error={errors.confirm}
          >
            <input
              id={`${uid}-confirm`}
              className="input"
              type="password"
              value={confirm}
              autoComplete="new-password"
              aria-invalid={errors.confirm ? "true" : undefined}
              aria-describedby={errors.confirm ? `${uid}-confirm-error` : undefined}
              onChange={(event) => {
                setConfirm(event.target.value);
                setErrors((current) => ({ ...current, confirm: undefined }));
              }}
            />
          </Field>
        </div>

        <Field
          label="Lý do (ghi nhật ký)"
          htmlFor={`${uid}-reason`}
          counter={`${reason.length}/${REASON_MAX}`}
          hint="Không bắt buộc, nhưng nên ghi để kiểm toán hiểu vì sao mật khẩu bị đặt lại."
        >
          <textarea
            id={`${uid}-reason`}
            className="textarea"
            rows={2}
            value={reason}
            maxLength={REASON_MAX}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
