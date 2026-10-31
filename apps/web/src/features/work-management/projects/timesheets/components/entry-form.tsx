"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  DAY_LIMIT_MINUTES,
  DAY_THRESHOLD_MINUTES,
  MINUTE_CHOICES,
  MINUTE_STEP,
} from "../constants";
import { formatMinutes, weekdayOf } from "../format";
import type { EntryInput, ProjectOption, TimeEntry } from "../types";
import { Field, Select, TextArea, TextInput } from "./primitives";

type DraftKey = "workDate" | "minutes" | "projectId" | "note" | "billable";

type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const KEYS: DraftKey[] = ["workDate", "minutes", "projectId", "note", "billable"];

/**
 * A day total feeds the note rule as well, so editing the date or the minutes
 * must also clear or raise the note message — but only where one is shown.
 */
const RELATED: Record<DraftKey, DraftKey[]> = {
  workDate: ["workDate", "note"],
  minutes: ["minutes", "note"],
  note: ["note"],
  projectId: [],
  billable: [],
};

/** Mirrors `entryInput` / `entryPatch` in `dto/timesheets.dto.ts`. */
const NOTE_LIMIT = 1000;

function draftOf(entry?: TimeEntry, fallbackDate?: string): Draft {
  return {
    workDate: entry?.workDate?.slice(0, 10) ?? fallbackDate ?? "",
    minutes: String(entry?.minutes ?? 480),
    projectId: entry?.projectId ?? "",
    note: entry?.note ?? "",
    billable: entry?.billable ? "true" : "false",
  };
}

interface CheckContext {
  weekStart: string;
  weekEnd: string;
  /** Minutes already booked on each day, excluding the entry being edited. */
  dayTotals: Record<string, number>;
}

/**
 * The thresholds are the API's: a day above 8 hours needs a reason, a day above
 * 12 hours is refused outright. Checking here only saves a round trip.
 */
function check(draft: Draft, context: CheckContext): Errors {
  const errors: Errors = {};
  if (!draft.workDate) errors.workDate = "Chọn ngày ghi thời gian.";
  else if (draft.workDate < context.weekStart || draft.workDate > context.weekEnd)
    errors.workDate = "Ngày phải nằm trong tuần của kỳ timesheet.";

  const minutes = Number(draft.minutes);
  if (!Number.isFinite(minutes) || minutes < MINUTE_STEP)
    errors.minutes = `Thời gian tối thiểu ${MINUTE_STEP} phút.`;
  else if (minutes % MINUTE_STEP !== 0)
    errors.minutes = `Thời gian phải là bội số của ${MINUTE_STEP} phút.`;

  const booked = context.dayTotals[draft.workDate] ?? 0;
  const dayTotal = booked + (Number.isFinite(minutes) ? minutes : 0);
  if (dayTotal > DAY_LIMIT_MINUTES)
    errors.minutes = `Tổng một ngày không vượt ${DAY_LIMIT_MINUTES / 60} giờ (đã có ${formatMinutes(booked)}).`;
  else if (dayTotal > DAY_THRESHOLD_MINUTES && !draft.note.trim())
    errors.note = `Ngày vượt ${DAY_THRESHOLD_MINUTES / 60} giờ cần ghi lý do.`;

  if (draft.note.length > NOTE_LIMIT) errors.note = `Ghi chú tối đa ${NOTE_LIMIT} ký tự.`;
  return errors;
}

function payloadOf(draft: Draft): EntryInput {
  const projectId = draft.projectId || undefined;
  return {
    workDate: draft.workDate,
    minutes: Number(draft.minutes),
    /* The create schema takes `projectId` as optional UUID, never null. */
    ...(projectId ? { projectId } : {}),
    note: draft.note.trim(),
    billable: draft.billable === "true",
  };
}

interface EntryFormProps {
  weekStart: string;
  weekEnd: string;
  dayTotals: Record<string, number>;
  projects: ProjectOption[];
  initial?: TimeEntry;
  fallbackDate?: string;
  submitLabel: string;
  onSubmit: (values: EntryInput) => Promise<void>;
  onCancel?: () => void;
}

export function EntryForm({
  weekStart,
  weekEnd,
  dayTotals,
  projects,
  initial,
  fallbackDate,
  submitLabel,
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: DraftKey) => `entry-${uid}-${key}`;
  const context: CheckContext = { weekStart, weekEnd, dayTotals };
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial, fallbackDate));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: DraftKey, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    const related = RELATED[key].filter((candidate) => errors[candidate]);
    if (!related.length) return;
    const found = check(next, context);
    setErrors((current) => {
      const merged = { ...current };
      for (const candidate of related) merged[candidate] = found[candidate];
      return merged;
    });
  };

  const blur = (key: DraftKey) => {
    const found = check(draft, context);
    setErrors((current) => ({ ...current, [key]: found[key] }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = check(draft, context);
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
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được dòng thời gian.");
      }
    } finally {
      setBusy(false);
    }
  };

  const booked = dayTotals[draft.workDate] ?? 0;
  const projected = booked + (Number(draft.minutes) || 0);
  const overDay = projected > DAY_THRESHOLD_MINUTES;

  return (
    <form className="stack gap-4" onSubmit={submit} noValidate>
      {formError ? (
        <div className="alert alert-danger" role="alert">
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="field-grid">
        <Field
          label="Ngày ghi thời gian"
          htmlFor={id("workDate")}
          required
          error={errors.workDate}
          hint={`${weekdayOf(draft.workDate)} · trong tuần đang mở`}
        >
          <TextInput
            id={id("workDate")}
            type="date"
            min={weekStart}
            max={weekEnd}
            value={draft.workDate}
            invalid={Boolean(errors.workDate)}
            onChange={(event) => update("workDate", event.target.value)}
            onBlur={() => blur("workDate")}
          />
        </Field>

        <Field
          label="Thời gian"
          htmlFor={id("minutes")}
          required
          error={errors.minutes}
          hint={`Đã ghi trong ngày: ${formatMinutes(booked)}`}
        >
          <Select
            id={id("minutes")}
            value={draft.minutes}
            invalid={Boolean(errors.minutes)}
            onChange={(event) => update("minutes", event.target.value)}
            onBlur={() => blur("minutes")}
          >
            {MINUTE_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatMinutes(minutes)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Dự án"
          htmlFor={id("projectId")}
          hint={
            projects.length
              ? "Không bắt buộc; chỉ 100 dự án gần nhất hiện trong danh sách."
              : "Chưa tải được danh sách dự án, dòng thời gian sẽ không gắn dự án."
          }
        >
          <Select
            id={id("projectId")}
            value={draft.projectId}
            onChange={(event) => update("projectId", event.target.value)}
          >
            <option value="">Không gắn dự án</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tính vào khối lượng giao" htmlFor={id("billable")} hint="Chỉ là nhãn, không quy ra tiền.">
          <Select
            id={id("billable")}
            value={draft.billable}
            onChange={(event) => update("billable", event.target.value)}
          >
            <option value="false">Không</option>
            <option value="true">Có</option>
          </Select>
        </Field>
      </div>

      <Field
        label="Ghi chú"
        htmlFor={id("note")}
        error={errors.note}
        counter={`${draft.note.length}/${NOTE_LIMIT}`}
        hint={
          overDay
            ? `Ngày này sẽ thành ${formatMinutes(projected)}: bắt buộc ghi lý do theo quy định.`
            : "Việc đã làm, để người duyệt đối chiếu."
        }
      >
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
