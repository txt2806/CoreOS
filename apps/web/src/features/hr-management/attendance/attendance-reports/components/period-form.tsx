"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { PERIOD_STATUS_LABEL } from "../constants";
import { currentPeriodKey, formatDate, formatPeriodKey, monthWindow } from "../format";
import { PERIOD_STATUSES, type AttendancePeriod, type PeriodInput, type PeriodStatus } from "../types";
import { Field, Modal, Select, TextInput } from "./primitives";

const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

interface PeriodFormProps {
  record?: AttendancePeriod;
  onCreate: (input: PeriodInput) => Promise<unknown>;
  onPatch?: (record: AttendancePeriod, change: Omit<PeriodInput, "periodKey" | "status">) => Promise<unknown>;
  onClose: () => void;
}

export function PeriodDialog({ record, onCreate, onPatch, onClose }: PeriodFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `period-${uid}-${key}`;
  const initialKey = record?.periodKey ?? currentPeriodKey();
  const initialWindow = monthWindow(initialKey);
  const [periodKey, setPeriodKey] = useState(initialKey);
  const [name, setName] = useState(record?.name ?? `Bảng công tháng ${formatPeriodKey(initialKey)}`);
  const [fromDate, setFromDate] = useState(record?.fromDate ?? initialWindow.from);
  const [toDate, setToDate] = useState(record?.toDate ?? initialWindow.to);
  const [status, setStatus] = useState<PeriodStatus>(record?.status ?? "DRAFT");
  const [note, setNote] = useState(record?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeKey = (value: string) => {
    setPeriodKey(value);
    if (!PERIOD_KEY.test(value)) return;
    const window = monthWindow(value);
    setFromDate(window.from);
    setToDate(window.to);
    if (!record) setName(`Bảng công tháng ${formatPeriodKey(value)}`);
  };

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!PERIOD_KEY.test(periodKey)) found.periodKey = "Kỳ công phải có dạng YYYY-MM.";
    if (!name.trim()) found.name = "Nhập tên kỳ công.";
    else if (name.length > 150) found.name = "Tên kỳ công tối đa 150 ký tự.";
    if (!fromDate) found.fromDate = "Chọn ngày bắt đầu kỳ.";
    if (!toDate) found.toDate = "Chọn ngày kết thúc kỳ.";
    if (fromDate && toDate && fromDate > toDate)
      found.toDate = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    if (PERIOD_KEY.test(periodKey) && fromDate && periodKey !== fromDate.slice(0, 7))
      found.periodKey = "Kỳ công phải trùng tháng của ngày bắt đầu.";
    if (note.length > 500) found.note = "Ghi chú tối đa 500 ký tự.";
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = ["periodKey", "name", "fromDate", "toDate", "note"].find((key) => found[key]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    try {
      if (record && onPatch) {
        await onPatch(record, { name: name.trim(), fromDate, toDate, note: note.trim() });
      } else {
        await onCreate({
          periodKey,
          name: name.trim(),
          fromDate,
          toDate,
          status,
          note: note.trim(),
        });
      }
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (key && ["periodKey", "name", "fromDate", "toDate", "note"].includes(key))
            mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi lưu lại."
            : caught.message,
        );
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được kỳ công.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={record ? "Sửa kỳ công" : "Tạo kỳ công"}
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
            {busy ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo kỳ công"}
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

        <div className="field-grid">
          <Field
            label="Kỳ công"
            htmlFor={id("periodKey")}
            required
            error={errors.periodKey}
            hint={record ? "Không đổi được kỳ của một bảng công đã tạo." : "Dạng YYYY-MM."}
          >
            <TextInput
              id={id("periodKey")}
              type="month"
              value={periodKey}
              readOnly={Boolean(record)}
              invalid={Boolean(errors.periodKey)}
              onChange={(event) => changeKey(event.target.value)}
            />
          </Field>

          <Field label="Tên kỳ công" htmlFor={id("name")} required error={errors.name}>
            <TextInput
              id={id("name")}
              value={name}
              maxLength={150}
              autoComplete="off"
              invalid={Boolean(errors.name)}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Từ ngày" htmlFor={id("fromDate")} required error={errors.fromDate}>
            <TextInput
              id={id("fromDate")}
              type="date"
              value={fromDate}
              invalid={Boolean(errors.fromDate)}
              onChange={(event) => {
                if (event.target.value) setFromDate(event.target.value);
              }}
            />
          </Field>

          <Field label="Đến ngày" htmlFor={id("toDate")} required error={errors.toDate}>
            <TextInput
              id={id("toDate")}
              type="date"
              value={toDate}
              min={fromDate || undefined}
              invalid={Boolean(errors.toDate)}
              onChange={(event) => {
                if (event.target.value) setToDate(event.target.value);
              }}
            />
          </Field>

          {record ? null : (
            <Field
              label="Trạng thái ban đầu"
              htmlFor={id("status")}
              required
              hint="Tạo ở dạng nháp để còn nhập dòng công; chốt khi đã đối chiếu xong."
            >
              <Select
                id={id("status")}
                value={status}
                onChange={(event) => {
                  const next = event.target.value as PeriodStatus;
                  if (PERIOD_STATUSES.includes(next)) setStatus(next);
                }}
              >
                {PERIOD_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {PERIOD_STATUS_LABEL[value]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <Field
          label="Ghi chú"
          htmlFor={id("note")}
          error={errors.note}
          counter={`${note.length}/500`}
          hint="Ví dụ: số liệu lấy từ máy chấm công, đã đối chiếu với trưởng bộ phận."
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
          Khoảng đang chọn: <span className="tabular">{formatDate(fromDate)}</span> –{" "}
          <span className="tabular">{formatDate(toDate)}</span>. Kỳ công phải trùng tháng của
          ngày bắt đầu; máy chủ từ chối nếu lệch.
        </p>
      </form>
    </Modal>
  );
}
