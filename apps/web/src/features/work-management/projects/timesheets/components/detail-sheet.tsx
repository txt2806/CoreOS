"use client";

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  addEntry,
  adjustEntry,
  ApiError,
  decidePeriod,
  getPeriod,
  removeEntry,
  submitPeriod,
  updateEntry,
} from "../api/client";
import {
  DAY_LIMIT_MINUTES,
  DAY_THRESHOLD_MINUTES,
  MINUTE_STEP,
  PERIOD_STATUS_LABEL,
  WEEK_THRESHOLD_MINUTES,
} from "../constants";
import { formatDateTime, formatHours, formatMinutes, today, weekDays, weekRange, weekdayOf } from "../format";
import {
  EDITABLE_STATUSES,
  type Decision,
  type EntryInput,
  type PeriodDetail,
  type ProjectOption,
  type TimeEntry,
} from "../types";
import { EntryForm } from "./entry-form";
import {
  CloseGlyph,
  Confirm,
  Field,
  Modal,
  PeriodStatusBadge,
  Select,
  TextArea,
  ThresholdBadge,
} from "./primitives";

interface PeriodDetailSheetProps {
  periodId: string;
  canManage: boolean;
  projects: ProjectOption[];
  onChanged: () => void;
  onClose: () => void;
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="spread gap-3 py-1">
      <dt className="muted">{term}</dt>
      <dd className="tabular">{children}</dd>
    </div>
  );
}

/** Sums are keyed by work date; the entry being edited is left out of its own day. */
function totalsByDay(entries: TimeEntry[], excludeId?: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.id === excludeId) continue;
    totals[entry.workDate] = (totals[entry.workDate] ?? 0) + entry.minutes;
  }
  return totals;
}

export function PeriodDetailSheet({
  periodId,
  canManage,
  projects,
  onChanged,
  onClose,
}: PeriodDetailSheetProps) {
  const titleId = useId();
  const [detail, setDetail] = useState<PeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [askDelete, setAskDelete] = useState<TimeEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [adjusting, setAdjusting] = useState<TimeEntry | null>(null);
  const [askSubmit, setAskSubmit] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getPeriod(periodId)
      .then((next) => {
        if (cancelled) return;
        setDetail(next);
        setLoadError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLoadError(caught instanceof Error ? caught.message : "Không tải được kỳ timesheet.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodId]);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      /* A confirm or dialog owns Escape while open, so the sheet does not close under it. */
      if (event.key !== "Escape") return;
      if (askDelete || askSubmit || deciding || adjusting || adding || editing) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, askDelete, askSubmit, deciding, adjusting, adding, editing]);

  /** Writes answer with the whole period, so the sheet never re-reads to look updated. */
  const apply = (next: PeriodDetail) => {
    setDetail(next);
    onChanged();
  };

  const editable = detail ? EDITABLE_STATUSES.includes(detail.status) : false;

  const projectLabel = (id: string | null) => {
    if (!id) return "Không gắn dự án";
    return projects.find((project) => project.id === id)?.name ?? `Dự án ${id.slice(0, 8)}…`;
  };

  const saveNew = async (values: EntryInput) => {
    if (!detail) return;
    const next = await addEntry(detail.id, values);
    apply(next);
    setAdding(false);
    setProblem(null);
    setFeedback(`Đã ghi ${formatMinutes(values.minutes)} cho ngày ${values.workDate.slice(8, 10)}/${values.workDate.slice(5, 7)}.`);
  };

  const saveEdit = async (values: EntryInput) => {
    if (!detail || !editing) return;
    const next = await updateEntry(detail.id, editing.id, {
      workDate: values.workDate,
      minutes: values.minutes,
      /* The patch schema accepts null to clear the attribution. */
      projectId: values.projectId ?? null,
      note: values.note,
      billable: values.billable,
      version: editing.version,
    });
    apply(next);
    setEditing(null);
    setProblem(null);
    setFeedback("Đã lưu thay đổi của dòng thời gian.");
  };

  const confirmDelete = async () => {
    if (!detail || !askDelete) return;
    setBusy(true);
    setProblem(null);
    try {
      const next = await removeEntry(detail.id, askDelete.id, askDelete.version);
      apply(next);
      setFeedback(`Đã xoá dòng ${formatMinutes(askDelete.minutes)} ngày ${askDelete.workDate.slice(8, 10)}/${askDelete.workDate.slice(5, 7)}.`);
      setAskDelete(null);
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa xoá được dòng thời gian.");
      setAskDelete(null);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Submitting is optimistic: the week turns “Chờ duyệt” at once. The API may
   * auto-approve a week inside the thresholds, so the answer is what is kept.
   */
  const confirmSubmit = async () => {
    if (!detail) return;
    const previous = detail;
    setBusy(true);
    setProblem(null);
    setDetail({ ...detail, status: "SUBMITTED" });
    try {
      const next = await submitPeriod(detail.id);
      apply(next);
      setFeedback(
        next.status === "APPROVED"
          ? "Tuần trong ngưỡng nên được hệ thống duyệt ngay."
          : `Đã gửi duyệt ${formatMinutes(next.totalMinutes)}; chờ Quản lý quyết định.`,
      );
    } catch (caught) {
      setDetail(previous);
      setProblem(
        caught instanceof Error
          ? `${caught.message} Kỳ vẫn ở trạng thái ${PERIOD_STATUS_LABEL[previous.status]}.`
          : "Chưa gửi duyệt được kỳ timesheet.",
      );
    } finally {
      setBusy(false);
      setAskSubmit(false);
    }
  };

  const decide = async (decision: Decision, note: string) => {
    if (!detail) return;
    const previous = detail;
    setBusy(true);
    setProblem(null);
    setDetail({
      ...detail,
      status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
    });
    try {
      const next = await decidePeriod(detail.id, decision, note);
      apply(next);
      setFeedback(
        decision === "APPROVE" ? "Đã duyệt kỳ timesheet." : "Đã trả lại kỳ để nhân viên sửa.",
      );
    } catch (caught) {
      setDetail(previous);
      const hint =
        caught instanceof ApiError && caught.status === 403
          ? "Chỉ Quản lý được duyệt và không tự duyệt kỳ của chính mình."
          : null;
      setProblem(
        caught instanceof Error
          ? `${caught.message}${hint ? ` ${hint}` : ""} Trạng thái đã trở về ${PERIOD_STATUS_LABEL[previous.status]}.`
          : "Chưa ghi được quyết định.",
      );
    } finally {
      setBusy(false);
      setDeciding(false);
    }
  };

  const adjust = async (entry: TimeEntry, deltaMinutes: number, note: string) => {
    setBusy(true);
    setProblem(null);
    try {
      const next = await adjustEntry(entry.id, deltaMinutes, note);
      apply(next);
      setFeedback(`Đã thêm điều chỉnh ${formatMinutes(deltaMinutes)} cho ngày ${entry.workDate.slice(8, 10)}/${entry.workDate.slice(5, 7)}.`);
    } catch (caught) {
      /* Nothing was drawn optimistically, so there is no state to roll back. */
      setProblem(caught instanceof Error ? caught.message : "Chưa tạo được điều chỉnh.");
    } finally {
      setBusy(false);
      setAdjusting(null);
    }
  };

  const days = useMemo(() => (detail ? weekDays(detail.weekStart) : []), [detail]);
  const fallbackDate = useMemo(() => {
    if (!detail) return today();
    const now = today();
    return now >= detail.weekStart && now <= detail.weekEnd ? now : detail.weekStart;
  }, [detail]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const entry of detail?.entries ?? []) {
      const bucket = map.get(entry.workDate);
      if (bucket) bucket.push(entry);
      else map.set(entry.workDate, [entry]);
    }
    return map;
  }, [detail]);

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow">{detail?.employeeName || "Timesheet tuần"}</span>
            <h2 className="page-heading" id={titleId}>
              {detail ? `Tuần ${weekRange(detail.weekStart)}` : "Đang tải kỳ timesheet…"}
            </h2>
            <div className="row items-center gap-2 wrap">
              {detail ? <PeriodStatusBadge status={detail.status} /> : null}
              {detail ? <ThresholdBadge over={detail.overThreshold} /> : null}
              {detail ? <span className="muted">Bản ghi phiên bản {detail.version}</span> : null}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết kỳ timesheet"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {problem ? (
            <div className="alert alert-danger" role="alert">
              <span>{problem}</span>
            </div>
          ) : null}
          <div role="status" aria-live="polite">
            {feedback ? (
              <div className="alert alert-success">
                <span>{feedback}</span>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="stack gap-2">
              <span className="skeleton skeleton-line" style={{ width: "75%" }} />
              <span className="skeleton skeleton-line" style={{ width: "60%" }} />
              <span className="skeleton skeleton-line" style={{ width: "45%" }} />
            </div>
          ) : loadError ? (
            <div className="error-state" role="alert">
              <span className="empty-title">Không tải được kỳ timesheet</span>
              <p className="empty-body">{loadError}</p>
              <button type="button" className="btn btn-primary" onClick={load}>
                Thử lại
              </button>
            </div>
          ) : detail ? (
            <>
              <dl className="stack gap-0">
                <Row term="Nhân viên">{detail.employeeName || "—"}</Row>
                <Row term="Tuần">{weekRange(detail.weekStart)}</Row>
                <Row term="Tổng thời gian">
                  {formatMinutes(detail.totalMinutes)} · {formatHours(detail.totalMinutes)} giờ
                </Row>
                <Row term="Ngưỡng tuần">
                  {formatMinutes(WEEK_THRESHOLD_MINUTES)} · ngày {formatMinutes(DAY_THRESHOLD_MINUTES)}
                </Row>
                <Row term="Gửi duyệt">{formatDateTime(detail.submittedAt)}</Row>
                <Row term="Quyết định">
                  {detail.decidedAt
                    ? `${formatDateTime(detail.decidedAt)} · ${detail.decidedByName || "—"}`
                    : "Chưa duyệt"}
                </Row>
                <Row term="Cập nhật">{formatDateTime(detail.updatedAt)}</Row>
              </dl>

              {detail.decisionNote ? (
                <p className="muted">Lý do từ người duyệt: {detail.decisionNote}</p>
              ) : null}

              <section className="stack gap-3" aria-label="Hành động trên kỳ timesheet">
                <h3 className="surface-title">Hành động</h3>
                <div className="row wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setAdding(true)}
                    disabled={!editable}
                    title={
                      editable
                        ? "Ghi thêm thời gian cho một ngày trong tuần"
                        : "Kỳ đang chờ duyệt hoặc đã duyệt nên không sửa trực tiếp"
                    }
                  >
                    Thêm dòng thời gian
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setAskSubmit(true)}
                    disabled={!editable || detail.entries.length === 0 || busy}
                    title={
                      detail.entries.length === 0
                        ? "Cần ít nhất một dòng thời gian"
                        : "Gửi tuần cho Quản lý duyệt"
                    }
                  >
                    Gửi duyệt
                  </button>
                  {canManage && detail.status === "SUBMITTED" ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setDeciding(true)}
                        disabled={busy}
                      >
                        Quyết định
                      </button>
                    </>
                  ) : null}
                </div>
                <p className="muted">
                  {editable
                    ? "Kỳ đang mở nên thêm, sửa và xoá dòng thời gian được. Gửi duyệt sẽ khoá kỳ."
                    : detail.status === "SUBMITTED"
                      ? "Kỳ đang chờ duyệt nên chỉ đọc. Quản lý duyệt hoặc trả lại để sửa."
                      : "Kỳ đã duyệt nên chỉ đọc; sai sót được xử lý bằng điều chỉnh của Quản lý."}
                </p>
              </section>

              <section className="stack gap-3" aria-label="Dòng thời gian theo ngày">
                <div className="spread items-center wrap gap-2">
                  <div className="stack gap-1">
                    <h3 className="surface-title">Theo ngày</h3>
                    <span className="muted">
                      {detail.entries.length.toLocaleString("vi-VN")} dòng trong tuần
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={load}
                    aria-label="Tải lại kỳ timesheet"
                  >
                    Tải lại
                  </button>
                </div>

                <ul className="list">
                  {days.map((day) => {
                    const rows = grouped.get(day) ?? [];
                    const dayTotal = rows.reduce((sum, entry) => sum + entry.minutes, 0);
                    return (
                      <li key={day} className="list-row" style={{ display: "block" }}>
                        <div className="spread wrap items-center gap-2">
                          <span className="row items-center gap-2">
                            <span className="badge">{weekdayOf(day)}</span>
                            <span className="tabular">{`${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`}</span>
                          </span>
                          <span className="row items-center gap-2">
                            <span
                              className={
                                dayTotal > DAY_THRESHOLD_MINUTES
                                  ? "badge badge-warning"
                                  : "muted tabular"
                              }
                            >
                              {dayTotal > DAY_THRESHOLD_MINUTES ? (
                                <span className="dot" />
                              ) : null}
                              {dayTotal ? formatMinutes(dayTotal) : "Chưa ghi"}
                            </span>
                          </span>
                        </div>

                        {rows.length === 0 ? null : (
                          <ul className="stack gap-2" style={{ paddingTop: "var(--space-2)" }}>
                            {rows.map((entry) => (
                              <li
                                key={entry.id}
                                className="stack gap-1"
                                style={{ borderTop: "1px solid var(--line-soft)", paddingTop: "var(--space-2)" }}
                              >
                                <div className="spread wrap items-center gap-2">
                                  <span className="row wrap items-center gap-2">
                                    <span className="tabular">{formatMinutes(entry.minutes)}</span>
                                    <span className="truncate">{projectLabel(entry.projectId)}</span>
                                    {entry.billable ? (
                                      <span className="badge badge-info">
                                        <span className="dot" />
                                        Tính khối lượng
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="row wrap gap-2">
                                    {editable ? (
                                      <>
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm"
                                          onClick={() => setEditing(entry)}
                                          aria-label={`Sửa dòng ${formatMinutes(entry.minutes)} ngày ${day}`}
                                        >
                                          Sửa
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm"
                                          onClick={() => setAskDelete(entry)}
                                          aria-label={`Xoá dòng ${formatMinutes(entry.minutes)} ngày ${day}`}
                                        >
                                          Xoá
                                        </button>
                                      </>
                                    ) : null}
                                    {canManage && detail.status === "APPROVED" ? (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setAdjusting(entry)}
                                        aria-label={`Thêm điều chỉnh cho dòng ngày ${day}`}
                                      >
                                        Điều chỉnh
                                      </button>
                                    ) : null}
                                  </span>
                                </div>
                                {entry.note ? <span className="muted">{entry.note}</span> : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="stack gap-2" aria-label="Lịch sử điều chỉnh">
                <h3 className="surface-title">Điều chỉnh sau khi duyệt</h3>
                {detail.adjustments.length === 0 ? (
                  <p className="muted">
                    Chưa có điều chỉnh. Sửa số liệu của kỳ đã duyệt luôn tạo một dòng điều
                    chỉnh mới, dòng gốc được giữ nguyên.
                  </p>
                ) : (
                  <ul className="list">
                    {detail.adjustments.map((row) => (
                      <li key={row.id} className="list-row">
                        <div className="list-main stack gap-1">
                          <span className="row wrap items-center gap-2">
                            <span className="tabular">{formatMinutes(row.deltaMinutes)}</span>
                            <span className="truncate">{row.note}</span>
                          </span>
                          <span className="list-meta">
                            {row.adjustedByName || "—"} · {formatDateTime(row.createdAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>

      {adding && detail ? (
        <Modal title="Thêm dòng thời gian" onClose={() => setAdding(false)} wide>
          <EntryForm
            weekStart={detail.weekStart}
            weekEnd={detail.weekEnd}
            dayTotals={totalsByDay(detail.entries)}
            projects={projects}
            fallbackDate={fallbackDate}
            submitLabel="Ghi thời gian"
            onSubmit={saveNew}
            onCancel={() => setAdding(false)}
          />
        </Modal>
      ) : null}

      {editing && detail ? (
        <Modal title="Sửa dòng thời gian" onClose={() => setEditing(null)} wide>
          <EntryForm
            weekStart={detail.weekStart}
            weekEnd={detail.weekEnd}
            dayTotals={totalsByDay(detail.entries, editing.id)}
            projects={projects}
            initial={editing}
            fallbackDate={fallbackDate}
            submitLabel="Lưu thay đổi"
            onSubmit={saveEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {askDelete ? (
        <Confirm
          title="Xoá dòng thời gian?"
          body={`Dòng ${formatMinutes(askDelete.minutes)} ngày ${askDelete.workDate.slice(8, 10)}/${askDelete.workDate.slice(5, 7)} sẽ bị xoá khỏi kỳ. Tổng tuần được tính lại ngay sau đó.`}
          confirmLabel="Xoá dòng"
          busy={busy}
          onConfirm={confirmDelete}
          onClose={() => setAskDelete(null)}
        />
      ) : null}

      {askSubmit ? (
        <Confirm
          title="Gửi duyệt tuần này?"
          body="Sau khi gửi, kỳ bị khoá để Quản lý duyệt. Tuần nằm trong ngưỡng có thể được hệ thống duyệt ngay; vượt ngưỡng sẽ chờ Quản lý."
          confirmLabel="Gửi duyệt"
          busy={busy}
          danger={false}
          onConfirm={confirmSubmit}
          onClose={() => setAskSubmit(false)}
        />
      ) : null}

      {deciding && detail ? (
        <DecisionDialog
          busy={busy}
          totalMinutes={detail.totalMinutes}
          onClose={() => setDeciding(false)}
          onSubmit={decide}
        />
      ) : null}

      {adjusting ? (
        <AdjustDialog
          entry={adjusting}
          busy={busy}
          onClose={() => setAdjusting(null)}
          onSubmit={(delta, note) => adjust(adjusting, delta, note)}
        />
      ) : null}
    </>
  );
}

function DecisionDialog({
  busy,
  totalMinutes,
  onSubmit,
  onClose,
}: {
  busy: boolean;
  totalMinutes: number;
  onSubmit: (decision: Decision, note: string) => Promise<void>;
  onClose: () => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [decision, setDecision] = useState<Decision>("APPROVE");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (decision === "REJECT" && !note.trim()) {
      setError("Từ chối bắt buộc nêu lý do để nhân viên biết cần sửa gì.");
      document.getElementById(`decision-${uid}-note`)?.focus();
      return;
    }
    setError(null);
    await onSubmit(decision, note.trim());
  };

  return (
    <Modal
      title="Quyết định kỳ timesheet"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button
            type="button"
            className={decision === "REJECT" ? "btn btn-danger" : "btn btn-primary"}
            onClick={submit}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang gửi…" : decision === "REJECT" ? "Trả lại" : "Duyệt"}
          </button>
        </>
      }
    >
      <div className="stack gap-4">
        <p className="muted">
          Tổng tuần: {formatMinutes(totalMinutes)}. Duyệt sẽ khoá kỳ; trả lại cho phép nhân
          viên sửa và gửi lại.
        </p>
        <Field label="Quyết định" htmlFor={`decision-${uid}-choice`} required>
          <Select
            id={`decision-${uid}-choice`}
            value={decision}
            onChange={(event) =>
              setDecision(event.target.value === "REJECT" ? "REJECT" : "APPROVE")
            }
          >
            <option value="APPROVE">Duyệt</option>
            <option value="REJECT">Trả lại để sửa</option>
          </Select>
        </Field>
        <Field
          label="Lý do"
          htmlFor={`decision-${uid}-note`}
          required={decision === "REJECT"}
          error={error ?? undefined}
          counter={`${note.length}/1000`}
          hint={
            decision === "REJECT"
              ? "Bắt buộc khi trả lại."
              : "Không bắt buộc khi duyệt."
          }
        >
          <TextArea
            id={`decision-${uid}-note`}
            rows={3}
            maxLength={1000}
            value={note}
            invalid={Boolean(error)}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function AdjustDialog({
  entry,
  busy,
  onSubmit,
  onClose,
}: {
  entry: TimeEntry;
  busy: boolean;
  onSubmit: (deltaMinutes: number, note: string) => Promise<void>;
  onClose: () => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const value = Number(delta);
    if (!delta.trim() || !Number.isFinite(value) || value === 0) {
      setError("Nhập số phút điều chỉnh, khác 0 và là bội số của 15.");
      return;
    }
    if (value % MINUTE_STEP !== 0 || Math.abs(value) > DAY_LIMIT_MINUTES) {
      setError(`Điều chỉnh phải là bội số của ${MINUTE_STEP} phút và không vượt ${DAY_LIMIT_MINUTES} phút.`);
      return;
    }
    if (!note.trim()) {
      setError("Cần ghi lý do cho điều chỉnh.");
      return;
    }
    setError(null);
    await onSubmit(value, note.trim());
  };

  return (
    <Modal
      title="Điều chỉnh dòng đã duyệt"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : "Ghi điều chỉnh"}
          </button>
        </>
      }
    >
      <div className="stack gap-4">
        <p className="muted">
          Dòng gốc {formatMinutes(entry.minutes)} ngày {entry.workDate} được giữ nguyên; điều
          chỉnh là một bản ghi cộng thêm, âm hoặc dương.
        </p>
        <Field
          label="Số phút điều chỉnh"
          htmlFor={`adjust-${uid}-delta`}
          required
          error={error ?? undefined}
          hint="Ví dụ -30 để giảm nửa giờ, 60 để tăng một giờ."
        >
          <input
            id={`adjust-${uid}-delta`}
            className="input tabular"
            type="number"
            step={MINUTE_STEP}
            min={-DAY_LIMIT_MINUTES}
            max={DAY_LIMIT_MINUTES}
            value={delta}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `adjust-${uid}-delta-error` : undefined}
            onChange={(event) => setDelta(event.target.value)}
          />
        </Field>
        <Field
          label="Lý do"
          htmlFor={`adjust-${uid}-note`}
          required
          counter={`${note.length}/1000`}
        >
          <TextArea
            id={`adjust-${uid}-note`}
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
