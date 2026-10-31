"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  LATE_SUBMISSION_DAYS,
  LEAVE_TYPE_LABEL,
  MAX_WORKING_DAYS,
  SESSION_MULTI_DAY,
  SESSION_SINGLE_DAY,
} from "../constants";
import { daysBetween, today, workingDays } from "../format";
import { LEAVE_TYPES, type LeaveInput, type LeaveRequest, type LeaveType, type Session } from "../types";
import { Field, Select, TextInput } from "./primitives";
import type { QuotaContext } from "../hooks/use-leave-requests";

type DraftKey = "employeeId" | "employeeName" | "leaveType" | "fromDate" | "toDate" | "reason";

type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const LIMITS: Record<DraftKey, number> = {
  employeeId: 64,
  employeeName: 200,
  leaveType: 20,
  fromDate: 10,
  toDate: 10,
  reason: 1000,
};

const KEYS: DraftKey[] = [
  "employeeId",
  "employeeName",
  "leaveType",
  "fromDate",
  "toDate",
  "reason",
];

function draftOf(initial: LeaveRequest | undefined, actor: Session["actor"] | null): Draft {
  return {
    employeeId: initial?.employeeId ?? actor?.employeeId ?? "",
    employeeName: initial?.employeeName ?? actor?.displayName ?? "",
    leaveType: initial?.leaveType ?? "ANNUAL",
    fromDate: initial?.fromDate ?? today(),
    toDate: initial?.toDate ?? today(),
    reason: initial?.reason ?? "",
  };
}

/** Validation runs on blur and on submit — never on the first keystroke. */
function check(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.employeeId.trim())
    errors.employeeId = "Nhập mã nhân sự đúng như hồ sơ nhân sự.";
  else if (draft.employeeId.length > LIMITS.employeeId)
    errors.employeeId = "Mã nhân sự tối đa 64 ký tự.";

  if (!draft.employeeName.trim()) errors.employeeName = "Nhập tên nhân sự xin nghỉ.";
  else if (draft.employeeName.length > LIMITS.employeeName)
    errors.employeeName = "Tên nhân sự tối đa 200 ký tự.";

  if (!draft.fromDate) errors.fromDate = "Chọn ngày bắt đầu nghỉ.";
  if (!draft.toDate) errors.toDate = "Chọn ngày kết thúc nghỉ.";

  if (draft.fromDate && draft.toDate) {
    if (draft.fromDate > draft.toDate)
      errors.toDate = "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.";
    else {
      const days = workingDays(draft.fromDate, draft.toDate);
      if (days === 0) errors.toDate = "Khoảng nghỉ phải có ít nhất một ngày làm việc.";
      else if (days > MAX_WORKING_DAYS)
        errors.toDate = `Mỗi đơn tối đa ${MAX_WORKING_DAYS} ngày làm việc.`;
    }
  }

  if (!draft.reason.trim()) errors.reason = "Nêu lý do để quản lý có căn cứ duyệt.";
  else if (draft.reason.trim().length < 10) errors.reason = "Lý do cần ít nhất 10 ký tự.";
  else if (draft.reason.length > LIMITS.reason) errors.reason = "Lý do tối đa 1000 ký tự.";

  return errors;
}

interface LeaveFormProps {
  initial?: LeaveRequest;
  actor: Session["actor"] | null;
  /** Only a manager may file on behalf of someone else. */
  canFileForOthers: boolean;
  quota: QuotaContext | null;
  quotaProblem: string | null;
  usedDaysOf: (employeeId: string) => Promise<number | null>;
  submitLabel: string;
  onSubmit: (values: LeaveInput) => Promise<void>;
  onCancel?: () => void;
}

export function LeaveForm({
  initial,
  actor,
  canFileForOthers,
  quota,
  quotaProblem,
  usedDaysOf,
  submitLabel,
  onSubmit,
  onCancel,
}: LeaveFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: DraftKey) => `leave-${uid}-${key}`;
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial, actor));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [spent, setSpent] = useState<{ employeeId: string; days: number } | null>(null);

  /* Editing re-opens the form for the same person; the quota context follows. */
  useEffect(() => {
    let cancelled = false;
    const employeeId = draft.employeeId.trim();
    if (!employeeId) {
      setSpent(null);
      return;
    }
    const timer = window.setTimeout(() => {
      usedDaysOf(employeeId).then((days) => {
        if (!cancelled && days !== null) setSpent({ employeeId, days });
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft.employeeId, usedDaysOf]);

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
      await onSubmit({
        employeeId: draft.employeeId.trim(),
        employeeName: draft.employeeName.trim(),
        leaveType: draft.leaveType as LeaveType,
        fromDate: draft.fromDate,
        toDate: draft.toDate,
        reason: draft.reason.trim(),
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Errors = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop() as DraftKey | undefined;
          if (key && KEYS.includes(key)) mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi gửi lại."
            : caught.message,
        );
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa gửi được đơn nghỉ phép.");
      }
    } finally {
      setBusy(false);
    }
  };

  const days = workingDays(draft.fromDate, draft.toDate);
  const owned = spent && spent.employeeId === draft.employeeId.trim();
  const remaining = quota ? quota.daysPerYear - (owned ? spent.days : 0) : null;
  const late =
    draft.leaveType === "ANNUAL" &&
    Boolean(draft.fromDate) &&
    daysBetween(today(), draft.fromDate) < LATE_SUBMISSION_DAYS;
  const overQuota = remaining !== null && days > 0 && days > remaining;

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
          hint={
            canFileForOthers
              ? "Mã trong hồ sơ nhân sự; quản lý có thể gửi thay cho nhân viên."
              : "Chỉ gửi được đơn cho chính mình."
          }
        >
          <TextInput
            id={id("employeeId")}
            value={draft.employeeId}
            maxLength={LIMITS.employeeId}
            autoComplete="off"
            invalid={Boolean(errors.employeeId)}
            readOnly={!canFileForOthers}
            onChange={(event) => update("employeeId", event.target.value)}
            onBlur={() => blur("employeeId")}
          />
        </Field>

        <Field
          label="Tên nhân sự"
          htmlFor={id("employeeName")}
          required
          error={errors.employeeName}
          counter={`${draft.employeeName.length}/${LIMITS.employeeName}`}
        >
          <TextInput
            id={id("employeeName")}
            value={draft.employeeName}
            maxLength={LIMITS.employeeName}
            autoComplete="off"
            invalid={Boolean(errors.employeeName)}
            readOnly={!canFileForOthers && Boolean(actor)}
            onChange={(event) => update("employeeName", event.target.value)}
            onBlur={() => blur("employeeName")}
          />
        </Field>

        <Field label="Loại nghỉ" htmlFor={id("leaveType")}>
          <Select
            id={id("leaveType")}
            value={draft.leaveType}
            onChange={(event) => update("leaveType", event.target.value)}
          >
            {LEAVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {LEAVE_TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ngày bắt đầu" htmlFor={id("fromDate")} required error={errors.fromDate}>
          <TextInput
            id={id("fromDate")}
            type="date"
            value={draft.fromDate}
            invalid={Boolean(errors.fromDate)}
            onChange={(event) => update("fromDate", event.target.value)}
            onBlur={() => blur("fromDate")}
          />
        </Field>

        <Field label="Ngày kết thúc" htmlFor={id("toDate")} required error={errors.toDate}>
          <TextInput
            id={id("toDate")}
            type="date"
            value={draft.toDate}
            invalid={Boolean(errors.toDate)}
            onChange={(event) => update("toDate", event.target.value)}
            onBlur={() => blur("toDate")}
          />
        </Field>

        <Field
          label="Phiên nghỉ"
          htmlFor={`leave-${uid}-session`}
          hint="API lưu đơn theo ngày làm việc, chưa có trường phiên nên đơn một ngày luôn tính cả ngày."
        >
          <TextInput
            id={`leave-${uid}-session`}
            value={days === 1 ? SESSION_SINGLE_DAY : days > 1 ? SESSION_MULTI_DAY : "—"}
            readOnly
          />
        </Field>
      </div>

      <Field
        label="Lý do"
        htmlFor={id("reason")}
        required
        error={errors.reason}
        counter={`${draft.reason.length}/${LIMITS.reason}`}
        hint="Tối thiểu 10 ký tự. Ghi việc bàn giao để quản lý duyệt nhanh hơn."
      >
        <textarea
          id={id("reason")}
          className="textarea"
          rows={3}
          maxLength={LIMITS.reason}
          value={draft.reason}
          aria-invalid={errors.reason ? "true" : undefined}
          onChange={(event) => update("reason", event.target.value)}
          onBlur={() => blur("reason")}
        />
      </Field>

      <section className="stack gap-2" aria-label="Hạn mức phép năm và cảnh báo">
        {quota ? (
          <div className="alert">
            <div className="stack gap-1">
              <span className="tabular">
                Hạn mức phép năm {quota.year}: {quota.daysPerYear.toLocaleString("vi-VN")} ngày ·
                đã dùng {owned ? spent.days.toLocaleString("vi-VN") : "…"} ngày · còn lại{" "}
                {remaining === null ? "…" : Math.max(0, remaining).toLocaleString("vi-VN")} ngày
              </span>
              <span className="muted">
                Đơn dự kiến {days.toLocaleString("vi-VN")} ngày làm việc. Số ngày cuối cùng do máy
                chủ tính lại khi lưu.
              </span>
            </div>
          </div>
        ) : (
          <div className="alert">
            <span className="muted">
              {quotaProblem ?? "Chưa đọc được hạn mức phép năm nên chưa tính được số ngày còn lại."}
            </span>
          </div>
        )}

        {late ? (
          <div className="alert alert-warning" role="status">
            <span>
              Gửi muộn: đơn phép năm gửi sát ngày (dưới {LATE_SUBMISSION_DAYS} ngày). Đơn vẫn được
              gửi và sẽ mang nhãn “Gửi muộn” để quản lý cân nhắc.
            </span>
          </div>
        ) : null}

        {overQuota ? (
          <div className="alert alert-warning" role="status">
            <span>
              Vượt hạn mức: đơn xin {days.toLocaleString("vi-VN")} ngày nhưng chỉ còn{" "}
              {Math.max(0, remaining ?? 0).toLocaleString("vi-VN")} ngày phép năm. Vẫn gửi được;
              phần vượt được ghi nhận là nghỉ trừ lương khi đơn được duyệt.
            </span>
          </div>
        ) : null}
      </section>

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
          {busy ? "Đang gửi…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
