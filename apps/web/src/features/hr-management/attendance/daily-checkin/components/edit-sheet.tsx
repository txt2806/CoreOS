"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { STATUS_LABEL, STATUS_TONE } from "../constants";
import { formatDate, formatDateTime } from "../format";
import type { AttendanceRecord } from "../types";
import { CloseGlyph, Field, StatusBadge, TextInput } from "./primitives";

interface AttendanceEditSheetProps {
  record: AttendanceRecord;
  locked: boolean;
  onSave: (changes: {
    checkIn?: string;
    checkOut?: string | null;
    note?: string;
  }) => Promise<unknown>;
  onClose: () => void;
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A locked record is read-only by business rule (BR-ATT: chốt công), so the form
 * opens as a plain summary instead of pretending the inputs are editable.
 */
export function AttendanceEditSheet({
  record,
  locked,
  onSave,
  onClose,
}: AttendanceEditSheetProps) {
  const titleId = useId();
  const [checkIn, setCheckIn] = useState(record.checkIn);
  const [checkOut, setCheckOut] = useState(record.checkOut ?? "");
  const [note, setNote] = useState(record.note);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const validate = (): string | null => {
    if (!CLOCK.test(checkIn)) return "Giờ vào phải có dạng HH:mm.";
    if (checkOut && !CLOCK.test(checkOut)) return "Giờ ra phải có dạng HH:mm.";
    if (checkOut && checkOut <= checkIn) return "Giờ ra phải sau giờ vào trong cùng ngày.";
    if (note.length > 500) return "Ghi chú tối đa 500 ký tự.";
    return null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setError(found);
    setFormError(null);
    if (found) return;
    setBusy(true);
    try {
      await onSave({
        checkIn,
        checkOut: checkOut ? checkOut : null,
        note,
      });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setFormError(
          "Bản ghi vừa thay đổi ở nơi khác hoặc đã bị chốt. Tải lại danh sách rồi thử tiếp.",
        );
      } else {
        setFormError(
          caught instanceof Error ? caught.message : "Chưa lưu được bản ghi chấm công.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="mono">{record.employeeId}</span>
            <h2 className="page-heading" id={titleId}>
              {record.employeeName}
            </h2>
            <div className="row wrap items-center gap-2">
              <StatusBadge
                label={STATUS_LABEL[record.status]}
                tone={STATUS_TONE[record.status]}
              />
              <span className="muted tabular">{formatDate(record.workDate)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết chấm công"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {locked ? (
            <div className="alert alert-warning" role="status">
              <div className="stack gap-1">
                <span>Bản ghi đã chốt nên chỉ đọc.</span>
                <span className="muted">
                  Muốn điều chỉnh giờ, gửi đơn giải trình điểm danh để quản lý duyệt.
                </span>
              </div>
            </div>
          ) : null}

          {formError ? (
            <div className="alert alert-danger" role="alert">
              <span>{formError}</span>
            </div>
          ) : null}

          <dl className="stack gap-0">
            <div className="spread gap-3 py-1">
              <dt className="muted">Ngày công</dt>
              <dd className="tabular">{formatDate(record.workDate)}</dd>
            </div>
            <div className="spread gap-3 py-1">
              <dt className="muted">Nguồn ghi nhận</dt>
              <dd>{record.source}</dd>
            </div>
            <div className="spread gap-3 py-1">
              <dt className="muted">Cập nhật gần nhất</dt>
              <dd className="tabular">{formatDateTime(record.updatedAt)}</dd>
            </div>
            <div className="spread gap-3 py-1">
              <dt className="muted">Phiên bản bản ghi</dt>
              <dd className="tabular">{record.version}</dd>
            </div>
          </dl>

          {locked ? (
            <dl className="stack gap-0">
              <div className="spread gap-3 py-1">
                <dt className="muted">Giờ vào</dt>
                <dd className="tabular">{record.checkIn}</dd>
              </div>
              <div className="spread gap-3 py-1">
                <dt className="muted">Giờ ra</dt>
                <dd className="tabular">{record.checkOut ?? "chưa ghi"}</dd>
              </div>
              <div className="spread gap-3 py-1">
                <dt className="muted">Ghi chú</dt>
                <dd>{record.note || "—"}</dd>
              </div>
            </dl>
          ) : (
            <form className="stack gap-4" onSubmit={submit} noValidate>
              <div className="field-grid">
                <Field label="Giờ vào" htmlFor={`${titleId}-in`} required error={error ?? undefined}>
                  <TextInput
                    id={`${titleId}-in`}
                    type="time"
                    value={checkIn}
                    invalid={Boolean(error)}
                    onChange={(event) => setCheckIn(event.target.value)}
                  />
                </Field>
                <Field
                  label="Giờ ra"
                  htmlFor={`${titleId}-out`}
                  hint="Để trống nếu người lao động chưa chấm công ra."
                >
                  <TextInput
                    id={`${titleId}-out`}
                    type="time"
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="Ghi chú"
                htmlFor={`${titleId}-note`}
                counter={`${note.length}/500`}
                hint="Chỉ ghi điều cần đối chiếu khi tính công, không ghi thông tin sức khỏe."
              >
                <textarea
                  id={`${titleId}-note`}
                  className="textarea"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </Field>

              <p className="muted">
                Sửa giờ chỉ áp dụng cho bản ghi chưa chốt. Hệ thống từ chối giờ ra trước
                giờ vào trong cùng ngày.
              </p>

              <div className="row justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                  aria-busy={busy ? "true" : undefined}
                >
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>
    </>
  );
}
