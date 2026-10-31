"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { today } from "../format";
import { TASK_PRIORITIES, type Task, type TaskFields, type TaskInput } from "../types";
import { Field, Select, TextInput } from "./primitives";

type DraftKey =
  | "code"
  | "name"
  | "scope"
  | "date"
  | "assignee"
  | "reviewer"
  | "priority"
  | "project"
  | "tags"
  | "startDate"
  | "progress"
  | "note";

type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const LIMITS: Record<DraftKey, number> = {
  code: 100,
  name: 500,
  scope: 250,
  date: 10,
  assignee: 150,
  reviewer: 150,
  priority: 20,
  project: 1000,
  tags: 1000,
  startDate: 10,
  progress: 3,
  note: 2000,
};

const KEYS: DraftKey[] = [
  "code",
  "name",
  "scope",
  "date",
  "assignee",
  "reviewer",
  "priority",
  "project",
  "tags",
  "startDate",
  "progress",
  "note",
];

function draftOf(task?: Task): Draft {
  return {
    code: task?.code ?? "",
    name: task?.name ?? "",
    scope: task?.scope ?? "",
    date: task?.date?.slice(0, 10) ?? today(),
    assignee: task?.assignee ?? "",
    reviewer: task?.reviewer ?? "",
    priority: task?.fields.priority ?? "",
    project: task?.fields.project ?? "",
    tags: task?.fields.tags ?? "",
    startDate: task?.fields.startDate ?? "",
    progress:
      typeof task?.fields.progress === "number" ? String(task.fields.progress) : "",
    note: task?.note ?? "",
  };
}

/** Validation runs on blur and on submit — never on the first keystroke. */
function check(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.code.trim()) errors.code = "Nhập mã công việc, ví dụ OPS-128.";
  else if (draft.code.length > LIMITS.code) errors.code = "Mã tối đa 100 ký tự.";

  if (!draft.name.trim()) errors.name = "Nhập tên công việc để người khác hiểu cần làm gì.";
  else if (draft.name.length > LIMITS.name) errors.name = "Tên tối đa 500 ký tự.";

  if (!draft.date) errors.date = "Chọn hạn hoàn thành (dd/mm/yyyy).";
  if (draft.startDate && draft.date && draft.startDate > draft.date)
    errors.startDate = "Ngày bắt đầu phải trước hoặc bằng hạn hoàn thành.";

  if (draft.progress.trim()) {
    const value = Number(draft.progress);
    if (!Number.isInteger(value) || value < 0 || value > 100)
      errors.progress = "Tiến độ là số nguyên từ 0 đến 100.";
  }

  if (draft.scope.length > LIMITS.scope) errors.scope = "Phạm vi tối đa 250 ký tự.";
  if (draft.assignee.length > LIMITS.assignee)
    errors.assignee = "Tên người phụ trách tối đa 150 ký tự.";
  if (draft.reviewer.length > LIMITS.reviewer)
    errors.reviewer = "Tên người kiểm tra tối đa 150 ký tự.";
  if (draft.project.length > LIMITS.project) errors.project = "Dự án tối đa 1000 ký tự.";
  if (draft.tags.length > LIMITS.tags) errors.tags = "Nhãn tối đa 1000 ký tự.";
  if (draft.note.length > LIMITS.note) errors.note = "Mô tả tối đa 2000 ký tự.";

  return errors;
}

function payloadOf(draft: Draft, initial?: Task): TaskInput {
  const fields: TaskFields = initial ? { ...initial.fields } : {};
  const text = (value: string) => value.trim();

  if (text(draft.project)) fields.project = text(draft.project);
  else delete fields.project;

  if (draft.priority) fields.priority = draft.priority as TaskFields["priority"];
  else delete fields.priority;

  if (text(draft.tags)) fields.tags = text(draft.tags);
  else delete fields.tags;

  if (draft.startDate) fields.startDate = draft.startDate;
  else delete fields.startDate;

  if (draft.progress.trim()) fields.progress = Number(draft.progress);
  else delete fields.progress;

  return {
    code: text(draft.code),
    name: text(draft.name),
    scope: text(draft.scope),
    date: draft.date,
    assignee: text(draft.assignee),
    reviewer: text(draft.reviewer),
    note: text(draft.note),
    fields,
  };
}

interface TaskFormProps {
  initial?: Task;
  submitLabel: string;
  onSubmit: (values: TaskInput) => Promise<void>;
  onCancel?: () => void;
}

export function TaskForm({ initial, submitLabel, onSubmit, onCancel }: TaskFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: DraftKey) => `task-${uid}-${key}`;
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
        setFormError(
          caught instanceof Error ? caught.message : "Chưa lưu được công việc.",
        );
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
        <Field label="Mã công việc" htmlFor={id("code")} required error={errors.code}>
          <TextInput
            id={id("code")}
            value={draft.code}
            maxLength={LIMITS.code}
            autoComplete="off"
            invalid={Boolean(errors.code)}
            placeholder="OPS-128"
            onChange={(event) => update("code", event.target.value)}
            onBlur={() => blur("code")}
          />
        </Field>

        <Field
          label="Tên công việc"
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
            placeholder="Ví dụ: Hoàn thiện luồng duyệt nghỉ phép"
            onChange={(event) => update("name", event.target.value)}
            onBlur={() => blur("name")}
          />
        </Field>

        <Field label="Hạn hoàn thành" htmlFor={id("date")} required error={errors.date}>
          <TextInput
            id={id("date")}
            type="date"
            value={draft.date}
            invalid={Boolean(errors.date)}
            onChange={(event) => update("date", event.target.value)}
            onBlur={() => blur("date")}
          />
        </Field>

        <Field
          label="Ngày bắt đầu"
          htmlFor={id("startDate")}
          error={errors.startDate}
          hint="Để trống nếu công việc bắt đầu ngay."
        >
          <TextInput
            id={id("startDate")}
            type="date"
            value={draft.startDate}
            invalid={Boolean(errors.startDate)}
            onChange={(event) => update("startDate", event.target.value)}
            onBlur={() => blur("startDate")}
          />
        </Field>

        <Field label="Người phụ trách" htmlFor={id("assignee")} error={errors.assignee}>
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

        <Field label="Người kiểm tra" htmlFor={id("reviewer")} error={errors.reviewer}>
          <TextInput
            id={id("reviewer")}
            value={draft.reviewer}
            maxLength={LIMITS.reviewer}
            autoComplete="off"
            invalid={Boolean(errors.reviewer)}
            placeholder="Người nghiệm thu kết quả"
            onChange={(event) => update("reviewer", event.target.value)}
            onBlur={() => blur("reviewer")}
          />
        </Field>

        <Field label="Ưu tiên" htmlFor={id("priority")}>
          <Select
            id={id("priority")}
            value={draft.priority}
            onChange={(event) => update("priority", event.target.value)}
          >
            <option value="">Chưa xếp mức</option>
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
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
            placeholder="Nhóm, dự án hoặc bộ phận tiếp nhận"
            onChange={(event) => update("scope", event.target.value)}
            onBlur={() => blur("scope")}
          />
        </Field>

        <Field label="Dự án" htmlFor={id("project")} error={errors.project}>
          <TextInput
            id={id("project")}
            value={draft.project}
            maxLength={LIMITS.project}
            autoComplete="off"
            invalid={Boolean(errors.project)}
            placeholder="Tên dự án nếu công việc thuộc dự án"
            onChange={(event) => update("project", event.target.value)}
            onBlur={() => blur("project")}
          />
        </Field>

        <Field label="Nhãn" htmlFor={id("tags")} error={errors.tags} hint="Cách nhau bằng dấu phẩy.">
          <TextInput
            id={id("tags")}
            value={draft.tags}
            maxLength={LIMITS.tags}
            autoComplete="off"
            invalid={Boolean(errors.tags)}
            placeholder="backend, khách hàng, gấp"
            onChange={(event) => update("tags", event.target.value)}
            onBlur={() => blur("tags")}
          />
        </Field>
      </div>

      <Field
        label="Mô tả"
        htmlFor={id("note")}
        error={errors.note}
        counter={counter("note")}
        hint="Ghi bối cảnh và tiêu chí hoàn thành để người nhận không phải hỏi lại."
      >
        <textarea
          id={id("note")}
          className="textarea"
          rows={4}
          maxLength={LIMITS.note}
          value={draft.note}
          aria-invalid={errors.note ? "true" : undefined}
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
