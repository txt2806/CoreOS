"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ACTION_KINDS,
  ACTION_LABELS,
  DEFAULT_LOCK_SECONDS,
  DEFAULT_POSITION,
  FIELDS,
  FIELD_LABELS,
  MAX_ACTIONS,
  MAX_CONDITIONS,
  MAX_CONDITION_VALUE,
  MAX_LOCK_SECONDS,
  MAX_POSITION,
  OPERATORS,
  OPERATOR_HINTS,
  OPERATOR_LABELS,
  PLACEHOLDER_HINT,
  TRIGGERS,
  TRIGGER_LABELS,
} from "../constants";
import { describeSpec } from "../format";
import type {
  ActionKind,
  ActionSpec,
  Condition,
  Operator,
  Rule,
  RuleField,
  RuleInput,
  Trigger,
} from "../types";
import { AlertGlyph, PlusGlyph, TrashGlyph } from "./primitives";

interface ConditionRow {
  key: string;
  field: RuleField;
  operator: Operator;
  value: string;
}

interface ActionRow {
  key: string;
  spec: ActionSpec;
}

function specOf(kind: ActionKind): ActionSpec {
  switch (kind) {
    case "assign":
      return { kind, assignee: "" };
    case "status":
      return { kind, status: "" };
    case "comment":
      return { kind, body: "" };
    case "notify":
      return { kind, recipients: "", title: "", body: "" };
  }
}

function trimSpec(spec: ActionSpec): ActionSpec {
  switch (spec.kind) {
    case "assign":
      return { kind: "assign", assignee: spec.assignee.trim() };
    case "status":
      return { kind: "status", status: spec.status.trim() };
    case "comment":
      return { kind: "comment", body: spec.body.trim() };
    case "notify":
      return {
        kind: "notify",
        recipients: spec.recipients.trim(),
        title: spec.title.trim(),
        body: spec.body.trim(),
      };
  }
}

/** Mirrors every `.min()`/`.max()` in the DTO so the server never has to reject. */
function validate(input: {
  name: string;
  description: string;
  position: string;
  lockSeconds: string;
  note: string;
  conditions: Condition[];
  actions: ActionSpec[];
}): string[] {
  const issues: string[] = [];
  if (input.name.trim().length < 2) issues.push("Tên quy tắc cần ít nhất 2 ký tự.");
  if (input.name.trim().length > 160) issues.push("Tên quy tắc tối đa 160 ký tự.");
  if (input.description.length > 500) issues.push("Mô tả tối đa 500 ký tự.");
  if (input.conditions.length > MAX_CONDITIONS)
    issues.push(`Chỉ được tối đa ${MAX_CONDITIONS} điều kiện.`);

  input.conditions.forEach((condition, index) => {
    if (condition.operator !== "exists" && !condition.value.trim())
      issues.push(
        `Điều kiện ${index + 1}: nhập giá trị cho “${FIELD_LABELS[condition.field]} ${OPERATOR_LABELS[condition.operator]}”.`,
      );
    if (condition.value.length > MAX_CONDITION_VALUE)
      issues.push(`Điều kiện ${index + 1}: giá trị tối đa ${MAX_CONDITION_VALUE} ký tự.`);
  });

  if (input.actions.length === 0) issues.push("Cần ít nhất một hành động.");
  if (input.actions.length > MAX_ACTIONS)
    issues.push(`Chỉ được tối đa ${MAX_ACTIONS} hành động.`);

  input.actions.forEach((action, index) => {
    const at = `Hành động ${index + 1}`;
    switch (action.kind) {
      case "assign":
        if (!action.assignee.trim()) issues.push(`${at}: nhập người phụ trách.`);
        else if (action.assignee.trim().length > 120) issues.push(`${at}: tên tối đa 120 ký tự.`);
        break;
      case "status":
        if (!action.status.trim()) issues.push(`${at}: nhập trạng thái đích.`);
        else if (action.status.trim().length > 60) issues.push(`${at}: trạng thái tối đa 60 ký tự.`);
        break;
      case "comment":
        if (!action.body.trim()) issues.push(`${at}: nhập nội dung bình luận.`);
        else if (action.body.trim().length > 2000) issues.push(`${at}: bình luận tối đa 2000 ký tự.`);
        break;
      case "notify":
        if (!action.recipients.trim()) issues.push(`${at}: nhập người nhận thông báo.`);
        else if (action.recipients.trim().length > 500)
          issues.push(`${at}: danh sách người nhận tối đa 500 ký tự.`);
        if (action.title.trim().length < 2) issues.push(`${at}: tiêu đề cần ít nhất 2 ký tự.`);
        else if (action.title.trim().length > 500) issues.push(`${at}: tiêu đề tối đa 500 ký tự.`);
        if (!action.body.trim()) issues.push(`${at}: nhập nội dung thông báo.`);
        else if (action.body.trim().length > 2000)
          issues.push(`${at}: nội dung thông báo tối đa 2000 ký tự.`);
        break;
    }
  });

  const position = Number(input.position);
  if (!/^\d+$/.test(input.position.trim()) || position > MAX_POSITION)
    issues.push(`Vị trí phải là số nguyên từ 0 đến ${MAX_POSITION}.`);
  const lock = Number(input.lockSeconds);
  if (!/^\d+$/.test(input.lockSeconds.trim()) || lock > MAX_LOCK_SECONDS)
    issues.push(`Thời gian khoá phải là số nguyên từ 0 đến ${MAX_LOCK_SECONDS} giây.`);
  if (input.note.length > 2000) issues.push("Ghi chú tối đa 2000 ký tự.");

  return issues;
}

export function RuleForm({
  formId,
  initial,
  serverError,
  onSubmit,
  onDirtyChange,
}: {
  formId: string;
  initial?: Rule;
  serverError?: string | null;
  onSubmit: (input: RuleInput) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [trigger, setTrigger] = useState<Trigger>(initial?.trigger ?? "updated");
  const [conditions, setConditions] = useState<ConditionRow[]>(() =>
    (initial?.condition ?? []).map((condition, index) => ({ key: `c${index}`, ...condition })),
  );
  const [actions, setActions] = useState<ActionRow[]>(() =>
    (initial?.actions ?? [specOf("status")]).map((spec, index) => ({ key: `a${index}`, spec })),
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [stopOnMatch, setStopOnMatch] = useState(initial?.stopOnMatch ?? false);
  const [position, setPosition] = useState(String(initial?.position ?? DEFAULT_POSITION));
  const [lockSeconds, setLockSeconds] = useState(
    String(initial?.lockSeconds ?? DEFAULT_LOCK_SECONDS),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [attempted, setAttempted] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const counter = useRef(0);

  const nextKey = () => {
    counter.current += 1;
    return `n${counter.current}`;
  };

  const issues = useMemo(
    () =>
      validate({
        name,
        description,
        position,
        lockSeconds,
        note,
        conditions,
        actions: actions.map((row) => row.spec),
      }),
    [name, description, position, lockSeconds, note, conditions, actions],
  );

  const fingerprint = JSON.stringify([
    name,
    description,
    trigger,
    enabled,
    stopOnMatch,
    position,
    lockSeconds,
    note,
    conditions.map((row) => [row.field, row.operator, row.value]),
    actions.map((row) => row.spec),
  ]);
  /* Snapshot of the loaded rule, kept in state so the dirty flag never reads a ref. */
  const [baseline] = useState(fingerprint);
  const dirty = fingerprint !== baseline;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (issues.length > 0) {
      // The summary is the only place that explains every problem at once.
      summaryRef.current?.focus();
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      trigger,
      condition: conditions.map((row) => ({
        field: row.field,
        operator: row.operator,
        value: row.operator === "exists" ? "" : row.value.trim(),
      })),
      actions: actions.map((row) => trimSpec(row.spec)),
      enabled,
      stopOnMatch,
      position: Number(position),
      lockSeconds: Number(lockSeconds),
      note: note.trim(),
    });
  };

  const patchCondition = (key: string, patch: Partial<Omit<ConditionRow, "key">>) =>
    setConditions((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  const patchAction = (key: string, spec: ActionSpec) =>
    setActions((current) => current.map((row) => (row.key === key ? { ...row, spec } : row)));

  const actionSummary =
    actions.length === 0
      ? "chưa có hành động nào"
      : actions.map((row) => describeSpec(row.spec)).join(", ");

  return (
    <form id={formId} className="stack gap-4" onSubmit={submit} noValidate>
      <p className="muted">
        {TRIGGER_LABELS[trigger]}
        {conditions.length > 0
          ? `, thoả ${conditions.length} điều kiện`
          : ", không cần điều kiện"}{" "}
        → {actionSummary}.
      </p>

      {serverError ? (
        <div className="alert alert-danger" role="alert">
          <AlertGlyph />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="field-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label" htmlFor="rule-name">
            Tên quy tắc <span className="field-required">*</span>
          </label>
          <input
            id="rule-name"
            className="input"
            value={name}
            maxLength={160}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
          <span className="field-hint">
            Từ 2 đến 160 ký tự. Tên xuất hiện trong danh sách và nhật ký chạy.
          </span>
        </div>

        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field-label" htmlFor="rule-description">
            Mô tả
          </label>
          <textarea
            id="rule-description"
            className="textarea"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="field-hint">Tối đa 500 ký tự, dành cho người đọc lại sau này.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="rule-trigger">
            Thời điểm chạy
          </label>
          <select
            id="rule-trigger"
            className="select"
            value={trigger}
            onChange={(event) =>
              setTrigger(TRIGGERS.find((item) => item === event.target.value) ?? "updated")
            }
          >
            {TRIGGERS.map((item) => (
              <option key={item} value={item}>
                {TRIGGER_LABELS[item]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="rule-position">
            Vị trí
          </label>
          <input
            id="rule-position"
            className="input tabular"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_POSITION}
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
          <span className="field-hint">Số nhỏ chạy trước, từ 0 đến {MAX_POSITION}.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="rule-lock">
            Khoá chống lặp (giây)
          </label>
          <input
            id="rule-lock"
            className="input tabular"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_LOCK_SECONDS}
            value={lockSeconds}
            onChange={(event) => setLockSeconds(event.target.value)}
          />
          <span className="field-hint">
            Hành động ghi vào công việc sẽ không kích hoạt lại chính quy tắc này trong khoảng đó.
          </span>
        </div>
      </div>

      <div className="row wrap items-center gap-4">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>Bật quy tắc ngay</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={stopOnMatch}
            onChange={(event) => setStopOnMatch(event.target.checked)}
          />
          <span>Dừng sau khi khớp</span>
        </label>
      </div>

      <div className="stack gap-3" role="group" aria-labelledby="rule-conditions-label">
        <div className="spread items-center">
          <span className="field-label" id="rule-conditions-label">
            Điều kiện
          </span>
          <span className="muted tabular">
            {conditions.length}/{MAX_CONDITIONS}
          </span>
        </div>
        <p className="field-hint">
          Tất cả điều kiện phải cùng đúng. Không có điều kiện nghĩa là mọi công việc đều khớp.
        </p>

        {conditions.length === 0 ? (
          <p className="muted">Chưa có điều kiện nào.</p>
        ) : null}

        {conditions.map((row, index) => (
          <div key={row.key} className="stack gap-1">
            <div className="row wrap items-end gap-2">
              <div className="field" style={{ minWidth: 168 }}>
                <label className="field-label" htmlFor={`cond-field-${row.key}`}>
                  Trường {index + 1}
                </label>
                <select
                  id={`cond-field-${row.key}`}
                  className="select"
                  value={row.field}
                  onChange={(event) =>
                    patchCondition(row.key, {
                      field: FIELDS.find((item) => item === event.target.value) ?? "status",
                    })
                  }
                >
                  {FIELDS.map((item) => (
                    <option key={item} value={item}>
                      {FIELD_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ minWidth: 160 }}>
                <label className="field-label" htmlFor={`cond-op-${row.key}`}>
                  So sánh
                </label>
                <select
                  id={`cond-op-${row.key}`}
                  className="select"
                  value={row.operator}
                  onChange={(event) =>
                    patchCondition(row.key, {
                      operator: OPERATORS.find((item) => item === event.target.value) ?? "is",
                    })
                  }
                >
                  {OPERATORS.map((item) => (
                    <option key={item} value={item}>
                      {OPERATOR_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ flex: 1, minWidth: 200 }}>
                <label className="field-label" htmlFor={`cond-value-${row.key}`}>
                  Giá trị
                </label>
                <input
                  id={`cond-value-${row.key}`}
                  className="input"
                  value={row.value}
                  maxLength={MAX_CONDITION_VALUE}
                  disabled={row.operator === "exists"}
                  placeholder={row.operator === "exists" ? "Không dùng giá trị" : "Ví dụ: Đang làm"}
                  onChange={(event) => patchCondition(row.key, { value: event.target.value })}
                />
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={`Xoá điều kiện ${index + 1}`}
                onClick={() =>
                  setConditions((current) => current.filter((item) => item.key !== row.key))
                }
              >
                <TrashGlyph />
              </button>
            </div>
            <span className="field-hint">{OPERATOR_HINTS[row.operator]}</span>
          </div>
        ))}

        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={conditions.length >= MAX_CONDITIONS}
            onClick={() =>
              setConditions((current) => [
                ...current,
                { key: nextKey(), field: "status", operator: "is", value: "" },
              ])
            }
          >
            <PlusGlyph />
            Thêm điều kiện
          </button>
        </div>
      </div>

      <div className="stack gap-3" role="group" aria-labelledby="rule-actions-label">
        <div className="spread items-center">
          <span className="field-label" id="rule-actions-label">
            Hành động
          </span>
          <span className="muted tabular">
            {actions.length}/{MAX_ACTIONS}
          </span>
        </div>

        {actions.map((row, index) => (
          <div
            key={row.key}
            className="stack gap-2"
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
            }}
          >
            <div className="row wrap items-end gap-2">
              <div className="field" style={{ minWidth: 220 }}>
                <label className="field-label" htmlFor={`act-kind-${row.key}`}>
                  Hành động {index + 1}
                </label>
                <select
                  id={`act-kind-${row.key}`}
                  className="select"
                  value={row.spec.kind}
                  onChange={(event) =>
                    patchAction(
                      row.key,
                      specOf(ACTION_KINDS.find((item) => item === event.target.value) ?? "status"),
                    )
                  }
                >
                  {ACTION_KINDS.map((item) => (
                    <option key={item} value={item}>
                      {ACTION_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={`Xoá hành động ${index + 1}`}
                onClick={() =>
                  setActions((current) => current.filter((item) => item.key !== row.key))
                }
              >
                <TrashGlyph />
              </button>
            </div>

            {row.spec.kind === "assign" ? (
              <div className="field">
                <label className="field-label" htmlFor={`act-${row.key}-assignee`}>
                  Người phụ trách
                </label>
                <input
                  id={`act-${row.key}-assignee`}
                  className="input"
                  value={row.spec.assignee}
                  maxLength={120}
                  onChange={(event) =>
                    patchAction(row.key, { kind: "assign", assignee: event.target.value })
                  }
                />
                <span className="field-hint">{PLACEHOLDER_HINT}</span>
              </div>
            ) : null}

            {row.spec.kind === "status" ? (
              <div className="field">
                <label className="field-label" htmlFor={`act-${row.key}-status`}>
                  Trạng thái đích
                </label>
                <input
                  id={`act-${row.key}-status`}
                  className="input"
                  value={row.spec.status}
                  maxLength={60}
                  placeholder="Ví dụ: Chờ duyệt"
                  onChange={(event) =>
                    patchAction(row.key, { kind: "status", status: event.target.value })
                  }
                />
                <span className="field-hint">
                  Phải là trạng thái mà công việc đang có thể chuyển tới. {PLACEHOLDER_HINT}
                </span>
              </div>
            ) : null}

            {row.spec.kind === "comment" ? (
              <div className="field">
                <label className="field-label" htmlFor={`act-${row.key}-body`}>
                  Nội dung bình luận
                </label>
                <textarea
                  id={`act-${row.key}-body`}
                  className="textarea"
                  rows={2}
                  maxLength={2000}
                  value={row.spec.body}
                  onChange={(event) =>
                    patchAction(row.key, { kind: "comment", body: event.target.value })
                  }
                />
                <span className="field-hint">{PLACEHOLDER_HINT}</span>
              </div>
            ) : null}

            {row.spec.kind === "notify" ? (
              <div className="field-grid">
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label" htmlFor={`act-${row.key}-recipients`}>
                    Người nhận
                  </label>
                  <input
                    id={`act-${row.key}-recipients`}
                    className="input"
                    value={row.spec.recipients}
                    maxLength={500}
                    placeholder="Tên đăng nhập hoặc email, cách nhau bằng dấu phẩy"
                    onChange={(event) =>
                      patchAction(row.key, {
                        kind: "notify",
                        recipients: event.target.value,
                        title: row.spec.kind === "notify" ? row.spec.title : "",
                        body: row.spec.kind === "notify" ? row.spec.body : "",
                      })
                    }
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label" htmlFor={`act-${row.key}-title`}>
                    Tiêu đề
                  </label>
                  <input
                    id={`act-${row.key}-title`}
                    className="input"
                    value={row.spec.title}
                    maxLength={500}
                    onChange={(event) =>
                      patchAction(row.key, {
                        kind: "notify",
                        recipients: row.spec.kind === "notify" ? row.spec.recipients : "",
                        title: event.target.value,
                        body: row.spec.kind === "notify" ? row.spec.body : "",
                      })
                    }
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label" htmlFor={`act-${row.key}-text`}>
                    Nội dung
                  </label>
                  <textarea
                    id={`act-${row.key}-text`}
                    className="textarea"
                    rows={2}
                    maxLength={2000}
                    value={row.spec.body}
                    onChange={(event) =>
                      patchAction(row.key, {
                        kind: "notify",
                        recipients: row.spec.kind === "notify" ? row.spec.recipients : "",
                        title: row.spec.kind === "notify" ? row.spec.title : "",
                        body: event.target.value,
                      })
                    }
                  />
                  <span className="field-hint">{PLACEHOLDER_HINT}</span>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={actions.length >= MAX_ACTIONS}
            onClick={() =>
              setActions((current) => [...current, { key: nextKey(), spec: specOf("status") }])
            }
          >
            <PlusGlyph />
            Thêm hành động
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="rule-note">
          Ghi chú nội bộ
        </label>
        <textarea
          id="rule-note"
          className="textarea"
          rows={2}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <span className="field-hint">Tối đa 2000 ký tự, chỉ người cấu hình đọc.</span>
      </div>

      {attempted && issues.length > 0 ? (
        <div className="alert alert-warning" role="alert" tabIndex={-1} ref={summaryRef}>
          <AlertGlyph />
          <div className="stack gap-1">
            <strong>Còn {issues.length} mục cần sửa trước khi lưu</strong>
            <ul className="stack gap-1" style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </form>
  );
}
