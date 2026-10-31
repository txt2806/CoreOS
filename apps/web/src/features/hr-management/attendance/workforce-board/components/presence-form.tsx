"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { BOARD_ORDER, STATUS_HINT, STATUS_LABEL } from "../constants";
import { formatDate } from "../format";
import { PRESENCE_STATUSES, type PresenceInput, type PresenceStatus } from "../types";
import { Field, Modal, Select, TextInput } from "./primitives";

interface PresenceFormProps {
  workDate: string;
  me: { id: string; name: string } | null;
  onDeclare: (input: PresenceInput) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Declaring presence is a create, so the employee and date are part of the
 * payload. The date stays fixed to the day the board is showing; switching days
 * happens on the board, not inside the dialog.
 */
export function PresenceDialog({ workDate, me, onDeclare, onClose }: PresenceFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `presence-${uid}-${key}`;
  const [employeeId, setEmployeeId] = useState(me?.id ?? "");
  const [employeeName, setEmployeeName] = useState(me?.name ?? "");
  const [status, setStatus] = useState<PresenceStatus>("IN_OFFICE");
  const [shiftLabel, setShiftLabel] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!employeeId.trim()) found.employeeId = "Nhập mã nhân sự trong hồ sơ.";
    else if (employeeId.length > 64) found.employeeId = "Mã nhân sự tối đa 64 ký tự.";
    if (!employeeName.trim()) found.employeeName = "Nhập tên nhân sự để đồng nghiệp nhận ra.";
    else if (employeeName.length > 200) found.employeeName = "Tên tối đa 200 ký tự.";
    if (shiftLabel.length > 120) found.shiftLabel = "Tên ca tối đa 120 ký tự.";
    if (note.length > 500) found.note = "Ghi chú tối đa 500 ký tự.";
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = ["employeeId", "employeeName", "shiftLabel", "note"].find(
      (key) => found[key],
    );
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    try {
      await onDeclare({
        employeeId: employeeId.trim(),
        employeeName: employeeName.trim(),
        workDate,
        status,
        shiftLabel: shiftLabel.trim(),
        note: note.trim(),
      });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (key && ["employeeId", "employeeName", "shiftLabel", "note"].includes(key))
            mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi gửi lại."
            : caught.message,
        );
      } else {
        setFormError(
          caught instanceof Error ? caught.message : "Chưa khai báo được trạng thái.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Khai báo trạng thái hiện diện"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button
            type="submit"
            form={id("form")}
            className="btn btn-primary"
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : "Khai báo"}
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

        <p className="muted">
          Ngày áp dụng: <strong className="tabular">{formatDate(workDate)}</strong>. Mỗi
          nhân sự chỉ có một bản ghi cho một ngày; khai báo lại sẽ bị máy chủ từ chối.
        </p>

        <div className="field-grid">
          <Field label="Mã nhân sự" htmlFor={id("employeeId")} required error={errors.employeeId}>
            <TextInput
              id={id("employeeId")}
              value={employeeId}
              maxLength={64}
              autoComplete="off"
              invalid={Boolean(errors.employeeId)}
              placeholder="EMP-0142"
              onChange={(event) => setEmployeeId(event.target.value)}
            />
          </Field>

          <Field label="Tên nhân sự" htmlFor={id("employeeName")} required error={errors.employeeName}>
            <TextInput
              id={id("employeeName")}
              value={employeeName}
              maxLength={200}
              autoComplete="off"
              invalid={Boolean(errors.employeeName)}
              placeholder="Tên như trong hồ sơ nhân sự"
              onChange={(event) => setEmployeeName(event.target.value)}
            />
          </Field>

          <Field
            label="Trạng thái"
            htmlFor={id("status")}
            required
            hint={STATUS_HINT[status]}
          >
            <Select
              id={id("status")}
              value={status}
              onChange={(event) => {
                const next = event.target.value as PresenceStatus;
                if (PRESENCE_STATUSES.includes(next)) setStatus(next);
              }}
            >
              {BOARD_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Ca làm"
            htmlFor={id("shiftLabel")}
            error={errors.shiftLabel}
            hint="Ví dụ: Ca sáng 08:00–17:00."
          >
            <TextInput
              id={id("shiftLabel")}
              value={shiftLabel}
              maxLength={120}
              autoComplete="off"
              invalid={Boolean(errors.shiftLabel)}
              onChange={(event) => setShiftLabel(event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Ghi chú"
          htmlFor={id("note")}
          error={errors.note}
          counter={`${note.length}/500`}
          hint="Ghi nơi làm việc hoặc lý do, không ghi thông tin sức khỏe chi tiết."
        >
          <textarea
            id={id("note")}
            className="textarea"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
