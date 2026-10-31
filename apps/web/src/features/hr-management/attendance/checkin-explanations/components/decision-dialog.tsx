"use client";

import { useId, useState, type FormEvent } from "react";
import { TYPE_LABEL } from "../constants";
import { formatClock, formatDate } from "../format";
import type { Explanation } from "../types";
import { Field, Modal } from "./primitives";

type Decision = "APPROVED" | "REJECTED";

interface DecisionDialogProps {
  record: Explanation;
  busy: boolean;
  onDecide: (input: { status: Decision; note: string }) => Promise<boolean>;
  onClose: () => void;
}

/**
 * BR-ATT: a rejection is only actionable for the employee when it carries a
 * reason, so the note is mandatory on the reject path and optional on approve.
 */
export function DecisionDialog({ record, busy, onDecide, onClose }: DecisionDialogProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `decision-${uid}-${key}`;
  const [decision, setDecision] = useState<Decision>("APPROVED");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (decision === "REJECTED" && note.trim().length < 10) {
      setError("Lý do từ chối cần ít nhất 10 ký tự để nhân sự hiểu và bổ sung.");
      document.getElementById(id("note"))?.focus();
      return;
    }
    if (note.length > 500) {
      setError("Ghi chú quyết định tối đa 500 ký tự.");
      return;
    }
    setError(null);
    const done = await onDecide({ status: decision, note: note.trim() });
    if (done) onClose();
    else setFormError("Máy chủ chưa nhận quyết định. Đơn có thể đã thay đổi, tải lại rồi thử lại.");
  };

  return (
    <Modal
      title="Xử lý đơn giải trình"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Đóng
          </button>
          <button
            type="submit"
            form={id("form")}
            className={decision === "APPROVED" ? "btn btn-primary" : "btn btn-danger"}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang gửi…" : decision === "APPROVED" ? "Duyệt đơn" : "Từ chối đơn"}
          </button>
        </>
      }
    >
      <form id={id("form")} className="stack gap-4" onSubmit={submit} noValidate>
        {formError ? (
          <div className="alert alert-danger" role="alert">
            <span>{formError}</span>
          </div>
        ) : null}

        <div className="stack gap-1">
          <span className="muted">
            {record.employeeName} · {record.employeeId} ·{" "}
            <span className="tabular">{formatDate(record.workDate)}</span>
          </span>
          <span className="muted">
            {TYPE_LABEL[record.type]} · đề nghị vào{" "}
            <span className="tabular">{formatClock(record.requestedCheckIn)}</span>, ra{" "}
            <span className="tabular">{formatClock(record.requestedCheckOut)}</span>
          </span>
        </div>

        <blockquote className="muted" style={{ margin: 0, paddingLeft: "var(--space-3)" }}>
          {record.reason}
        </blockquote>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label">Quyết định</legend>
          <div className="row wrap items-center gap-4">
            <label className="checkbox">
              <input
                type="radio"
                name={id("decision")}
                value="APPROVED"
                checked={decision === "APPROVED"}
                onChange={() => {
                  setDecision("APPROVED");
                  setError(null);
                }}
              />
              Duyệt — ghi nhận giờ công theo đề nghị
            </label>
            <label className="checkbox">
              <input
                type="radio"
                name={id("decision")}
                value="REJECTED"
                checked={decision === "REJECTED"}
                onChange={() => {
                  setDecision("REJECTED");
                  setError(null);
                }}
              />
              Từ chối — giữ nguyên giờ công đã ghi
            </label>
          </div>
        </fieldset>

        <Field
          label={decision === "REJECTED" ? "Lý do từ chối" : "Ghi chú cho nhân sự"}
          htmlFor={id("note")}
          required={decision === "REJECTED"}
          error={error ?? undefined}
          counter={`${note.length}/500`}
          hint={
            decision === "REJECTED"
              ? "Bắt buộc: nêu căn cứ để nhân sự biết cần bổ sung gì."
              : "Không bắt buộc khi duyệt."
          }
        >
          <textarea
            id={id("note")}
            className="textarea"
            rows={3}
            maxLength={500}
            value={note}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id("note")}-error` : undefined}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}

/** Used for cancel: the request stays visible, so the copy states that it cannot be undone. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const confirm = async () => {
    const done = await onConfirm();
    if (done) onClose();
    else setFormError("Máy chủ chưa nhận yêu cầu. Đơn có thể đã thay đổi, tải lại rồi thử lại.");
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Giữ lại
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={confirm}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack gap-3">
        {formError ? (
          <div className="alert alert-danger" role="alert">
            <span>{formError}</span>
          </div>
        ) : null}
        <p>{body}</p>
        <p className="muted">
          Đơn đã huỷ vẫn còn trong lịch sử nhưng không thể mở lại; muốn điều chỉnh phải gửi đơn
          mới cho cùng ngày.
        </p>
      </div>
    </Modal>
  );
}
