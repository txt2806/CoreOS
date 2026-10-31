"use client";

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { ApiError, acceptanceOf, createAcceptance, recordResult } from "../api/client";
import { formatDateTime } from "../format";
import { QA_OUTCOMES, type AcceptanceItem, type MilestoneTask, type QaGate, type QaOutcome } from "../types";
import {
  CheckGlyph,
  CloseGlyph,
  Field,
  GateBadge,
  OutcomeBadge,
  TextArea,
  TextInput,
} from "./primitives";
import { QA_OUTCOME_LABEL } from "../constants";

/**
 * The API derives the gate exactly this way: every mandatory criterion whose
 * newest result is not PASS blocks completion. Recomputed locally so a decision
 * updates the badge immediately; the next load replaces it with the API answer.
 */
function gateOf(items: AcceptanceItem[]): QaGate {
  const mandatory = items.filter((item) => item.mandatory);
  const blocking = mandatory
    .filter((item) => item.latestResult?.outcome !== "PASS")
    .map((item) => item.title);
  return { required: mandatory.length > 0, passed: blocking.length === 0, blocking };
}

interface QaPanelProps {
  task: MilestoneTask;
  canUpdate: boolean;
}

export function QaPanel({ task, canUpdate }: QaPanelProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [items, setItems] = useState<AcceptanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, QaOutcome>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [expected, setExpected] = useState("");
  const [steps, setSteps] = useState("");
  const [mandatory, setMandatory] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    acceptanceOf(task.taskId)
      .then((queue) => {
        if (cancelled) return;
        setItems(queue.items);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Không tải được tiêu chí kiểm tra của công việc.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task.taskId]);

  useEffect(load, [load]);

  /* The gate is a pure function of the criteria, so it is derived, never stored twice. */
  const gate = useMemo(() => gateOf(items), [items]);

  const decide = async (item: AcceptanceItem, outcome: QaOutcome) => {
    setSaving(item.id);
    setFeedback(null);
    // Optimistic: the badge flips now, the recorded result replaces it on success.
    setOptimistic((current) => ({ ...current, [item.id]: outcome }));
    try {
      const result = await recordResult(item.id, {
        outcome,
        note: notes[item.id] ?? "",
      });
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                latestResult: result,
                resultCount: entry.resultCount + 1,
              }
            : entry,
        ),
      );
      setNotes((current) => ({ ...current, [item.id]: "" }));
      setFeedback({
        tone: "success",
        message: `Đã ghi “${QA_OUTCOME_LABEL[outcome]}” cho “${item.title}”.`,
      });
    } catch (caught) {
      setFeedback({
        tone: "error",
        message:
          caught instanceof ApiError && caught.status === 403
            ? "Chỉ Người kiểm tra của công việc hoặc Quản lý được ghi kết quả. Kết quả vừa chọn đã bị bỏ."
            : caught instanceof Error
              ? `${caught.message} Kết quả vừa chọn đã bị bỏ.`
              : "Chưa ghi được kết quả kiểm tra.",
      });
    } finally {
      setOptimistic((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setSaving(null);
    }
  };

  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError("Nhập tên tiêu chí, ví dụ “Đăng nhập sai mật khẩu bị chặn”.");
      return;
    }
    setSaving("create");
    try {
      await createAcceptance({
        taskId: task.taskId,
        title: title.trim(),
        steps: steps.trim(),
        expected: expected.trim(),
        mandatory,
      });
      setTitle("");
      setExpected("");
      setSteps("");
      setMandatory(true);
      setAdding(false);
      setFeedback({ tone: "success", message: "Đã thêm tiêu chí kiểm tra." });
      load();
    } catch (caught) {
      setFormError(
        caught instanceof ApiError && caught.status === 403
          ? "Chỉ Người phụ trách, Người kiểm tra hoặc Quản lý được thêm tiêu chí cho công việc này."
          : caught instanceof Error
            ? caught.message
            : "Chưa thêm được tiêu chí.",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="stack gap-3" aria-label={`Tiêu chí kiểm tra của ${task.code}`}>
      <div className="spread items-center wrap gap-2">
        <div className="stack gap-1">
          <h4 className="surface-title">Tiêu chí kiểm tra</h4>
          <span className="muted">
            {task.code} · {task.name}
          </span>
        </div>
        <div className="row gap-2">
          {items.length > 0 ? <GateBadge gate={gate} /> : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={load}
            aria-label="Tải lại tiêu chí kiểm tra"
          >
            Tải lại
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAdding((open) => !open)}
            disabled={!canUpdate}
            title={
              canUpdate ? "Thêm tiêu chí kiểm tra" : "Bạn không có quyền cập nhật mốc"
            }
          >
            {adding ? "Đóng biểu mẫu" : "Thêm tiêu chí"}
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={feedback.tone === "success" ? "alert alert-success" : "alert alert-danger"}
          role="status"
          aria-live="polite"
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFeedback(null)}
            aria-label="Đóng thông báo"
            style={{ marginLeft: "auto" }}
          >
            <CloseGlyph />
          </button>
        </div>
      ) : null}

      {gate.required && !gate.passed ? (
        <div className="alert alert-warning" role="status">
          <div className="stack gap-1">
            <span>Công việc chưa thể hoàn thành vì còn tiêu chí chặn:</span>
            <span className="muted">{gate.blocking.join(" · ")}</span>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="stack gap-2">
          <span className="skeleton skeleton-line" style={{ width: "70%" }} />
          <span className="skeleton skeleton-line" style={{ width: "55%" }} />
        </div>
      ) : error ? (
        <div className="error-state" role="alert">
          <span className="empty-title">Không tải được tiêu chí kiểm tra</span>
          <p className="empty-body">{error}</p>
          <button type="button" className="btn btn-ghost" onClick={load}>
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-title">Công việc chưa có tiêu chí kiểm tra</span>
          <p className="empty-body">
            Thêm tiêu chí để người kiểm tra ghi kết quả Đạt / Không đạt / Bị chặn trước khi
            công việc được chuyển sang Hoàn thành.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAdding(true)}
            disabled={!canUpdate}
          >
            Thêm tiêu chí
          </button>
        </div>
      ) : (
        <ul className="list">
          {items.map((item) => {
            const shown = optimistic[item.id] ?? item.latestResult?.outcome ?? null;
            const pending = saving === item.id;
            const latest = item.latestResult;
            return (
              <li key={item.id} className="list-row">
                <div className="list-main stack gap-2">
                  <div className="row wrap items-center gap-2">
                    <strong>{item.title}</strong>
                    {item.mandatory ? (
                      <span className="chip">Bắt buộc</span>
                    ) : (
                      <span className="chip">Tham khảo</span>
                    )}
                    <OutcomeBadge outcome={shown} />
                    {pending ? <span className="muted">đang ghi…</span> : null}
                  </div>
                  {item.expected ? (
                    <span className="muted">Kỳ vọng: {item.expected}</span>
                  ) : null}
                  {item.steps ? (
                    <span className="muted truncate">Cách kiểm tra: {item.steps}</span>
                  ) : null}
                  {latest ? (
                    <span className="muted">
                      {latest.testedByName}
                      {latest.isOverride ? " (quản lý ghi thay)" : ""} ·{" "}
                      {formatDateTime(latest.createdAt)}
                      {latest.note ? ` · ${latest.note}` : ""}
                    </span>
                  ) : (
                    <span className="muted">Chưa có lần kiểm tra nào.</span>
                  )}
                  <div className="field">
                    <label className="field-label" htmlFor={`qa-${uid}-${item.id}-note`}>
                      Ghi chú kiểm tra
                      <span className="field-hint">Không bắt buộc</span>
                    </label>
                    <TextInput
                      id={`qa-${uid}-${item.id}-note`}
                      value={notes[item.id] ?? ""}
                      maxLength={2000}
                      autoComplete="off"
                      placeholder="Ví dụ: đã thử trên bản staging ngày 12/11"
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="list-meta stack gap-2 items-end">
                  <span className="muted tabular">
                    {item.resultCount.toLocaleString("vi-VN")} lần ghi
                  </span>
                  <div className="row wrap gap-1 justify-end">
                    {QA_OUTCOMES.map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => decide(item, outcome)}
                        disabled={pending || saving === "create"}
                        aria-busy={pending ? "true" : undefined}
                        title={`Ghi kết quả ${QA_OUTCOME_LABEL[outcome]} cho tiêu chí này`}
                      >
                        {pending && shown === outcome ? <CheckGlyph /> : null}
                        {QA_OUTCOME_LABEL[outcome]}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <form className="stack gap-3" onSubmit={submitItem} noValidate>
          {formError ? (
            <div className="alert alert-danger" role="alert">
              <span>{formError}</span>
            </div>
          ) : null}
          <Field label="Tên tiêu chí" htmlFor={`qa-${uid}-title`} required>
            <TextInput
              id={`qa-${uid}-title`}
              value={title}
              maxLength={500}
              autoComplete="off"
              placeholder="Đăng nhập sai mật khẩu bị chặn"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field label="Kỳ vọng" htmlFor={`qa-${uid}-expected`}>
            <TextInput
              id={`qa-${uid}-expected`}
              value={expected}
              maxLength={1000}
              autoComplete="off"
              placeholder="Hiện thông báo lỗi và không tạo phiên"
              onChange={(event) => setExpected(event.target.value)}
            />
          </Field>
          <Field label="Cách kiểm tra" htmlFor={`qa-${uid}-steps`}>
            <TextArea
              id={`qa-${uid}-steps`}
              rows={2}
              maxLength={2000}
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(event) => setMandatory(event.target.checked)}
            />
            Bắt buộc đạt trước khi hoàn thành công việc
          </label>
          <div className="row justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
              Huỷ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving === "create"}
              aria-busy={saving === "create" ? "true" : undefined}
            >
              {saving === "create" ? "Đang thêm…" : "Thêm tiêu chí"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
