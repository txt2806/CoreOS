"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { MAX_BULK_DAYS, SOURCE_LABEL, WEEKDAYS } from "../constants";
import { addDays, daysBetween, formatDate, todayIso } from "../format";
import {
  type AssignmentInput,
  type AssignmentPatch,
  type BulkInput,
  type ScheduleAssignment,
  type ShiftTemplate,
} from "../types";
import {
  EMPLOYEE_LINES_HINT,
  EMPLOYEE_LINES_PLACEHOLDER,
  parseEmployeeLines,
} from "./employee-input";
import { Checkbox, Field, Modal, Select, TextInput } from "./primitives";

interface AssignmentFormProps {
  record?: ScheduleAssignment;
  shifts: ShiftTemplate[];
  me: { id: string; name: string } | null;
  onCreate: (input: AssignmentInput) => Promise<unknown>;
  onPatch?: (record: ScheduleAssignment, change: Omit<AssignmentPatch, "version">) => Promise<unknown>;
  onClose: () => void;
}

/** One person, one day, one shift — the server refuses a second shift per day. */
export function AssignmentDialog({
  record,
  shifts,
  me,
  onCreate,
  onPatch,
  onClose,
}: AssignmentFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `assignment-${uid}-${key}`;
  const [employeeId, setEmployeeId] = useState(record?.employeeId ?? me?.id ?? "");
  const [employeeName, setEmployeeName] = useState(record?.employeeName ?? me?.name ?? "");
  const [workDate, setWorkDate] = useState(record?.workDate ?? todayIso());
  const [shiftId, setShiftId] = useState(record?.shiftId ?? shifts[0]?.id ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shift = shifts.find((item) => item.id === shiftId);

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!employeeId.trim()) found.employeeId = "Nhập mã nhân sự trong hồ sơ.";
    else if (employeeId.length > 64) found.employeeId = "Mã nhân sự tối đa 64 ký tự.";
    if (!employeeName.trim()) found.employeeName = "Nhập tên nhân sự để hiển thị trên lịch.";
    else if (employeeName.length > 200) found.employeeName = "Tên tối đa 200 ký tự.";
    if (!workDate) found.workDate = "Chọn ngày làm việc.";
    if (!shiftId) found.shiftId = "Chọn ca làm việc.";
    else if (shift && workDate && workDate < shift.effectiveFrom)
      found.workDate = `Ca này chỉ có hiệu lực từ ${formatDate(shift.effectiveFrom)}.`;
    if (note.length > 500) found.note = "Ghi chú tối đa 500 ký tự.";
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = ["employeeId", "employeeName", "workDate", "shiftId", "note"].find(
      (key) => found[key],
    );
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    try {
      if (record && onPatch) {
        await onPatch(record, {
          shiftId,
          employeeName: employeeName.trim(),
          note: note.trim(),
        });
      } else {
        await onCreate({
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          workDate,
          shiftId,
          source: "MANUAL",
          note: note.trim(),
        });
      }
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (key && ["employeeId", "employeeName", "workDate", "shiftId", "note"].includes(key))
            mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi lưu lại."
            : caught.message,
        );
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được lịch làm việc.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={record ? "Sửa lịch phân ca" : "Gán ca cho nhân sự"}
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
            {busy ? "Đang lưu…" : record ? "Lưu thay đổi" : "Gán ca"}
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
            <span>Chưa có ca đang áp dụng. Tạo ca ở thẻ “Ca làm việc” trước khi gán lịch.</span>
          </div>
        ) : null}

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
            label="Ngày làm việc"
            htmlFor={id("workDate")}
            required
            error={errors.workDate}
            hint="Mỗi nhân sự chỉ một ca trong một ngày."
          >
            <TextInput
              id={id("workDate")}
              type="date"
              value={workDate}
              readOnly={Boolean(record)}
              invalid={Boolean(errors.workDate)}
              onChange={(event) => {
                if (event.target.value) setWorkDate(event.target.value);
              }}
            />
          </Field>

          <Field
            label="Ca làm việc"
            htmlFor={id("shiftId")}
            required
            error={errors.shiftId}
            hint={shift ? `Hiệu lực từ ${formatDate(shift.effectiveFrom)}.` : undefined}
          >
            <Select
              id={id("shiftId")}
              value={shiftId}
              invalid={Boolean(errors.shiftId)}
              onChange={(event) => setShiftId(event.target.value)}
            >
              <option value="">Chọn ca</option>
              {shifts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.startTime}–{item.endTime})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Ghi chú"
          htmlFor={id("note")}
          error={errors.note}
          counter={`${note.length}/500`}
          hint="Ví dụ: đổi ca do vắng mặt đột xuất."
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

        <p className="muted">
          Nguồn ghi nhận: {record ? SOURCE_LABEL[record.source] : SOURCE_LABEL.MANUAL}. Lịch do
          mẫu tuần tạo ra được đánh dấu riêng để đối chiếu.
        </p>
      </form>
    </Modal>
  );
}

interface BulkFormProps {
  shifts: ShiftTemplate[];
  onBulk: (input: BulkInput) => Promise<unknown>;
  onClose: () => void;
}

/** Bulk write: one shift, a weekday mask, a date window and a list of people. */
export function BulkAssignDialog({ shifts, onBulk, onClose }: BulkFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `bulk-${uid}-${key}`;
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? "");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(addDays(todayIso(), 6));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [lines, setLines] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shift = shifts.find((item) => item.id === shiftId);
  const span = daysBetween(from, to);

  const toggleDay = (value: number, checked: boolean) =>
    setWeekdays((current) =>
      checked
        ? [...current, value].sort((a, b) => a - b)
        : current.filter((item) => item !== value),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const { employees, badLines } = parseEmployeeLines(lines);
    if (!shiftId) found.shiftId = "Chọn ca cần gán.";
    if (!from) found.from = "Chọn ngày bắt đầu.";
    if (!to) found.to = "Chọn ngày kết thúc.";
    if (from && to && to < from) found.to = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    if (from && to && to >= from && daysBetween(from, to) > MAX_BULK_DAYS)
      found.to = `Mỗi lần gán tối đa ${MAX_BULK_DAYS} ngày.`;
    if (shift && from && from < shift.effectiveFrom)
      found.from = `Ca này chỉ có hiệu lực từ ${formatDate(shift.effectiveFrom)}.`;
    if (weekdays.length === 0) found.weekdays = "Chọn ít nhất một thứ trong tuần.";
    if (badLines.length)
      found.lines = `Dòng ${badLines.join(", ")} chưa đúng định dạng “mã | tên”.`;
    if (employees.length === 0) found.lines = found.lines ?? "Thêm ít nhất một nhân sự.";
    if (note.length > 500) found.note = "Ghi chú tối đa 500 ký tự.";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await onBulk({ shiftId, from, to, weekdays, employees, note: note.trim() });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) setFormError(caught.message);
      else setFormError(caught instanceof Error ? caught.message : "Chưa gán được lịch.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Gán ca hàng loạt"
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
            {busy ? "Đang ghi lịch…" : "Gán ca"}
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

        <div className="alert alert-warning">
          <span>
            Gán hàng loạt ghi lịch cho mọi nhân sự trong danh sách. Ngày đã có ca sẽ bị bỏ qua,
            nhưng hãy kiểm tra kỹ trước khi ghi vì thao tác áp dụng cho nhiều người.
          </span>
        </div>

        <div className="field-grid">
          <Field label="Ca làm việc" htmlFor={id("shiftId")} required error={errors.shiftId}>
            <Select
              id={id("shiftId")}
              value={shiftId}
              invalid={Boolean(errors.shiftId)}
              onChange={(event) => setShiftId(event.target.value)}
            >
              <option value="">Chọn ca</option>
              {shifts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.startTime}–{item.endTime})
                </option>
              ))}
            </Select>
          </Field>

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

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label">
            Thứ áp dụng<span className="field-required">*</span>
          </legend>
          <div className="row wrap items-center gap-4">
            {WEEKDAYS.map((day) => (
              <Checkbox
                key={day.value}
                id={id(`weekday-${day.value}`)}
                label={day.label}
                checked={weekdays.includes(day.value)}
                onChange={(checked) => toggleDay(day.value, checked)}
              />
            ))}
          </div>
          {errors.weekdays ? (
            <span className="field-error" role="alert">
              {errors.weekdays}
            </span>
          ) : null}
        </fieldset>

        <Field
          label="Nhân sự"
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

        <Field
          label="Ghi chú"
          htmlFor={id("note")}
          error={errors.note}
          counter={`${note.length}/500`}
          hint="Ghi chú được chép vào từng lịch được tạo."
        >
          <textarea
            id={id("note")}
            className="textarea"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <p className="muted">
          Khoảng <span className="tabular">{formatDate(from)}</span> –{" "}
          <span className="tabular">{formatDate(to)}</span>: {span.toLocaleString("vi-VN")} ngày,
          lọc theo {weekdays.length.toLocaleString("vi-VN")} thứ đã chọn.
        </p>
      </form>
    </Modal>
  );
}
