"use client";

import { useId, useState } from "react";
import { ApiError } from "../api/client";
import { LIMITS, SHARED_GRADE_LABEL, STATUS_LABEL } from "../constants";
import type { Grade, GradeInput, OrgStatus, Position } from "../types";
import { ORG_STATUSES } from "../types";
import { Field, Select, TextArea, TextInput } from "./primitives";

type DraftKey = "code" | "name" | "description" | "rank";
type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey | "positionId", string>>;

const KEYS: DraftKey[] = ["code", "name", "description", "rank"];

function draftOf(initial: Grade | null): Draft {
  return {
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    rank: initial ? String(initial.rank) : String(LIMITS.rankMin),
  };
}

function check(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.code.trim()) errors.code = "Mã cấp bậc không được để trống.";
  else if (draft.code.trim().length > LIMITS.code)
    errors.code = `Mã cấp bậc tối đa ${LIMITS.code} ký tự.`;
  if (!draft.name.trim()) errors.name = "Tên cấp bậc không được để trống.";
  else if (draft.name.trim().length > LIMITS.name)
    errors.name = `Tên cấp bậc tối đa ${LIMITS.name} ký tự.`;
  if (draft.description.length > LIMITS.description)
    errors.description = `Mô tả tối đa ${LIMITS.description} ký tự.`;

  const rank = Number(draft.rank);
  if (!Number.isInteger(rank) || rank < LIMITS.rankMin || rank > LIMITS.rankMax)
    errors.rank = `Bậc phải là số nguyên từ ${LIMITS.rankMin} đến ${LIMITS.rankMax}.`;
  return errors;
}

interface GradeFormProps {
  initial?: Grade | null;
  positions: Position[];
  defaultPositionId: string | null;
  submitLabel: string;
  onSubmit: (values: GradeInput) => Promise<unknown>;
  onCancel: () => void;
}

export function GradeForm({
  initial,
  positions,
  defaultPositionId,
  submitLabel,
  onSubmit,
  onCancel,
}: GradeFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const fieldId = (key: string) => `grade-${uid}-${key}`;
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial ?? null));
  const [status, setStatus] = useState<OrgStatus>(initial?.status ?? "ACTIVE");
  const [positionId, setPositionId] = useState<string>(
    initial ? (initial.positionId ?? "") : (defaultPositionId ?? ""),
  );
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
        rank: Number(draft.rank),
        description: draft.description.trim(),
        status,
        positionId: positionId || null,
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Errors = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop() as
            | DraftKey
            | "positionId"
            | undefined;
          if (key && (KEYS.includes(key as DraftKey) || key === "positionId"))
            mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(caught.issues.length === 0 ? caught.message : null);
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa lưu được cấp bậc.");
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

      <Field
        label="Thuộc chức danh"
        htmlFor={fieldId("positionId")}
        error={errors.positionId}
        hint={`Chọn “${SHARED_GRADE_LABEL}” nếu cấp bậc áp dụng cho mọi chức danh.`}
      >
        <Select
          id={fieldId("positionId")}
          value={positionId}
          onChange={(event) => setPositionId(event.target.value)}
        >
          <option value="">{SHARED_GRADE_LABEL}</option>
          {positions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} ({row.code})
            </option>
          ))}
        </Select>
      </Field>

      <div className="field-grid">
        <Field label="Mã cấp bậc" htmlFor={fieldId("code")} required error={errors.code}>
          <TextInput
            id={fieldId("code")}
            value={draft.code}
            maxLength={LIMITS.code}
            autoComplete="off"
            invalid={Boolean(errors.code)}
            onChange={(event) => update("code", event.target.value)}
          />
        </Field>

        <Field label="Tên cấp bậc" htmlFor={fieldId("name")} required error={errors.name}>
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

      <div className="field-grid">
        <Field
          label="Bậc"
          htmlFor={fieldId("rank")}
          required
          error={errors.rank}
          hint={`Số nguyên ${LIMITS.rankMin}–${LIMITS.rankMax}, nhỏ hơn là bậc thấp hơn.`}
        >
          <TextInput
            id={fieldId("rank")}
            type="number"
            min={LIMITS.rankMin}
            max={LIMITS.rankMax}
            step={1}
            value={draft.rank}
            invalid={Boolean(errors.rank)}
            onChange={(event) => update("rank", event.target.value)}
          />
        </Field>

        <Field label="Trạng thái" htmlFor={fieldId("status")}>
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
      </div>

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
