"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { MAX_DAYS_PER_LINE, MAX_OVERTIME_HOURS } from "../constants";
import { formatDate } from "../format";
import type { AttendancePeriod, LineInput, LinePatch, PeriodLine } from "../types";
import { Field, Modal, TextInput } from "./primitives";

const isNumber = (value: string): boolean => value.trim() !== "" && Number.isFinite(Number(value));

interface LineFormProps {
  period: AttendancePeriod;
  record?: PeriodLine;
  onCreate: (input: LineInput) => Promise<unknown>;
  onPatch?: (record: PeriodLine, change: Omit<LinePatch, "version">) => Promise<unknown>;
  onClose: () => void;
}

/**
 * The three day columns must add up to the days in the period, and the server
 * refuses any total above 31, so the form shows the running total as you type.
 */
export function LineDialog({ period, record, onCreate, onPatch, onClose }: LineFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `line-${uid}-${key}`;
  const [employeeId, setEmployeeId] = useState(record?.employeeId ?? "");
  const [employeeName, setEmployeeName] = useState(record?.employeeName ?? "");
  const [workedDays, setWorkedDays] = useState(String(record?.workedDays ?? 0));
  const [paidLeaveDays, setPaidLeaveDays] = useState(String(record?.paidLeaveDays ?? 0));
  const [unpaidLeaveDays, setUnpaidLeaveDays] = useState(String(record?.unpaidLeaveDays ?? 0));
  const [overtimeHours, setOvertimeHours] = useState(String(record?.overtimeHours ?? 0));
  const [note, setNote] = useState(record?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dayTotal = [workedDays, paidLeaveDays, unpaidLeaveDays]
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!employeeId.trim()) found.employeeId = "Nhập mã nhân sự trong hồ sơ.";
    else if (employeeId.length > 64) found.employeeId = "Mã nhân sự tối đa 64 ký tự.";
    if (!employeeName.trim()) found.employeeName = "Nhập tên nhân sự.";
    else if (employeeName.length > 200) found.employeeName = "Tên tối đa 200 ký tự.";

    for (const [key, raw] of [
      ["workedDays", workedDays],
      ["paidLeaveDays", paidLeaveDays],
      ["unpaidLeaveDays", unpaidLeaveDays],
    ] as const) {
      if (!isNumber(raw)) found[key] = "Nhập số ngày, có thể là 0.";
      else if (Number(raw) < 0 || Number(raw) > MAX_DAYS_PER_LINE)
        found[key] = `Số ngày phải trong khoảng 0 đến ${MAX_DAYS_PER_LINE}.`;
    }

    if (!isNumber(overtimeHours)) found.overtimeHours = "Nhập số giờ, có thể là 0.";
    else if (Number(overtimeHours) < 0 || Number(overtimeHours) > MAX_OVERTIME_HOURS)
      found.overtimeHours = `Giờ làm thêm phải trong khoảng 0 đến ${MAX_OVERTIME_HOURS}.`;

    if (dayTotal > MAX_DAYS_PER_LINE)
      found.workedDays = `Tổng ngày công, nghỉ có lương và nghỉ không lương không vượt quá ${MAX_DAYS_PER_LINE} (đang là ${dayTotal}).`;
    if (note.length > 500) found.note = "Ghi chú tối đa 500 ký tự.";
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = [
      "employeeId",
      "employeeName",
      "workedDays",
      "paidLeaveDays",
      "unpaidLeaveDays",
      "overtimeHours",
      "note",
    ].find((key) => found[key]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    try {
      const values = {
        employeeName: employeeName.trim(),
        workedDays: Number(workedDays),
        paidLeaveDays: Number(paidLeaveDays),
        unpaidLeaveDays: Number(unpaidLeaveDays),
        overtimeHours: Number(overtimeHours),
        note: note.trim(),
      };
      if (record && onPatch) {
        await onPatch(record, values);
      } else {
        await onCreate({ ...values, periodId: period.id, employeeId: employeeId.trim() });
      }
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (
            key &&
            [
              "employeeId",
              "employeeName",
              "workedDays",
              "paidLeaveDays",
              "unpaidLeaveDays",
              "overtimeHours",
              "note",
            ].includes(key)
          )
            mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi lưu lại."
            : caught.message,
        );
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được dòng công.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={record ? "Sửa dòng công" : "Thêm dòng công"}
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
            {busy ? "Đang lưu…" : record ? "Lưu thay đổi" : "Thêm dòng"}
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
          Kỳ <strong>{period.name}</strong> ·{" "}
          <span className="tabular">
            {formatDate(period.fromDate)} – {formatDate(period.toDate)}
          </span>
          . Mỗi nhân sự chỉ có một dòng trong một kỳ.
        </p>

        <div className="field-grid">
          <Field label="Mã nhân sự" htmlFor={id("employeeId")} required error={errors.employeeId}>
            <TextInput
              id={id("employeeId")}
              value={employeeId}
              maxLength={64}
              autoComplete="off"
              readOnly={Boolean(record)}
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
            label="Ngày công thực tế"
            htmlFor={id("workedDays")}
            required
            error={errors.workedDays}
            hint="Số ngày có mặt và được tính công."
          >
            <TextInput
              id={id("workedDays")}
              type="number"
              min={0}
              max={MAX_DAYS_PER_LINE}
              step={0.5}
              value={workedDays}
              invalid={Boolean(errors.workedDays)}
              onChange={(event) => setWorkedDays(event.target.value)}
            />
          </Field>

          <Field
            label="Nghỉ có lương"
            htmlFor={id("paidLeaveDays")}
            required
            error={errors.paidLeaveDays}
            hint="Ngày phép, nghỉ lễ được tính lương."
          >
            <TextInput
              id={id("paidLeaveDays")}
              type="number"
              min={0}
              max={MAX_DAYS_PER_LINE}
              step={0.5}
              value={paidLeaveDays}
              invalid={Boolean(errors.paidLeaveDays)}
              onChange={(event) => setPaidLeaveDays(event.target.value)}
            />
          </Field>

          <Field
            label="Nghỉ không lương"
            htmlFor={id("unpaidLeaveDays")}
            required
            error={errors.unpaidLeaveDays}
            hint="Ngày nghỉ không hưởng lương."
          >
            <TextInput
              id={id("unpaidLeaveDays")}
              type="number"
              min={0}
              max={MAX_DAYS_PER_LINE}
              step={0.5}
              value={unpaidLeaveDays}
              invalid={Boolean(errors.unpaidLeaveDays)}
              onChange={(event) => setUnpaidLeaveDays(event.target.value)}
            />
          </Field>

          <Field
            label="Giờ làm thêm"
            htmlFor={id("overtimeHours")}
            required
            error={errors.overtimeHours}
            hint={`Tối đa ${MAX_OVERTIME_HOURS} giờ trong kỳ.`}
          >
            <TextInput
              id={id("overtimeHours")}
              type="number"
              min={0}
              max={MAX_OVERTIME_HOURS}
              step={0.5}
              value={overtimeHours}
              invalid={Boolean(errors.overtimeHours)}
              onChange={(event) => setOvertimeHours(event.target.value)}
            />
          </Field>
        </div>

        <p className="muted" aria-live="polite">
          Tổng ba cột ngày: <strong className="tabular">{dayTotal.toLocaleString("vi-VN")}</strong>{" "}
          / {MAX_DAYS_PER_LINE} ngày.
        </p>

        <Field
          label="Ghi chú"
          htmlFor={id("note")}
          error={errors.note}
          counter={`${note.length}/500`}
          hint="Nêu căn cứ điều chỉnh nếu số liệu khác dữ liệu chấm công."
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
