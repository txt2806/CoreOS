"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { today } from "../format";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectFields,
  type ProjectInput,
  type ProjectStatus,
} from "../types";
import { Field, Select, TextArea, TextInput } from "./primitives";

type DraftKey =
  | "code"
  | "name"
  | "scope"
  | "status"
  | "date"
  | "assignee"
  | "team"
  | "progress"
  | "objective"
  | "members"
  | "note";

type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

/** Mirrors the zod limits in `dto/project-spaces.dto.ts` so the browser fails first. */
const LIMITS: Record<DraftKey, number> = {
  code: 100,
  name: 500,
  scope: 250,
  status: 20,
  date: 10,
  assignee: 150,
  team: 1000,
  progress: 3,
  objective: 20000,
  members: 1000,
  note: 2000,
};

const KEYS: DraftKey[] = [
  "code",
  "name",
  "status",
  "date",
  "scope",
  "assignee",
  "team",
  "progress",
  "members",
  "objective",
  "note",
];

function draftOf(project?: Project): Draft {
  return {
    code: project?.code ?? "",
    name: project?.name ?? "",
    scope: project?.scope ?? "",
    status: project?.status ?? "Lên kế hoạch",
    date: project?.date?.slice(0, 10) ?? today(),
    assignee: project?.assignee ?? "",
    team: project?.fields.team ?? "",
    progress:
      typeof project?.fields.progress === "number" ? String(project.fields.progress) : "",
    objective: project?.fields.objective ?? "",
    members: project?.fields.members ?? "",
    note: project?.note ?? "",
  };
}

/** Validation runs on blur and on submit — never on the first keystroke. */
function check(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.code.trim()) errors.code = "Nhập mã dự án, ví dụ DA-2026-04.";
  else if (draft.code.length > LIMITS.code) errors.code = "Mã tối đa 100 ký tự.";

  if (!draft.name.trim()) errors.name = "Nhập tên dự án để danh sách đọc được ngay.";
  else if (draft.name.length > LIMITS.name) errors.name = "Tên tối đa 500 ký tự.";

  if (!draft.date) errors.date = "Chọn mốc thời gian của dự án (dd/mm/yyyy).";

  if (draft.progress.trim()) {
    const value = Number(draft.progress);
    if (!Number.isInteger(value) || value < 0 || value > 100)
      errors.progress = "Tiến độ là số nguyên từ 0 đến 100.";
  }

  if (draft.scope.length > LIMITS.scope) errors.scope = "Phạm vi tối đa 250 ký tự.";
  if (draft.assignee.length > LIMITS.assignee)
    errors.assignee = "Tên quản lý dự án tối đa 150 ký tự.";
  if (draft.team.length > LIMITS.team) errors.team = "Nhóm tối đa 1000 ký tự.";
  if (draft.members.length > LIMITS.members)
    errors.members = "Danh sách thành viên tối đa 1000 ký tự.";
  if (draft.objective.length > LIMITS.objective)
    errors.objective = "Mục tiêu tối đa 20.000 ký tự.";
  if (draft.note.length > LIMITS.note) errors.note = "Ghi chú tối đa 2000 ký tự.";

  return errors;
}

function payloadOf(draft: Draft, initial?: Project): ProjectInput {
  const fields: ProjectFields = initial ? { ...initial.fields } : {};
  const text = (value: string) => value.trim();

  if (text(draft.team)) fields.team = text(draft.team);
  else delete fields.team;

  if (text(draft.members)) fields.members = text(draft.members);
  else delete fields.members;

  if (text(draft.objective)) fields.objective = text(draft.objective);
  else delete fields.objective;

  if (draft.progress.trim()) fields.progress = Number(draft.progress);
  else delete fields.progress;

  return {
    code: text(draft.code),
    name: text(draft.name),
    scope: text(draft.scope),
    status: draft.status as ProjectStatus,
    date: draft.date,
    assignee: text(draft.assignee),
    note: text(draft.note),
    fields,
  };
}

interface ProjectFormProps {
  initial?: Project;
  submitLabel: string;
  onSubmit: (values: ProjectInput) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({ initial, submitLabel, onSubmit, onCancel }: ProjectFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: DraftKey) => `project-${uid}-${key}`;
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
      await onSubmit(payloadOf(draft, initial));
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
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được dự án.");
      }
    } finally {
      setBusy(false);
    }
  };

  const counter = (key: DraftKey) => `${draft[key].length}/${LIMITS[key]}`;

  return (
    <form className="stack gap-4" onSubmit={submit} noValidate>
      {formError ? (
        <div className="alert alert-danger" role="alert">
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="field-grid">
        <Field label="Mã dự án" htmlFor={id("code")} required error={errors.code}>
          <TextInput
            id={id("code")}
            value={draft.code}
            maxLength={LIMITS.code}
            autoComplete="off"
            invalid={Boolean(errors.code)}
            placeholder="DA-2026-04"
            onChange={(event) => update("code", event.target.value)}
            onBlur={() => blur("code")}
          />
        </Field>

        <Field
          label="Tên dự án"
          htmlFor={id("name")}
          required
          error={errors.name}
          counter={counter("name")}
        >
          <TextInput
            id={id("name")}
            value={draft.name}
            maxLength={LIMITS.name}
            autoComplete="off"
            invalid={Boolean(errors.name)}
            placeholder="Ví dụ: Chuẩn hoá quy trình vận hành kho"
            onChange={(event) => update("name", event.target.value)}
            onBlur={() => blur("name")}
          />
        </Field>

        <Field label="Trạng thái" htmlFor={id("status")} required error={errors.status}>
          <Select
            id={id("status")}
            value={draft.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Mốc thời gian"
          htmlFor={id("date")}
          required
          error={errors.date}
          hint="Ngày mục tiêu hoàn thành hoặc mốc bàn giao gần nhất."
        >
          <TextInput
            id={id("date")}
            type="date"
            value={draft.date}
            invalid={Boolean(errors.date)}
            onChange={(event) => update("date", event.target.value)}
            onBlur={() => blur("date")}
          />
        </Field>

        <Field label="Quản lý dự án" htmlFor={id("assignee")} error={errors.assignee}>
          <TextInput
            id={id("assignee")}
            value={draft.assignee}
            maxLength={LIMITS.assignee}
            autoComplete="off"
            invalid={Boolean(errors.assignee)}
            placeholder="Tên trong hồ sơ nhân sự"
            onChange={(event) => update("assignee", event.target.value)}
            onBlur={() => blur("assignee")}
          />
        </Field>

        <Field label="Nhóm phụ trách" htmlFor={id("team")} error={errors.team}>
          <TextInput
            id={id("team")}
            value={draft.team}
            maxLength={LIMITS.team}
            autoComplete="off"
            invalid={Boolean(errors.team)}
            placeholder="Ví dụ: Vận hành miền Nam"
            onChange={(event) => update("team", event.target.value)}
            onBlur={() => blur("team")}
          />
        </Field>

        <Field
          label="Tiến độ"
          htmlFor={id("progress")}
          error={errors.progress}
          hint="Phần trăm đã hoàn thành, 0–100."
        >
          <TextInput
            id={id("progress")}
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={5}
            value={draft.progress}
            invalid={Boolean(errors.progress)}
            onChange={(event) => update("progress", event.target.value)}
            onBlur={() => blur("progress")}
          />
        </Field>

        <Field label="Phạm vi" htmlFor={id("scope")} error={errors.scope}>
          <TextInput
            id={id("scope")}
            value={draft.scope}
            maxLength={LIMITS.scope}
            autoComplete="off"
            invalid={Boolean(errors.scope)}
            placeholder="Bộ phận, chi nhánh hoặc hệ thống liên quan"
            onChange={(event) => update("scope", event.target.value)}
            onBlur={() => blur("scope")}
          />
        </Field>
      </div>

      <Field
        label="Thành viên"
        htmlFor={id("members")}
        error={errors.members}
        hint="Cách nhau bằng dấu phẩy; dùng đúng tên trong hồ sơ nhân sự."
      >
        <TextInput
          id={id("members")}
          value={draft.members}
          maxLength={LIMITS.members}
          autoComplete="off"
          invalid={Boolean(errors.members)}
          placeholder="Nguyễn An, Trần Bình, Lê Chi"
          onChange={(event) => update("members", event.target.value)}
          onBlur={() => blur("members")}
        />
      </Field>

      <Field
        label="Mục tiêu"
        htmlFor={id("objective")}
        error={errors.objective}
        counter={counter("objective")}
        hint="Kết quả đo được khi dự án kết thúc."
      >
        <TextArea
          id={id("objective")}
          rows={4}
          maxLength={LIMITS.objective}
          value={draft.objective}
          invalid={Boolean(errors.objective)}
          onChange={(event) => update("objective", event.target.value)}
          onBlur={() => blur("objective")}
        />
      </Field>

      <Field
        label="Ghi chú"
        htmlFor={id("note")}
        error={errors.note}
        counter={counter("note")}
        hint="Bối cảnh, ràng buộc hoặc thoả thuận với khách hàng nội bộ."
      >
        <TextArea
          id={id("note")}
          rows={3}
          maxLength={LIMITS.note}
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
