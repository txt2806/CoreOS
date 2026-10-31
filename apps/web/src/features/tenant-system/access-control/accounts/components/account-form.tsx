"use client";

import { useId, useState } from "react";
import { ApiError } from "../api/client";
import {
  DISPLAY_NAME_MAX,
  EMAIL_MAX,
  EMPLOYEE_CODE_MAX,
  LOCKED_REASON_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
} from "../constants";
import type { Account, AccountRole, AccountStatus, CreateAccountInput } from "../types";
import { AlertGlyph, Field, Modal, Select, TextInput } from "./primitives";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateDraft {
  username: string;
  displayName: string;
  email: string;
  employeeCode: string;
  role: AccountRole;
  isSystemAdmin: boolean;
  status: AccountStatus;
  lockedReason: string;
  password: string;
}

export interface EditDraft {
  username: string;
  displayName: string;
  email: string;
  employeeCode: string;
}

type CreateErrors = Partial<Record<keyof CreateDraft, string>>;
type EditErrors = Partial<Record<keyof EditDraft, string>>;

function checkProfile(draft: EditDraft): EditErrors {
  const errors: EditErrors = {};
  const username = draft.username.trim();

  if (!username) errors.username = "Nhập tên đăng nhập.";
  else if (username.length < USERNAME_MIN)
    errors.username = `Tên đăng nhập từ ${USERNAME_MIN} ký tự.`;
  else if (username.length > USERNAME_MAX)
    errors.username = `Tên đăng nhập tối đa ${USERNAME_MAX} ký tự.`;
  else if (!USERNAME_PATTERN.test(username))
    errors.username = "Chỉ dùng chữ, số, dấu chấm, gạch dưới và gạch ngang.";

  if (!draft.displayName.trim()) errors.displayName = "Nhập tên hiển thị.";
  else if (draft.displayName.trim().length > DISPLAY_NAME_MAX)
    errors.displayName = `Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự.`;

  if (draft.email.trim()) {
    if (draft.email.trim().length > EMAIL_MAX)
      errors.email = `Email tối đa ${EMAIL_MAX} ký tự.`;
    else if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = "Email không hợp lệ.";
  }

  if (draft.employeeCode.trim().length > EMPLOYEE_CODE_MAX)
    errors.employeeCode = `Mã nhân viên tối đa ${EMPLOYEE_CODE_MAX} ký tự.`;

  return errors;
}

function checkCreate(draft: CreateDraft): CreateErrors {
  const errors: CreateErrors = { ...checkProfile(draft) };
  if (!draft.password) errors.password = "Nhập mật khẩu ban đầu.";
  else if (draft.password.length < PASSWORD_MIN)
    errors.password = `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự.`;
  else if (draft.password.length > PASSWORD_MAX)
    errors.password = `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`;

  if (draft.status === "LOCKED" && !draft.lockedReason.trim())
    errors.lockedReason = "Khoá ngay sau khi tạo thì phải ghi lý do.";
  else if (draft.lockedReason.trim().length > LOCKED_REASON_MAX)
    errors.lockedReason = `Lý do tối đa ${LOCKED_REASON_MAX} ký tự.`;

  if (draft.isSystemAdmin && draft.role !== "MANAGER")
    errors.role = "Quản trị hệ thống phải là tài khoản Quản lý.";

  return errors;
}

function issuesToErrors<T extends string>(
  issues: readonly { path: string; message: string }[],
  allowed: readonly T[],
): Partial<Record<T, string>> {
  const mapped: Partial<Record<T, string>> = {};
  for (const issue of issues) {
    const field = allowed.find((candidate) => candidate === issue.path);
    if (field && !mapped[field]) mapped[field] = issue.message;
  }
  return mapped;
}

const CREATE_ORDER: readonly (keyof CreateDraft)[] = [
  "username",
  "displayName",
  "email",
  "employeeCode",
  "role",
  "isSystemAdmin",
  "status",
  "lockedReason",
  "password",
];

const PROFILE_ORDER: readonly (keyof EditDraft)[] = [
  "username",
  "displayName",
  "email",
  "employeeCode",
];

interface CreateProps {
  /** The very first account must be a MANAGER with the system-admin flag. */
  firstAccount: boolean;
  onSubmit: (draft: Omit<CreateAccountInput, "actorName">) => Promise<unknown>;
  onClose: () => void;
}

export function CreateAccountDialog({ firstAccount, onSubmit, onClose }: CreateProps) {
  const uid = useId();
  const formId = `${uid}-form`;
  const [draft, setDraft] = useState<CreateDraft>({
    username: "",
    displayName: "",
    email: "",
    employeeCode: "",
    role: "EMPLOYEE",
    isSystemAdmin: false,
    status: "ACTIVE",
    lockedReason: "",
    password: "",
  });
  const [errors, setErrors] = useState<CreateErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof CreateDraft>(key: K, value: CreateDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError(null);
  };

  const submit = async () => {
    const found = checkCreate(draft);
    setErrors(found);
    setServerError(null);
    if (CREATE_ORDER.some((field) => found[field])) {
      const first = CREATE_ORDER.find((field) => found[field]);
      if (first) document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        username: draft.username.trim(),
        displayName: draft.displayName.trim(),
        email: draft.email.trim(),
        employeeCode: draft.employeeCode.trim(),
        role: draft.role,
        isSystemAdmin: draft.isSystemAdmin,
        status: draft.status,
        lockedReason: draft.lockedReason.trim(),
        password: draft.password,
      });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        // Zod issue paths point at the same field names the form uses; anything
        // else (duplicate username, first-account rule) is a body-level message.
        const mapped = issuesToErrors(caught.issues, CREATE_ORDER);
        setErrors((current) => ({ ...current, ...mapped }));
        if (Object.keys(mapped).length === 0) setServerError(caught.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Tạo tài khoản"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary"
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang tạo…" : "Tạo tài khoản"}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {firstAccount ? (
          <div className="alert alert-warning">
            <AlertGlyph />
            <span>
              Hệ thống chưa có tài khoản nào. Tài khoản đầu tiên bắt buộc là Quản lý kèm quyền quản
              trị hệ thống.
            </span>
          </div>
        ) : null}

        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="field-grid">
          <Field
            label="Tên đăng nhập"
            htmlFor={`${uid}-username`}
            required
            error={errors.username}
            hint={`${USERNAME_MIN}–${USERNAME_MAX} ký tự, không dấu.`}
          >
            <TextInput
              id={`${uid}-username`}
              value={draft.username}
              invalid={Boolean(errors.username)}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => set("username", event.target.value.toLowerCase())}
            />
          </Field>

          <Field
            label="Tên hiển thị"
            htmlFor={`${uid}-displayName`}
            required
            error={errors.displayName}
          >
            <TextInput
              id={`${uid}-displayName`}
              value={draft.displayName}
              invalid={Boolean(errors.displayName)}
              autoComplete="off"
              onChange={(event) => set("displayName", event.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor={`${uid}-email`} error={errors.email} hint="Có thể để trống.">
            <TextInput
              id={`${uid}-email`}
              type="email"
              value={draft.email}
              invalid={Boolean(errors.email)}
              autoComplete="off"
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>

          <Field
            label="Mã nhân viên"
            htmlFor={`${uid}-employeeCode`}
            error={errors.employeeCode}
            hint="Mã bên HR, dùng để đối chiếu. Có thể để trống."
          >
            <TextInput
              id={`${uid}-employeeCode`}
              value={draft.employeeCode}
              invalid={Boolean(errors.employeeCode)}
              autoComplete="off"
              onChange={(event) => set("employeeCode", event.target.value)}
            />
          </Field>

          <Field label="Vai trò" htmlFor={`${uid}-role`} required error={errors.role}>
            <Select
              id={`${uid}-role`}
              value={draft.role}
              invalid={Boolean(errors.role)}
              onChange={(event) => set("role", event.target.value === "MANAGER" ? "MANAGER" : "EMPLOYEE")}
            >
              <option value="EMPLOYEE">Nhân viên</option>
              <option value="MANAGER">Quản lý</option>
            </Select>
          </Field>

          <Field
            label="Trạng thái ban đầu"
            htmlFor={`${uid}-status`}
            required
            hint="Khoá ngay nếu chưa muốn người dùng đăng nhập."
          >
            <Select
              id={`${uid}-status`}
              value={draft.status}
              onChange={(event) =>
                set("status", event.target.value === "LOCKED" ? "LOCKED" : "ACTIVE")
              }
            >
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đang khoá</option>
            </Select>
          </Field>

          <Field
            label="Mật khẩu ban đầu"
            htmlFor={`${uid}-password`}
            required
            error={errors.password}
            hint={`${PASSWORD_MIN}–${PASSWORD_MAX} ký tự. Không hiển thị lại sau khi lưu.`}
          >
            <TextInput
              id={`${uid}-password`}
              type="password"
              value={draft.password}
              invalid={Boolean(errors.password)}
              autoComplete="new-password"
              onChange={(event) => set("password", event.target.value)}
            />
          </Field>
        </div>

        {draft.status === "LOCKED" ? (
          <Field
            label="Lý do khoá"
            htmlFor={`${uid}-lockedReason`}
            required
            error={errors.lockedReason}
            counter={`${draft.lockedReason.length}/${LOCKED_REASON_MAX}`}
          >
            <TextInput
              id={`${uid}-lockedReason`}
              value={draft.lockedReason}
              invalid={Boolean(errors.lockedReason)}
              onChange={(event) => set("lockedReason", event.target.value)}
            />
          </Field>
        ) : null}

        <label className="checkbox">
          <input
            type="checkbox"
            checked={draft.isSystemAdmin}
            onChange={(event) => {
              const checked = event.target.checked;
              setDraft((current) => ({
                ...current,
                isSystemAdmin: checked,
                // The API refuses an admin flag on a non-manager account.
                role: checked ? "MANAGER" : current.role,
              }));
            }}
          />
          <span>
            Cấp quyền quản trị hệ thống
            <span className="field-hint" style={{ display: "block" }}>
              Cấp và thu hồi quyền này đều ghi nhật ký kiểm toán kèm người thực hiện.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}

interface EditProps {
  account: Account;
  onSubmit: (draft: EditDraft) => Promise<unknown>;
  onClose: () => void;
}

export function EditAccountDialog({ account, onSubmit, onClose }: EditProps) {
  const uid = useId();
  const formId = `${uid}-form`;
  const [draft, setDraft] = useState<EditDraft>({
    username: account.username,
    displayName: account.displayName,
    email: account.email,
    employeeCode: account.employeeCode,
  });
  const [errors, setErrors] = useState<EditErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof EditDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError(null);
  };

  const submit = async () => {
    const found = checkProfile(draft);
    setErrors(found);
    setServerError(null);
    const first = PROFILE_ORDER.find((field) => found[field]);
    if (first) {
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        username: draft.username.trim(),
        displayName: draft.displayName.trim(),
        email: draft.email.trim(),
        employeeCode: draft.employeeCode.trim(),
      });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped = issuesToErrors(caught.issues, PROFILE_ORDER);
        setErrors((current) => ({ ...current, ...mapped }));
        if (Object.keys(mapped).length === 0) setServerError(caught.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Sửa hồ sơ ${account.username}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary"
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="muted">
          Vai trò, quyền quản trị và trạng thái không sửa ở đây — mỗi thay đổi quyền có bản ghi
          kiểm toán riêng.
        </p>

        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="field-grid">
          <Field label="Tên đăng nhập" htmlFor={`${uid}-username`} required error={errors.username}>
            <TextInput
              id={`${uid}-username`}
              value={draft.username}
              invalid={Boolean(errors.username)}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => set("username", event.target.value.toLowerCase())}
            />
          </Field>

          <Field
            label="Tên hiển thị"
            htmlFor={`${uid}-displayName`}
            required
            error={errors.displayName}
          >
            <TextInput
              id={`${uid}-displayName`}
              value={draft.displayName}
              invalid={Boolean(errors.displayName)}
              autoComplete="off"
              onChange={(event) => set("displayName", event.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor={`${uid}-email`} error={errors.email}>
            <TextInput
              id={`${uid}-email`}
              type="email"
              value={draft.email}
              invalid={Boolean(errors.email)}
              autoComplete="off"
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>

          <Field label="Mã nhân viên" htmlFor={`${uid}-employeeCode`} error={errors.employeeCode}>
            <TextInput
              id={`${uid}-employeeCode`}
              value={draft.employeeCode}
              invalid={Boolean(errors.employeeCode)}
              autoComplete="off"
              onChange={(event) => set("employeeCode", event.target.value)}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
