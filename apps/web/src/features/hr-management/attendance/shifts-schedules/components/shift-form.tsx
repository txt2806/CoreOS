"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { SHIFT_STATUS_LABEL } from "../constants";
import { formatClock, todayIso } from "../format";
import {
  SHIFT_STATUSES,
  type ShiftInput,
  type ShiftStatus,
  type ShiftTemplate,
} from "../types";
import { Checkbox, Field, Modal, Select, TextInput } from "./primitives";

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

const minutes = (clock: string): number => {
  const [hours, mins] = clock.split(":").map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
};

interface ShiftFormProps {
  record?: ShiftTemplate;
  onCreate: (input: ShiftInput) => Promise<unknown>;
  onPatch?: (record: ShiftTemplate, change: Omit<ShiftInput, "status">) => Promise<unknown>;
  onClose: () => void;
}

export function ShiftDialog({ record, onCreate, onPatch, onClose }: ShiftFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `shift-${uid}-${key}`;
  const [name, setName] = useState(record?.name ?? "");
  const [startTime, setStartTime] = useState(record?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(record?.endTime ?? "17:00");
  const [breakMinutes, setBreakMinutes] = useState(String(record?.breakMinutes ?? 60));
  const [nightShift, setNightShift] = useState(record?.nightShift ?? false);
  const [effectiveFrom, setEffectiveFrom] = useState(record?.effectiveFrom ?? todayIso());
  const [note, setNote] = useState(record?.note ?? "");
  const [status, setStatus] = useState<ShiftStatus>(record?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Mirrors the server's window check so the error shows before the round trip. */
  const windowIssue = (): string | null => {
    if (!CLOCK.test(startTime) || !CLOCK.test(endTime)) return null;
    const span = minutes(endTime) - minutes(startTime);
    const total = nightShift ? (span <= 0 ? span + 1440 : span) : span;
    if (!nightShift && total <= 0)
      return "Giờ kết thúc phải sau giờ bắt đầu, trừ khi bật cờ ca đêm.";
    if (nightShift && total === 0) return "Ca đêm phải có giờ bắt đầu khác giờ kết thúc.";
    const rest = Number(breakMinutes);
    if (Number.isFinite(rest) && rest >= total)
      return "Thời gian nghỉ giữa ca phải nhỏ hơn tổng thời lượng ca.";
    return null;
  };

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Nhập tên ca để phân biệt với ca khác.";
    else if (name.length > 150) found.name = "Tên ca tối đa 150 ký tự.";
    if (!CLOCK.test(startTime)) found.startTime = "Giờ bắt đầu phải có dạng HH:mm.";
    if (!CLOCK.test(endTime)) found.endTime = "Giờ kết thúc phải có dạng HH:mm.";
    const rest = Number(breakMinutes);
    if (!Number.isInteger(rest) || rest < 0 || rest > 240)
      found.breakMinutes = "Thời gian nghỉ là số phút nguyên từ 0 đến 240.";
    const issue = windowIssue();
    if (issue) found.endTime = issue;
    if (!effectiveFrom) found.effectiveFrom = "Chọn ngày bắt đầu hiệu lực.";
    if (note.length > 500) found.note = "Ghi chú tối đa 500 ký tự.";
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = ["name", "startTime", "endTime", "breakMinutes", "effectiveFrom", "note"].find(
      (key) => found[key],
    );
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    const payload: ShiftInput = {
      name: name.trim(),
      startTime,
      endTime,
      breakMinutes: Number(breakMinutes),
      nightShift,
      effectiveFrom,
      note: note.trim(),
      status,
    };
    try {
      if (record && onPatch) {
        /* Status changes go through the row switch, so the form leaves it alone. */
        await onPatch(record, {
          name: payload.name,
          startTime: payload.startTime,
          endTime: payload.endTime,
          breakMinutes: payload.breakMinutes,
          nightShift: payload.nightShift,
          effectiveFrom: payload.effectiveFrom,
          note: payload.note,
        });
      } else {
        await onCreate(payload);
      }
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (key && ["name", "startTime", "endTime", "breakMinutes", "effectiveFrom", "note"].includes(key))
            mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi lưu lại."
            : caught.message,
        );
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được ca làm việc.");
      }
    } finally {
      setBusy(false);
    }
  };

  const lockedSchedule = Boolean(record && record.assignmentCount > 0);

  return (
    <Modal
      title={record ? "Sửa ca làm việc" : "Tạo ca làm việc"}
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
            {busy ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo ca"}
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

        {lockedSchedule ? (
          <div className="alert alert-warning">
            <span>
              Ca đang được gán cho {record?.assignmentCount.toLocaleString("vi-VN")} lịch nên
              không đổi được khung giờ. Muốn đổi giờ, hãy tạo ca mới và gán lại.
            </span>
          </div>
        ) : null}

        <div className="field-grid">
          <Field label="Tên ca" htmlFor={id("name")} required error={errors.name}>
            <TextInput
              id={id("name")}
              value={name}
              maxLength={150}
              autoComplete="off"
              invalid={Boolean(errors.name)}
              placeholder="Ca hành chính"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field
            label="Ngày bắt đầu hiệu lực"
            htmlFor={id("effectiveFrom")}
            required
            error={errors.effectiveFrom}
            hint="Không gán được ca cho ngày trước mốc này."
          >
            <TextInput
              id={id("effectiveFrom")}
              type="date"
              value={effectiveFrom}
              invalid={Boolean(errors.effectiveFrom)}
              onChange={(event) => {
                if (event.target.value) setEffectiveFrom(event.target.value);
              }}
            />
          </Field>

          <Field label="Giờ bắt đầu" htmlFor={id("startTime")} required error={errors.startTime}>
            <TextInput
              id={id("startTime")}
              type="time"
              value={startTime}
              disabled={lockedSchedule}
              invalid={Boolean(errors.startTime)}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </Field>

          <Field label="Giờ kết thúc" htmlFor={id("endTime")} required error={errors.endTime}>
            <TextInput
              id={id("endTime")}
              type="time"
              value={endTime}
              disabled={lockedSchedule}
              invalid={Boolean(errors.endTime)}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </Field>

          <Field
            label="Nghỉ giữa ca (phút)"
            htmlFor={id("breakMinutes")}
            required
            error={errors.breakMinutes}
            hint="Từ 0 đến 240 phút và nhỏ hơn tổng thời lượng ca."
          >
            <TextInput
              id={id("breakMinutes")}
              type="number"
              min={0}
              max={240}
              step={5}
              value={breakMinutes}
              disabled={lockedSchedule}
              invalid={Boolean(errors.breakMinutes)}
              onChange={(event) => setBreakMinutes(event.target.value)}
            />
          </Field>

          <Field
            label="Trạng thái"
            htmlFor={id("status")}
            required
            hint={record ? "Đổi trạng thái ngay trên bảng để thao tác nhanh." : undefined}
          >
            <Select
              id={id("status")}
              value={status}
              disabled={Boolean(record)}
              onChange={(event) => {
                const next = event.target.value as ShiftStatus;
                if (SHIFT_STATUSES.includes(next)) setStatus(next);
              }}
            >
              {SHIFT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {SHIFT_STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Checkbox
          id={id("nightShift")}
          label="Ca đêm (giờ kết thúc rơi sang ngày hôm sau)"
          checked={nightShift}
          disabled={lockedSchedule}
          onChange={setNightShift}
        />

        <Field
          label="Ghi chú"
          htmlFor={id("note")}
          error={errors.note}
          counter={`${note.length}/500`}
          hint="Ví dụ: áp dụng cho khối vận hành, có bàn giao ca."
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
          Khung giờ hiện tại: <span className="tabular">{formatClock(startTime)}</span> –{" "}
          <span className="tabular">{formatClock(endTime)}</span>
          {nightShift ? " (qua ngày)" : ""}. Máy chủ tính số giờ sau khi trừ nghỉ giữa ca.
        </p>
      </form>
    </Modal>
  );
}
