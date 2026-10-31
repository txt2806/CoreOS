"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { ALLOCATION_STATUS_LABEL, NOTE_LIMIT, PERCENT_MAX, PERCENT_MIN } from "../constants";
/* The status list is the DTO enum itself, so the select can never drift from it. */
import { ALLOCATION_STATUSES, type Allocation, type AllocationStatus } from "../types";
import { Field, Select, TextArea, TextInput } from "./primitives";

type DraftKey = "projectRef" | "percentage" | "status" | "note";
type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const KEYS: DraftKey[] = ["projectRef", "percentage", "status", "note"];

function draftOf(allocation?: Allocation): Draft {
  return {
    projectRef: allocation?.projectRef ?? "",
    percentage: String(allocation?.percentage ?? 100),
    status: allocation?.status ?? "PLANNED",
    note: allocation?.note ?? "",
  };
}

function check(draft: Draft): Errors {
  const errors: Errors = {};
  const percentage = Number(draft.percentage);
  if (!draft.projectRef.trim()) errors.projectRef = "Nhập tên hoặc mã dự án được phân bổ.";
  else if (draft.projectRef.length > 200) errors.projectRef = "Tên dự án tối đa 200 ký tự.";
  if (!Number.isFinite(percentage) || percentage < PERCENT_MIN || percentage > PERCENT_MAX)
    errors.percentage = `Tỉ lệ trong khoảng ${PERCENT_MIN}–${PERCENT_MAX}%.`;
  if (draft.note.length > NOTE_LIMIT) errors.note = `Ghi chú tối đa ${NOTE_LIMIT} ký tự.`;
  return errors;
}

export interface AllocationValues {
  projectRef: string;
  percentage: number;
  status: AllocationStatus;
  note: string;
}

interface AllocationFormProps {
  initial?: Allocation;
  submitLabel: string;
  onSubmit: (values: AllocationValues) => Promise<void>;
  onCancel?: () => void;
}

/**
 * `projectRef` is free text in the DTO, so the field is a name, not a project
 * picker: the API stores what is typed and nothing joins it to a project id.
 */
export function AllocationForm({ initial, submitLabel, onSubmit, onCancel }: AllocationFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: DraftKey) => `allocation-${uid}-${key}`;
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
      await onSubmit({
        projectRef: draft.projectRef.trim(),
        percentage: Number(draft.percentage),
        status: draft.status === "ACTIVE" || draft.status === "CANCELLED" ? draft.status : "PLANNED",
        note: draft.note.trim(),
      });
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
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được phân bổ.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack gap-4" onSubmit={submit} noValidate>
      {formError ? (
        <div className="alert alert-danger" role="alert">
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="field-grid">
        <Field
          label="Dự án"
          htmlFor={id("projectRef")}
          required
          error={errors.projectRef}
          hint="Chuỗi tự do: API lưu đúng tên nhập vào, không liên kết mã dự án."
        >
          <TextInput
            id={id("projectRef")}
            value={draft.projectRef}
            maxLength={200}
            autoComplete="off"
            invalid={Boolean(errors.projectRef)}
            placeholder="OneOps – Cổng vận hành"
            onChange={(event) => update("projectRef", event.target.value)}
            onBlur={() => blur("projectRef")}
          />
        </Field>

        <Field
          label="Tỉ lệ công suất"
          htmlFor={id("percentage")}
          required
          error={errors.percentage}
          hint={`Phần trăm giờ khả dụng của kỳ, tối đa ${PERCENT_MAX}%.`}
        >
          <TextInput
            id={id("percentage")}
            type="number"
            className="input tabular"
            step={5}
            min={PERCENT_MIN}
            max={PERCENT_MAX}
            value={draft.percentage}
            invalid={Boolean(errors.percentage)}
            onChange={(event) => update("percentage", event.target.value)}
            onBlur={() => blur("percentage")}
          />
        </Field>

        <Field label="Trạng thái" htmlFor={id("status")} hint="Phân bổ đã huỷ không còn tính vào công suất.">
          <Select
            id={id("status")}
            value={draft.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {ALLOCATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ALLOCATION_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Ghi chú"
        htmlFor={id("note")}
        error={errors.note}
        counter={`${draft.note.length}/${NOTE_LIMIT}`}
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
