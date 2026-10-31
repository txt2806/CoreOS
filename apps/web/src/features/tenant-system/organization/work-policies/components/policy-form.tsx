"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BREAK_MINUTES_MAX,
  GRACE_MINUTES_MAX,
  POLICY_EFFECT_NOTE,
  TIMEZONE_MAX,
  TIMEZONES,
  WEEKDAYS,
} from "../constants";
import { formatDateTime, shiftMinutes, weekdaySummary } from "../format";
import type { Policy, PolicyFields } from "../types";
import { AlertGlyph, SaveGlyph } from "./primitives";

type FieldKey =
  | "timezone"
  | "workStart"
  | "workEnd"
  | "breakMinutes"
  | "lateGraceMinutes"
  | "workDays";

interface Draft {
  timezone: string;
  workStart: string;
  workEnd: string;
  breakMinutes: string;
  lateGraceMinutes: string;
  workDays: number[];
}

const toDraft = (policy: Policy): Draft => ({
  timezone: policy.timezone,
  workStart: policy.workStart,
  workEnd: policy.workEnd,
  breakMinutes: String(policy.breakMinutes),
  lateGraceMinutes: String(policy.lateGraceMinutes),
  workDays: [...policy.workDays].sort((left, right) => left - right),
});

const fingerprint = (draft: Draft) => JSON.stringify(draft);

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Mirrors `updatePolicySchema` plus the two business rules the service enforces. */
function validate(draft: Draft): { field: FieldKey; message: string }[] {
  const issues: { field: FieldKey; message: string }[] = [];
  const timezone = draft.timezone.trim();
  if (!timezone) issues.push({ field: "timezone", message: "Nhập múi giờ, ví dụ Asia/Ho_Chi_Minh." });
  else if (timezone.length > TIMEZONE_MAX)
    issues.push({ field: "timezone", message: `Múi giờ tối đa ${TIMEZONE_MAX} ký tự.` });

  if (!CLOCK.test(draft.workStart))
    issues.push({ field: "workStart", message: "Chọn giờ bắt đầu theo dạng HH:mm." });
  if (!CLOCK.test(draft.workEnd))
    issues.push({ field: "workEnd", message: "Chọn giờ kết thúc theo dạng HH:mm." });

  const span = shiftMinutes(draft.workStart, draft.workEnd);
  if (CLOCK.test(draft.workStart) && CLOCK.test(draft.workEnd) && span <= 0)
    issues.push({
      field: "workEnd",
      message: "Giờ kết thúc phải sau giờ bắt đầu; ca qua nửa đêm chưa được hỗ trợ.",
    });

  const breaks = Number(draft.breakMinutes);
  if (!Number.isInteger(breaks) || breaks < 0 || breaks > BREAK_MINUTES_MAX)
    issues.push({
      field: "breakMinutes",
      message: `Số phút nghỉ phải là số nguyên từ 0 đến ${BREAK_MINUTES_MAX}.`,
    });
  else if (span > 0 && breaks >= span)
    issues.push({
      field: "breakMinutes",
      message: `Nghỉ giữa ca (${breaks} phút) phải ngắn hơn khung giờ làm việc (${span} phút).`,
    });

  const grace = Number(draft.lateGraceMinutes);
  if (!Number.isInteger(grace) || grace < 0 || grace > GRACE_MINUTES_MAX)
    issues.push({
      field: "lateGraceMinutes",
      message: `Ân hạn đi muộn phải là số nguyên từ 0 đến ${GRACE_MINUTES_MAX}.`,
    });

  if (draft.workDays.length === 0)
    issues.push({ field: "workDays", message: "Chọn ít nhất một ngày làm việc." });

  return issues;
}

interface PolicyFormProps {
  policy: Policy;
  saving: boolean;
  serverError: string | null;
  onSubmit: (fields: PolicyFields) => void;
}

export function PolicyForm({ policy, saving, serverError, onSubmit }: PolicyFormProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(policy));
  const [attempted, setAttempted] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  /* Snapshot of the loaded policy, kept in state so the dirty flag never reads a ref. */
  const [baseline] = useState(() => fingerprint(toDraft(policy)));
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();

  const dirty = fingerprint(draft) !== baseline;
  const issues = useMemo(() => validate(draft), [draft]);
  const issueOf = (field: FieldKey) => issues.find((issue) => issue.field === field)?.message;
  const fieldId = (field: FieldKey) => `${baseId}-${field}`;
  const errorId = (field: FieldKey) => `${baseId}-${field}-error`;
  const span = shiftMinutes(draft.workStart, draft.workEnd);

  // Losing a half-edited policy because the operator reloaded is not recoverable.
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const patch = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  const toggleDay = (value: number) =>
    setDraft((current) => ({
      ...current,
      workDays: current.workDays.includes(value)
        ? current.workDays.filter((day) => day !== value)
        : [...current.workDays, value].sort((left, right) => left - right),
    }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (issues.length > 0) {
      summaryRef.current?.focus();
      return;
    }
    onSubmit({
      timezone: draft.timezone.trim(),
      workStart: draft.workStart,
      workEnd: draft.workEnd,
      breakMinutes: Number(draft.breakMinutes),
      lateGraceMinutes: Number(draft.lateGraceMinutes),
      workDays: draft.workDays,
    });
    setAttempted(false);
  };

  const discard = () => {
    setDraft(toDraft(policy));
    setAttempted(false);
    setConfirmDiscard(false);
  };

  return (
    <form className="stack gap-5" onSubmit={submit} noValidate>
      <div className="alert" role="note">
        <AlertGlyph />
        <div className="stack gap-1">
          <span>{POLICY_EFFECT_NOTE}</span>
          <span className="muted">
            Phiên bản hiện tại {policy.version} · cập nhật lần cuối {formatDateTime(policy.updatedAt)}
          </span>
        </div>
      </div>

      {serverError ? (
        <div className="alert alert-danger" role="alert">
          <AlertGlyph />
          <span>{serverError}</span>
        </div>
      ) : null}

      {attempted && issues.length > 0 ? (
        <div className="alert alert-warning" role="alert" tabIndex={-1} ref={summaryRef}>
          <AlertGlyph />
          <div className="stack gap-1">
            <span>
              Còn {issues.length.toLocaleString("vi-VN")} mục cần sửa trước khi lưu. Máy chủ sẽ từ chối
              cùng những mục này.
            </span>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <fieldset className="stack gap-4" style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="surface-title">Khung giờ làm việc</legend>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor={fieldId("timezone")}>
              Múi giờ
            </label>
            <input
              id={fieldId("timezone")}
              className="input"
              type="text"
              list={`${baseId}-timezones`}
              value={draft.timezone}
              maxLength={TIMEZONE_MAX}
              autoComplete="off"
              aria-invalid={Boolean(issueOf("timezone"))}
              aria-describedby={issueOf("timezone") ? errorId("timezone") : undefined}
              onChange={(event) => patch({ timezone: event.target.value })}
            />
            <datalist id={`${baseId}-timezones`}>
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
            {issueOf("timezone") ? (
              <span className="field-error" id={errorId("timezone")}>
                {issueOf("timezone")}
              </span>
            ) : (
              <span className="field-hint">Giờ chấm công được hiểu theo múi giờ này.</span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor={fieldId("workStart")}>
              Giờ bắt đầu
            </label>
            <input
              id={fieldId("workStart")}
              className="input"
              type="time"
              value={draft.workStart}
              aria-invalid={Boolean(issueOf("workStart"))}
              aria-describedby={issueOf("workStart") ? errorId("workStart") : undefined}
              onChange={(event) => patch({ workStart: event.target.value })}
            />
            {issueOf("workStart") ? (
              <span className="field-error" id={errorId("workStart")}>
                {issueOf("workStart")}
              </span>
            ) : null}
          </div>

          <div className="field">
            <label className="field-label" htmlFor={fieldId("workEnd")}>
              Giờ kết thúc
            </label>
            <input
              id={fieldId("workEnd")}
              className="input"
              type="time"
              value={draft.workEnd}
              aria-invalid={Boolean(issueOf("workEnd"))}
              aria-describedby={issueOf("workEnd") ? errorId("workEnd") : undefined}
              onChange={(event) => patch({ workEnd: event.target.value })}
            />
            {issueOf("workEnd") ? (
              <span className="field-error" id={errorId("workEnd")}>
                {issueOf("workEnd")}
              </span>
            ) : span > 0 ? (
              <span className="field-hint tabular">
                {Math.floor(span / 60)} giờ {span % 60} phút có mặt
              </span>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="stack gap-4" style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="surface-title">Thời gian nghỉ và ân hạn</legend>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor={fieldId("breakMinutes")}>
              Nghỉ giữa ca (phút)
            </label>
            <input
              id={fieldId("breakMinutes")}
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              max={BREAK_MINUTES_MAX}
              step={5}
              value={draft.breakMinutes}
              aria-invalid={Boolean(issueOf("breakMinutes"))}
              aria-describedby={issueOf("breakMinutes") ? errorId("breakMinutes") : undefined}
              onChange={(event) => patch({ breakMinutes: event.target.value })}
            />
            {issueOf("breakMinutes") ? (
              <span className="field-error" id={errorId("breakMinutes")}>
                {issueOf("breakMinutes")}
              </span>
            ) : (
              <span className="field-hint">Trừ vào giờ làm thực tế, tối đa {BREAK_MINUTES_MAX} phút.</span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor={fieldId("lateGraceMinutes")}>
              Ân hạn đi muộn (phút)
            </label>
            <input
              id={fieldId("lateGraceMinutes")}
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              max={GRACE_MINUTES_MAX}
              step={1}
              value={draft.lateGraceMinutes}
              aria-invalid={Boolean(issueOf("lateGraceMinutes"))}
              aria-describedby={issueOf("lateGraceMinutes") ? errorId("lateGraceMinutes") : undefined}
              onChange={(event) => patch({ lateGraceMinutes: event.target.value })}
            />
            {issueOf("lateGraceMinutes") ? (
              <span className="field-error" id={errorId("lateGraceMinutes")}>
                {issueOf("lateGraceMinutes")}
              </span>
            ) : (
              <span className="field-hint">
                Chấm công trong khoảng này vẫn tính đúng giờ; tối đa {GRACE_MINUTES_MAX} phút.
              </span>
            )}
          </div>
        </div>
      </fieldset>

      <section className="stack gap-3" aria-labelledby={`${baseId}-workdays`}>
        <div className="spread wrap gap-2">
          <h3 className="surface-title" id={`${baseId}-workdays`} style={{ margin: 0 }}>
            Ngày làm việc
          </h3>
          <span className="muted tabular">
            {weekdaySummary(draft.workDays)} · {draft.workDays.length.toLocaleString("vi-VN")}/7 ngày
          </span>
        </div>
        <div
          className="row wrap gap-4"
          role="group"
          aria-label="Ngày làm việc trong tuần"
          aria-describedby={issueOf("workDays") ? errorId("workDays") : undefined}
        >
          {WEEKDAYS.map((day) => (
            <label key={day.value} className="checkbox">
              <input
                type="checkbox"
                checked={draft.workDays.includes(day.value)}
                onChange={() => toggleDay(day.value)}
              />
              {day.label}
            </label>
          ))}
        </div>
        {issueOf("workDays") ? (
          <span className="field-error" id={errorId("workDays")}>
            {issueOf("workDays")}
          </span>
        ) : (
          <span className="field-hint">
            Ngày không được chọn sẽ không tính vào quỹ phép và không bị coi là vắng mặt.
          </span>
        )}
      </section>

      {confirmDiscard ? (
        <div className="alert alert-warning" role="alert">
          <AlertGlyph />
          <div className="stack gap-2">
            <span>Bỏ mọi thay đổi chưa lưu và quay về cấu hình đang chạy?</span>
            <div className="row gap-2">
              <button type="button" className="btn btn-danger btn-sm" onClick={discard}>
                Bỏ thay đổi
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmDiscard(false)}
              >
                Tiếp tục sửa
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="spread wrap gap-3">
        <span className="muted row items-center gap-2" aria-live="polite">
          {dirty ? (
            <span className="badge badge-warning">
              <span className="dot" aria-hidden="true" />
              Chưa lưu
            </span>
          ) : (
            <span className="badge">
              <span className="dot" aria-hidden="true" />
              Khớp bản đang chạy
            </span>
          )}
          {dirty ? "Thay đổi chỉ có hiệu lực sau khi bấm lưu." : "Chưa có thay đổi nào."}
        </span>
        <div className="row gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setConfirmDiscard(true)}
            disabled={!dirty || saving}
          >
            Hoàn tác
          </button>
          <button type="submit" className="btn btn-primary" disabled={!dirty || saving} aria-busy={saving}>
            <SaveGlyph />
            {saving ? "Đang lưu…" : "Lưu chính sách"}
          </button>
        </div>
      </div>
    </form>
  );
}
