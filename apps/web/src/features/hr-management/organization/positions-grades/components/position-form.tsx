"use client";

import { useId, useState } from "react";
import { ApiError } from "../api/client";
import { LIMITS, STATUS_LABEL } from "../constants";
import type { OrgStatus, Position, PositionInput } from "../types";
import { ORG_STATUSES } from "../types";
import { Field, Select, TextArea, TextInput } from "./primitives";

type DraftKey = "code" | "name" | "description";
type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const KEYS: DraftKey[] = ["code", "name", "description"];

function draftOf(initial: Position | null): Draft {
  return {
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
  };
}

function check(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.code.trim()) errors.code = "Mã chức danh không được để trống.";
  else if (draft.code.trim().length > LIMITS.code)
    errors.code = `Mã chức danh tối đa ${LIMITS.code} ký tự.`;
  if (!draft.name.trim()) errors.name = "Tên chức danh không được để trống.";
  else if (draft.name.trim().length > LIMITS.name)
    errors.name = `Tên chức danh tối đa ${LIMITS.name} ký tự.`;
  if (draft.description.length > LIMITS.description)
    errors.description = `Mô tả tối đa ${LIMITS.description} ký tự.`;
  return errors;
}

interface PositionFormProps {
  initial?: Position | null;
  submitLabel: string;
  onSubmit: (values: PositionInput) => Promise<unknown>;
  onCancel: () => void;
}

export function PositionForm({ initial, submitLabel, onSubmit, onCancel }: PositionFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const fieldId = (key: string) => `position-${uid}-${key}`;
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial ?? null));
  const [status, setStatus] = useState<OrgStatus>(initial?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: DraftKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
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
        name: draft.name.trim(),
        description: draft.description.trim(),
        status,
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Errors = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop() as DraftKey | undefined;
          if (key && KEYS.includes(key)) mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(caught.issues.length === 0 ? caught.message : null);
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được chức danh.");
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
          label="Mã chức danh"
          htmlFor={fieldId("code")}
          required
          error={errors.code}
          hint="Ví dụ: DEV, SALE, PM."
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

        <Field label="Tên chức danh" htmlFor={fieldId("name")} required error={errors.name}>
          <TextInput
            id={fieldId("name")}
            value={draft.name}
            maxLength={LIMITS.name}
            autoComplete="off"
            invalid={Boolean(errors.name)}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Trạng thái"
        htmlFor={fieldId("status")}
        hint="Chức danh ngừng áp dụng vẫn giữ nguyên trên hồ sơ nhân sự đã có."
      >
        <Select
          id={fieldId("status")}
          value={status}
          onChange={(event) => setStatus(event.target.value as OrgStatus)}
        >
          {ORG_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Mô tả"
        htmlFor={fieldId("description")}
        error={errors.description}
        counter={`${draft.description.length}/${LIMITS.description}`}
      >
        <TextArea
          id={fieldId("description")}
          rows={3}
          value={draft.description}
          maxLength={LIMITS.description}
          invalid={Boolean(errors.description)}
          onChange={(event) => update("description", event.target.value)}
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
