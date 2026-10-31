"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { MAX_BULK_DAYS, SHIFT_STATUS_LABEL, WEEKDAYS } from "../constants";
import { addDays, daysBetween, formatDate, todayIso } from "../format";
import {
  type ApplyPatternInput,
  type PatternInput,
  type PatternSlot,
  type SchedulePattern,
  type ShiftStatus,
  type ShiftTemplate,
} from "../types";
import {
  EMPLOYEE_LINES_HINT,
  EMPLOYEE_LINES_PLACEHOLDER,
  parseEmployeeLines,
} from "./employee-input";
import { Checkbox, Field, Modal, Select, TextInput } from "./primitives";

interface PatternFormProps {
  record?: SchedulePattern;
  shifts: ShiftTemplate[];
  onCreate: (input: PatternInput) => Promise<unknown>;
  onPatch?: (record: SchedulePattern, change: Omit<PatternInput, "status">) => Promise<unknown>;
  onClose: () => void;
}

/** A weekly pattern is a set of weekday → shift slots; the API rejects duplicates. */
export function PatternDialog({ record, shifts, onCreate, onPatch, onClose }: PatternFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `pattern-${uid}-${key}`;
  const [name, setName] = useState(record?.name ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [status, setStatus] = useState<ShiftStatus>(record?.status ?? "ACTIVE");
  const [selection, setSelection] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const slot of record?.slots ?? []) initial[slot.weekday] = slot.shiftId;
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const defaultShiftId = shifts[0]?.id ?? "";

  const slots = (): PatternSlot[] =>
    WEEKDAYS.filter((day) => selection[day.value]).map((day) => ({
      weekday: day.value,
      shiftId: selection[day.value] ?? "",
    }));

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Nhập tên mẫu để phân biệt với mẫu khác.";
    else if (name.length > 150) found.name = "Tên mẫu tối đa 150 ký tự.";
    if (slots().length === 0) found.slots = "Chọn ít nhất một ngày trong tuần.";
    if (note.length > 500) found.note = "Ghi chú tối đa 500 ký tự.";
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (found.slots) {
      document.getElementById(id("slots"))?.focus();
      return;
    }
    if (found.name) {
      document.getElementById(id("name"))?.focus();
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), slots: slots(), note: note.trim(), status };
      if (record && onPatch) {
        await onPatch(record, { name: payload.name, slots: payload.slots, note: payload.note });
      } else {
        await onCreate(payload);
      }
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (key && ["name", "slots", "note"].includes(key)) mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi lưu lại."
            : caught.message,
        );
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được mẫu tuần.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={record ? "Sửa mẫu tuần" : "Tạo mẫu tuần"}
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
            disabled={busy || shifts.length === 0}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo mẫu"}
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

        {shifts.length === 0 ? (
          <div className="alert alert-warning">
            <span>
              Chưa có ca đang áp dụng. Tạo ca ở thẻ “Ca làm việc” trước khi lập mẫu tuần.
            </span>
          </div>
        ) : null}

        <div className="field-grid">
          <Field label="Tên mẫu" htmlFor={id("name")} required error={errors.name}>
            <TextInput
              id={id("name")}
              value={name}
              maxLength={150}
              autoComplete="off"
              invalid={Boolean(errors.name)}
              placeholder="Tuần hành chính"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field
            label="Trạng thái"
            htmlFor={id("status")}
            required
            hint={record ? "Mẫu đã ngừng không áp dụng được." : undefined}
          >
            <Select
              id={id("status")}
              value={status}
              disabled={Boolean(record)}
              onChange={(event) => {
                const next = event.target.value as ShiftStatus;
                if (next === "ACTIVE" || next === "INACTIVE") setStatus(next);
              }}
            >
              <option value="ACTIVE">{SHIFT_STATUS_LABEL.ACTIVE}</option>
              <option value="INACTIVE">{SHIFT_STATUS_LABEL.INACTIVE}</option>
            </Select>
          </Field>
        </div>

        <fieldset
          id={id("slots")}
          tabIndex={-1}
          className="field"
          style={{ border: 0, padding: 0, margin: 0 }}
          aria-describedby={errors.slots ? `${id("slots")}-error` : undefined}
        >
          <legend className="field-label">
            Ngày trong tuần<span className="field-required">*</span>
          </legend>
          <div className="stack gap-2">
            {WEEKDAYS.map((day) => {
              const active = Boolean(selection[day.value]);
              return (
                <div key={day.value} className="row wrap items-center gap-3">
                  <Checkbox
                    id={id(`day-${day.value}`)}
                    label={day.label}
                    checked={active}
                    onChange={(checked) =>
                      setSelection((current) => {
                        if (!checked) {
                          const next = { ...current };
                          delete next[day.value];
                          return next;
                        }
                        return { ...current, [day.value]: defaultShiftId };
                      })
                    }
                  />
                  <Select
                    aria-label={`Ca cho ${day.label}`}
                    value={selection[day.value] ?? ""}
                    disabled={!active || shifts.length === 0}
                    onChange={(event) =>
                      setSelection((current) => ({
                        ...current,
                        [day.value]: event.target.value,
                      }))
                    }
                    style={{ width: 240 }}
                  >
                    <option value="">Chọn ca</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({shift.startTime}–{shift.endTime})
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>
          {errors.slots ? (
            <span className="field-error" id={`${id("slots")}-error`} role="alert">
              {errors.slots}
            </span>
          ) : (
            <span className="field-hint">Mỗi thứ chỉ gán được một ca trong cùng một mẫu.</span>
          )}
        </fieldset>

        <Field
          label="Ghi chú"
          htmlFor={id("note")}
          error={errors.note}
          counter={`${note.length}/500`}
          hint="Ví dụ: áp dụng cho khối cửa hàng, tối đa 5 ngày mỗi tuần."
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

interface ApplyFormProps {
  pattern: SchedulePattern;
  shiftNames: Map<string, string>;
  onApply: (input: ApplyPatternInput) => Promise<unknown>;
  onClose: () => void;
}

/** Applying a pattern writes real assignments, so the server reports what it skipped. */
export function ApplyPatternDialog({ pattern, shiftNames, onApply, onClose }: ApplyFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `apply-${uid}-${key}`;
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(addDays(todayIso(), 27));
  const [lines, setLines] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const span = daysBetween(from, to);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const { employees, badLines } = parseEmployeeLines(lines);
    if (!from) found.from = "Chọn ngày bắt đầu áp dụng.";
    if (!to) found.to = "Chọn ngày kết thúc áp dụng.";
    if (from && to && to < from) found.to = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    if (from && to && to >= from && daysBetween(from, to) > MAX_BULK_DAYS)
      found.to = `Mỗi lần áp dụng tối đa ${MAX_BULK_DAYS} ngày.`;
    if (badLines.length)
      found.lines = `Dòng ${badLines.join(", ")} chưa đúng định dạng “mã | tên”.`;
    if (employees.length === 0) found.lines = found.lines ?? "Thêm ít nhất một nhân sự.";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await onApply({ from, to, employees });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFormError(caught.message);
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa áp dụng được mẫu tuần.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Áp dụng mẫu “${pattern.name}”`}
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
            {busy ? "Đang ghi lịch…" : "Áp dụng mẫu"}
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
          <span className="muted">Các ngày trong mẫu:</span>
          <div className="row wrap items-center gap-2">
            {pattern.slots.map((slot) => {
              const day = WEEKDAYS.find((item) => item.value === slot.weekday);
              return (
                <span key={slot.weekday} className="chip">
                  {day?.short ?? slot.weekday} · {shiftNames.get(slot.shiftId) ?? "Ca đã xoá"}
                </span>
              );
            })}
          </div>
        </div>

        <div className="field-grid">
          <Field label="Từ ngày" htmlFor={id("from")} required error={errors.from}>
            <TextInput
              id={id("from")}
              type="date"
              value={from}
              invalid={Boolean(errors.from)}
              onChange={(event) => {
                if (event.target.value) setFrom(event.target.value);
              }}
            />
          </Field>
          <Field
            label="Đến ngày"
            htmlFor={id("to")}
            required
            error={errors.to}
            hint={`Tối đa ${MAX_BULK_DAYS} ngày mỗi lần.`}
          >
            <TextInput
              id={id("to")}
              type="date"
              value={to}
              min={from || undefined}
              invalid={Boolean(errors.to)}
              onChange={(event) => {
                if (event.target.value) setTo(event.target.value);
              }}
            />
          </Field>
        </div>

        <Field
          label="Nhân sự áp dụng"
          htmlFor={id("lines")}
          required
          error={errors.lines}
          hint={EMPLOYEE_LINES_HINT}
        >
          <textarea
            id={id("lines")}
            className="textarea mono"
            rows={4}
            value={lines}
            placeholder={EMPLOYEE_LINES_PLACEHOLDER}
            aria-invalid={errors.lines ? "true" : undefined}
            aria-describedby={errors.lines ? `${id("lines")}-error` : `${id("lines")}-hint`}
            onChange={(event) => setLines(event.target.value)}
          />
        </Field>

        <p className="muted">
          Khoảng <span className="tabular">{formatDate(from)}</span> –{" "}
          <span className="tabular">{formatDate(to)}</span>: {span.toLocaleString("vi-VN")} ngày.
          Ngày nhân sự đã có ca sẽ bị bỏ qua và máy chủ báo lại số lượng.
        </p>
      </form>
    </Modal>
  );
}
