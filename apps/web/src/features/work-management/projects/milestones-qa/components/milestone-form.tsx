"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { MILESTONE_STATUS_LABEL } from "../constants";
import { today } from "../format";
import type { Milestone, MilestoneInput, MilestoneStatus, ProjectRef } from "../types";
import { Field, Select, TextArea, TextInput } from "./primitives";

type DraftKey = "projectId" | "name" | "description" | "targetDate" | "contractRef" | "status";

type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

/** Mirrors the zod limits in `dto/milestones-qa.dto.ts`. */
const LIMITS: Record<DraftKey, number> = {
  projectId: 36,
  name: 300,
  description: 2000,
  targetDate: 10,
  contractRef: 200,
  status: 20,
};

const KEYS: DraftKey[] = [
  "projectId",
  "name",
  "description",
  "targetDate",
  "contractRef",
  "status",
];

/** Creation may only start at PLANNED or IN_PROGRESS; the API rejects the rest. */
const CREATE_STATUSES: MilestoneStatus[] = ["PLANNED", "IN_PROGRESS"];

function draftOf(milestone?: Milestone): Draft {
  return {
    projectId: milestone?.projectId ?? "",
    name: milestone?.name ?? "",
    description: milestone?.description ?? "",
    targetDate: milestone?.targetDate?.slice(0, 10) ?? today(),
    contractRef: milestone?.contractRef ?? "",
    status: milestone?.status ?? "PLANNED",
  };
}

/** Validation runs on blur and on submit — never on the first keystroke. */
function check(draft: Draft, editing: boolean): Errors {
  const errors: Errors = {};
  if (!editing && !draft.projectId) errors.projectId = "Chọn dự án sở hữu mốc này.";
  if (!draft.name.trim()) errors.name = "Nhập tên mốc, ví dụ “Nghiệm thu giai đoạn 2”.";
  else if (draft.name.length > LIMITS.name) errors.name = "Tên mốc tối đa 300 ký tự.";
  if (!draft.targetDate) errors.targetDate = "Chọn ngày mục tiêu (dd/mm/yyyy).";
  if (draft.description.length > LIMITS.description)
    errors.description = "Mô tả tối đa 2000 ký tự.";
  if (draft.contractRef.length > LIMITS.contractRef)
    errors.contractRef = "Tham chiếu hợp đồng tối đa 200 ký tự.";
  return errors;
}

function payloadOf(draft: Draft): MilestoneInput {
  return {
    projectId: draft.projectId,
    name: draft.name.trim(),
    description: draft.description.trim(),
    targetDate: draft.targetDate,
    contractRef: draft.contractRef.trim(),
    status: draft.status as MilestoneStatus,
  };
}

interface MilestoneFormProps {
  initial?: Milestone;
  projects: ProjectRef[];
  projectsError?: string | null;
  submitLabel: string;
  onSubmit: (values: MilestoneInput) => Promise<void>;
  onCancel?: () => void;
}

export function MilestoneForm({
  initial,
  projects,
  projectsError,
  submitLabel,
  onSubmit,
  onCancel,
}: MilestoneFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: DraftKey) => `milestone-${uid}-${key}`;
  const editing = Boolean(initial);
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: DraftKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      const next = check({ ...draft, [key]: value }, editing);
      setErrors((current) => ({ ...current, [key]: next[key] }));
    }
  };

  const blur = (key: DraftKey) => {
    const next = check(draft, editing);
    setErrors((current) => ({ ...current, [key]: next[key] }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = check(draft, editing);
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
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được mốc.");
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

      {!editing && projectsError ? (
        <div className="alert alert-warning" role="status">
          <span>{projectsError}</span>
        </div>
      ) : null}

      <div className="field-grid">
        {editing ? (
          <Field
            label="Dự án"
            htmlFor={id("projectId")}
            hint="Dự án không đổi sau khi tạo mốc; API không nhận trường này khi cập nhật."
          >
            <TextInput
              id={id("projectId")}
              value={draft.projectId}
              readOnly
              className="input mono"
              aria-describedby={`${id("projectId")}-hint`}
            />
          </Field>
        ) : (
          <Field
            label="Dự án"
            htmlFor={id("projectId")}
            required
            error={errors.projectId}
            hint="Chỉ hiển thị 100 dự án gần nhất theo từ khoá."
          >
            <Select
              id={id("projectId")}
              value={draft.projectId}
              invalid={Boolean(errors.projectId)}
              onChange={(event) => update("projectId", event.target.value)}
            >
              <option value="">Chọn dự án</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field
          label="Tên mốc"
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
            placeholder="Nghiệm thu giai đoạn 2"
            onChange={(event) => update("name", event.target.value)}
            onBlur={() => blur("name")}
          />
        </Field>

        <Field label="Ngày mục tiêu" htmlFor={id("targetDate")} required error={errors.targetDate}>
          <TextInput
            id={id("targetDate")}
            type="date"
            value={draft.targetDate}
            invalid={Boolean(errors.targetDate)}
            onChange={(event) => update("targetDate", event.target.value)}
            onBlur={() => blur("targetDate")}
          />
        </Field>

        <Field
          label="Tham chiếu hợp đồng"
          htmlFor={id("contractRef")}
          error={errors.contractRef}
          hint="Số phụ lục hoặc điều khoản nghiệm thu, nếu có."
        >
          <TextInput
            id={id("contractRef")}
            value={draft.contractRef}
            maxLength={LIMITS.contractRef}
            autoComplete="off"
            invalid={Boolean(errors.contractRef)}
            placeholder="PL-2026-04 · Điều 5"
            onChange={(event) => update("contractRef", event.target.value)}
            onBlur={() => blur("contractRef")}
          />
        </Field>

        {editing ? null : (
          <Field
            label="Trạng thái ban đầu"
            htmlFor={id("status")}
            hint="Mốc mới chỉ có thể bắt đầu ở Lên kế hoạch hoặc Đang thực hiện."
          >
            <Select
              id={id("status")}
              value={draft.status}
              onChange={(event) => update("status", event.target.value)}
            >
              {CREATE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MILESTONE_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field
        label="Mô tả"
        htmlFor={id("description")}
        error={errors.description}
        counter={counter("description")}
        hint="Phạm vi bàn giao và điều kiện được coi là đạt."
      >
        <TextArea
          id={id("description")}
          rows={3}
          maxLength={LIMITS.description}
          value={draft.description}
          invalid={Boolean(errors.description)}
          onChange={(event) => update("description", event.target.value)}
          onBlur={() => blur("description")}
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
