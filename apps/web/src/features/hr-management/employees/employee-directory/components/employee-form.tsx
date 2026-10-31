"use client";

import { useId, useState } from "react";
import { ApiError } from "../api/client";
import { LIMITS, STATUS_LABEL } from "../constants";
import type { Employee, EmployeeInput, EmployeeStatus } from "../types";
import { EMPLOYEE_STATUSES } from "../types";
import { Field, Select, TextArea, TextInput } from "./primitives";

type DraftKey =
  | "code"
  | "fullName"
  | "email"
  | "phone"
  | "jobTitle"
  | "departmentName"
  | "teamName"
  | "managerName"
  | "startDate"
  | "note";

type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const KEYS: DraftKey[] = [
  "code",
  "fullName",
  "email",
  "phone",
  "jobTitle",
  "departmentName",
  "teamName",
  "managerName",
  "startDate",
  "note",
];

/** Mirrors the DTO: blank is allowed, anything else must parse as an address. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function draftOf(initial: Employee | null): Draft {
  return {
    code: initial?.code ?? "",
    fullName: initial?.fullName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    jobTitle: initial?.jobTitle ?? "",
    departmentName: initial?.departmentName ?? "",
    teamName: initial?.teamName ?? "",
    managerName: initial?.managerName ?? "",
    startDate: initial?.startDate?.slice(0, 10) ?? "",
    note: initial?.note ?? "",
  };
}

function check(draft: Draft): Errors {
  const errors: Errors = {};
  const code = draft.code.trim();
  const name = draft.fullName.trim();
  const email = draft.email.trim();

  if (!code) errors.code = "Mã nhân sự không được để trống.";
  else if (code.length > LIMITS.code) errors.code = `Mã nhân sự tối đa ${LIMITS.code} ký tự.`;

  if (!name) errors.fullName = "Họ tên không được để trống.";
  else if (name.length > LIMITS.fullName)
    errors.fullName = `Họ tên tối đa ${LIMITS.fullName} ký tự.`;

  if (email && !EMAIL_SHAPE.test(email)) errors.email = "Email không hợp lệ";
  else if (email.length > LIMITS.email) errors.email = `Email tối đa ${LIMITS.email} ký tự.`;

  if (draft.phone.trim().length > LIMITS.phone)
    errors.phone = `Điện thoại tối đa ${LIMITS.phone} ký tự.`;
  if (draft.jobTitle.trim().length > LIMITS.jobTitle)
    errors.jobTitle = `Chức danh tối đa ${LIMITS.jobTitle} ký tự.`;
  if (draft.departmentName.trim().length > LIMITS.departmentName)
    errors.departmentName = `Phòng ban tối đa ${LIMITS.departmentName} ký tự.`;
  if (draft.teamName.trim().length > LIMITS.teamName)
    errors.teamName = `Nhóm tối đa ${LIMITS.teamName} ký tự.`;
  if (draft.managerName.trim().length > LIMITS.managerName)
    errors.managerName = `Người quản lý tối đa ${LIMITS.managerName} ký tự.`;
  if (draft.note.length > LIMITS.note) errors.note = `Ghi chú tối đa ${LIMITS.note} ký tự.`;

  return errors;
}

interface EmployeeFormProps {
  initial?: Employee | null;
  submitLabel: string;
  onSubmit: (values: EmployeeInput) => Promise<unknown>;
  onCancel: () => void;
}

export function EmployeeForm({ initial, submitLabel, onSubmit, onCancel }: EmployeeFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const fieldId = (key: string) => `employee-${uid}-${key}`;
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial ?? null));
  const [status, setStatus] = useState<EmployeeStatus>(initial?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: DraftKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    /* Clear the stale message; it is re-checked when the form is submitted. */
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    const found = check(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    setFormError(null);
    try {
      await onSubmit({
        code: draft.code.trim(),
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        jobTitle: draft.jobTitle.trim(),
        departmentName: draft.departmentName.trim(),
        teamName: draft.teamName.trim(),
        managerName: draft.managerName.trim(),
        startDate: draft.startDate.trim() === "" ? null : draft.startDate.trim(),
        status,
        note: draft.note.trim(),
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Errors = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (key && (KEYS as string[]).includes(key)) mapped[key as DraftKey] = issue.message;
        }
        setErrors(mapped);
        /* Duplicate code or email arrives as a 409 without an issue list. */
        setFormError(caught.issues.length === 0 ? caught.message : null);
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được hồ sơ nhân sự.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack gap-4">
      {formError ? (
        <div className="alert alert-danger" role="alert">
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="field-grid">
        <Field
          label="Mã nhân sự"
          htmlFor={fieldId("code")}
          required
          error={errors.code}
          hint="Mã là duy nhất trong toàn hệ thống."
        >
          <TextInput
            id={fieldId("code")}
            value={draft.code}
            maxLength={LIMITS.code}
            autoComplete="off"
            invalid={Boolean(errors.code)}
            onChange={(event) => update("code", event.target.value)}
          />
        </Field>

        <Field label="Họ và tên" htmlFor={fieldId("fullName")} required error={errors.fullName}>
          <TextInput
            id={fieldId("fullName")}
            value={draft.fullName}
            maxLength={LIMITS.fullName}
            autoComplete="name"
            invalid={Boolean(errors.fullName)}
            onChange={(event) => update("fullName", event.target.value)}
          />
        </Field>

        <Field
          label="Email"
          htmlFor={fieldId("email")}
          error={errors.email}
          hint="Có thể để trống; nếu nhập thì phải đúng định dạng và chưa ai dùng."
        >
          <TextInput
            id={fieldId("email")}
            type="email"
            value={draft.email}
            maxLength={LIMITS.email}
            autoComplete="email"
            invalid={Boolean(errors.email)}
            onChange={(event) => update("email", event.target.value)}
          />
        </Field>

        <Field label="Điện thoại" htmlFor={fieldId("phone")} error={errors.phone}>
          <TextInput
            id={fieldId("phone")}
            value={draft.phone}
            maxLength={LIMITS.phone}
            autoComplete="tel"
            invalid={Boolean(errors.phone)}
            onChange={(event) => update("phone", event.target.value)}
          />
        </Field>

        <Field
          label="Chức danh"
          htmlFor={fieldId("jobTitle")}
          error={errors.jobTitle}
          hint="Chức danh là thuộc tính công việc, không phải vai trò hệ thống."
        >
          <TextInput
            id={fieldId("jobTitle")}
            value={draft.jobTitle}
            maxLength={LIMITS.jobTitle}
            autoComplete="organization-title"
            invalid={Boolean(errors.jobTitle)}
            onChange={(event) => update("jobTitle", event.target.value)}
          />
        </Field>

        <Field label="Ngày vào làm" htmlFor={fieldId("startDate")} error={errors.startDate}>
          <TextInput
            id={fieldId("startDate")}
            type="date"
            value={draft.startDate}
            invalid={Boolean(errors.startDate)}
            onChange={(event) => update("startDate", event.target.value)}
          />
        </Field>

        <Field
          label="Phòng ban"
          htmlFor={fieldId("departmentName")}
          error={errors.departmentName}
          hint="Ghi đúng tên phòng ban để bộ lọc theo phòng ban khớp dữ liệu."
        >
          <TextInput
            id={fieldId("departmentName")}
            value={draft.departmentName}
            maxLength={LIMITS.departmentName}
            autoComplete="off"
            invalid={Boolean(errors.departmentName)}
            onChange={(event) => update("departmentName", event.target.value)}
          />
        </Field>

        <Field
          label="Nhóm"
          htmlFor={fieldId("teamName")}
          error={errors.teamName}
          hint="Mỗi người chỉ thuộc tối đa một nhóm."
        >
          <TextInput
            id={fieldId("teamName")}
            value={draft.teamName}
            maxLength={LIMITS.teamName}
            autoComplete="off"
            invalid={Boolean(errors.teamName)}
            onChange={(event) => update("teamName", event.target.value)}
          />
        </Field>

        <Field label="Người quản lý" htmlFor={fieldId("managerName")} error={errors.managerName}>
          <TextInput
            id={fieldId("managerName")}
            value={draft.managerName}
            maxLength={LIMITS.managerName}
            autoComplete="off"
            invalid={Boolean(errors.managerName)}
            onChange={(event) => update("managerName", event.target.value)}
          />
        </Field>

        <Field
          label="Trạng thái"
          htmlFor={fieldId("status")}
          hint="Hồ sơ đã nghỉ vẫn tra cứu được nhưng không còn trong danh sách đang làm việc."
        >
          <Select
            id={fieldId("status")}
            value={status}
            onChange={(event) => setStatus(event.target.value as EmployeeStatus)}
          >
            {EMPLOYEE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Ghi chú"
        htmlFor={fieldId("note")}
        error={errors.note}
        counter={`${draft.note.length}/${LIMITS.note}`}
      >
        <TextArea
          id={fieldId("note")}
          rows={3}
          value={draft.note}
          maxLength={LIMITS.note}
          invalid={Boolean(errors.note)}
          onChange={(event) => update("note", event.target.value)}
        />
      </Field>

      <div className="row items-center gap-2" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Huỷ
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={busy}
          aria-busy={busy ? "true" : undefined}
        >
          {busy ? "Đang lưu…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
