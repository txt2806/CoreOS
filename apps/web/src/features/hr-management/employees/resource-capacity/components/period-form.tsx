"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  DAYS_MAX,
  DAYS_MIN,
  HOURS_PER_DAY_MAX,
  HOURS_PER_DAY_MIN,
  NOTE_LIMIT,
} from "../constants";
import { formatHours, monthEnd, monthStart, weekdaysBetween } from "../format";
import type { Period, PeriodInput } from "../types";
import { Field, TextArea, TextInput } from "./primitives";

type DraftKey =
  | "employeeId"
  | "employeeName"
  | "fromDate"
  | "toDate"
  | "standardHoursPerDay"
  | "holidayDays"
  | "leaveDays"
  | "note";

type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const KEYS: DraftKey[] = [
  "employeeId",
  "employeeName",
  "fromDate",
  "toDate",
  "standardHoursPerDay",
  "holidayDays",
  "leaveDays",
  "note",
];

function draftOf(period?: Period): Draft {
  return {
    employeeId: period?.employeeId ?? "",
    employeeName: period?.employeeName ?? "",
    fromDate: period?.fromDate ?? monthStart(),
    toDate: period?.toDate ?? monthEnd(),
    standardHoursPerDay: String(period?.standardHoursPerDay ?? 8),
    holidayDays: String(period?.holidayDays ?? 0),
    leaveDays: String(period?.leaveDays ?? 0),
    note: period?.note ?? "",
  };
}

function numberInRange(value: string, min: number, max: number): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

/** Validation runs on blur and on submit — never on the first keystroke. */
function check(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.employeeId.trim()) errors.employeeId = "Nhập mã nhân sự, tối đa 64 ký tự.";
  else if (draft.employeeId.length > 64) errors.employeeId = "Mã nhân sự tối đa 64 ký tự.";
  if (!draft.employeeName.trim()) errors.employeeName = "Nhập tên nhân sự, tối đa 200 ký tự.";
  else if (draft.employeeName.length > 200) errors.employeeName = "Tên nhân sự tối đa 200 ký tự.";

  if (!draft.fromDate) errors.fromDate = "Chọn ngày bắt đầu kỳ.";
  if (!draft.toDate) errors.toDate = "Chọn ngày kết thúc kỳ.";
  if (draft.fromDate && draft.toDate) {
    if (draft.fromDate > draft.toDate)
      errors.toDate = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    else {
      const days = weekdaysBetween(draft.fromDate, draft.toDate);
      if (days === 0) errors.fromDate = "Kỳ phải chứa ít nhất một ngày làm việc (thứ Hai–thứ Sáu).";
      else if (days > DAYS_MAX) errors.toDate = `Kỳ tối đa ${DAYS_MAX} ngày làm việc.`;
    }
  }

  if (!numberInRange(draft.standardHoursPerDay, HOURS_PER_DAY_MIN, HOURS_PER_DAY_MAX))
    errors.standardHoursPerDay = `Giờ chuẩn mỗi ngày trong khoảng ${HOURS_PER_DAY_MIN}–${HOURS_PER_DAY_MAX}.`;
  if (!numberInRange(draft.holidayDays, DAYS_MIN, DAYS_MAX))
    errors.holidayDays = `Số ngày lễ trong khoảng ${DAYS_MIN}–${DAYS_MAX}.`;
  if (!numberInRange(draft.leaveDays, DAYS_MIN, DAYS_MAX))
    errors.leaveDays = `Số ngày phép trong khoảng ${DAYS_MIN}–${DAYS_MAX}.`;
  if (draft.note.length > NOTE_LIMIT) errors.note = `Ghi chú tối đa ${NOTE_LIMIT} ký tự.`;
  return errors;
}

function payloadOf(draft: Draft): PeriodInput {
  return {
    employeeId: draft.employeeId.trim(),
    employeeName: draft.employeeName.trim(),
    fromDate: draft.fromDate,
    toDate: draft.toDate,
    standardHoursPerDay: Number(draft.standardHoursPerDay),
    holidayDays: Number(draft.holidayDays),
    leaveDays: Number(draft.leaveDays),
    note: draft.note.trim(),
  };
}

interface PeriodFormProps {
  initial?: Period;
  submitLabel: string;
  onSubmit: (values: PeriodInput) => Promise<void>;
  onCancel?: () => void;
}

export function PeriodForm({ initial, submitLabel, onSubmit, onCancel }: PeriodFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: DraftKey) => `period-${uid}-${key}`;
  const editing = Boolean(initial);
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: DraftKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      const next = check({ ...draft, [key]: value });
      setErrors((current) => ({ ...current, [key]: next[key] }));
    }
  };

  const blur = (key: DraftKey) => {
    const next = check(draft);
    setErrors((current) => ({ ...current, [key]: next[key] }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = check(draft);
    setErrors(found);
    setFormError(null);
    const first = KEYS.find((key) => found[key]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    try {
      await onSubmit(payloadOf(draft));
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Errors = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop() as
            | DraftKey
            | undefined;
          if (key && KEYS.includes(key)) mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi gửi lại."
            : caught.message,
        );
      } else {
        setFormError(
          caught instanceof Error ? caught.message : "Chưa lưu được kỳ công suất.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  /* Mirror of the server formula, so the form can preview the period it is about to create. */
  const weekdays = weekdaysBetween(draft.fromDate, draft.toDate);
  const off = (Number(draft.holidayDays) || 0) + (Number(draft.leaveDays) || 0);
  const availablePreview = Math.max(0, weekdays - off) * (Number(draft.standardHoursPerDay) || 0);

  return (
    <form className="stack gap-4" onSubmit={submit} noValidate>
      {formError ? (
        <div className="alert alert-danger" role="alert">
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="field-grid">
        <Field
          label="Mã nhân sự"
          htmlFor={id("employeeId")}
          required
          error={errors.employeeId}
          hint={editing ? "Mã nhân sự không đổi sau khi tạo kỳ." : "Mã dùng trong phân hệ nhân sự."}
        >
          <TextInput
            id={id("employeeId")}
            value={draft.employeeId}
            maxLength={64}
            autoComplete="off"
            readOnly={editing}
            className="input mono"
            invalid={Boolean(errors.employeeId)}
            onChange={(event) => update("employeeId", event.target.value)}
            onBlur={() => blur("employeeId")}
          />
        </Field>

        <Field
          label="Tên nhân sự"
          htmlFor={id("employeeName")}
          required
          error={errors.employeeName}
          counter={`${draft.employeeName.length}/200`}
        >
          <TextInput
            id={id("employeeName")}
            value={draft.employeeName}
            maxLength={200}
            autoComplete="off"
            readOnly={editing}
            invalid={Boolean(errors.employeeName)}
            placeholder="Nguyễn Thị An"
            onChange={(event) => update("employeeName", event.target.value)}
            onBlur={() => blur("employeeName")}
          />
        </Field>

        <Field label="Từ ngày" htmlFor={id("fromDate")} required error={errors.fromDate}>
          <TextInput
            id={id("fromDate")}
            type="date"
            value={draft.fromDate}
            invalid={Boolean(errors.fromDate)}
            onChange={(event) => update("fromDate", event.target.value)}
            onBlur={() => blur("fromDate")}
          />
        </Field>

        <Field label="Đến ngày" htmlFor={id("toDate")} required error={errors.toDate}>
          <TextInput
            id={id("toDate")}
            type="date"
            value={draft.toDate}
            min={draft.fromDate || undefined}
            invalid={Boolean(errors.toDate)}
            onChange={(event) => update("toDate", event.target.value)}
            onBlur={() => blur("toDate")}
          />
        </Field>

        <Field
          label="Giờ chuẩn mỗi ngày"
          htmlFor={id("standardHoursPerDay")}
          required
          error={errors.standardHoursPerDay}
          hint="Thường là 8 giờ."
        >
          <TextInput
            id={id("standardHoursPerDay")}
            type="number"
            className="input tabular"
            step={0.5}
            min={HOURS_PER_DAY_MIN}
            max={HOURS_PER_DAY_MAX}
            value={draft.standardHoursPerDay}
            invalid={Boolean(errors.standardHoursPerDay)}
            onChange={(event) => update("standardHoursPerDay", event.target.value)}
            onBlur={() => blur("standardHoursPerDay")}
          />
        </Field>

        <Field
          label="Ngày lễ trong kỳ"
          htmlFor={id("holidayDays")}
          error={errors.holidayDays}
          hint="Trừ khỏi ngày công khi tính giờ khả dụng."
        >
          <TextInput
            id={id("holidayDays")}
            type="number"
            className="input tabular"
            step={1}
            min={DAYS_MIN}
            max={DAYS_MAX}
            value={draft.holidayDays}
            invalid={Boolean(errors.holidayDays)}
            onChange={(event) => update("holidayDays", event.target.value)}
            onBlur={() => blur("holidayDays")}
          />
        </Field>

        <Field
          label="Ngày phép trong kỳ"
          htmlFor={id("leaveDays")}
          error={errors.leaveDays}
          hint={
            editing
              ? "API không nhận trường này khi cập nhật; muốn đổi số ngày phép phải tạo kỳ mới."
              : "Trừ tiếp khỏi ngày công còn lại."
          }
        >
          <TextInput
            id={id("leaveDays")}
            type="number"
            className="input tabular"
            step={1}
            min={DAYS_MIN}
            max={DAYS_MAX}
            value={draft.leaveDays}
            readOnly={editing}
            invalid={Boolean(errors.leaveDays)}
            onChange={(event) => update("leaveDays", event.target.value)}
            onBlur={() => blur("leaveDays")}
          />
        </Field>
      </div>

      <div className="alert" role="status" aria-live="polite">
        <span>
          {weekdays.toLocaleString("vi-VN")} ngày làm việc · trừ {off.toLocaleString("vi-VN")} ngày
          nghỉ · giờ khả dụng dự kiến {formatHours(availablePreview)} giờ
        </span>
      </div>

      <Field label="Ghi chú" htmlFor={id("note")} error={errors.note} counter={`${draft.note.length}/${NOTE_LIMIT}`}>
        <TextArea
          id={id("note")}
          rows={3}
          maxLength={NOTE_LIMIT}
          value={draft.note}
          invalid={Boolean(errors.note)}
          onChange={(event) => update("note", event.target.value)}
          onBlur={() => blur("note")}
        />
      </Field>

      <div className="row justify-end gap-2">
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Huỷ
          </button>
        ) : null}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy}
          aria-busy={busy ? "true" : undefined}
        >
          {busy ? "Đang lưu…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
