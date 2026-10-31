"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { CommentThread } from "../../task-comments";
import { ApiError, taskState, transitionTask } from "../api/client";
import { formatDate, formatDateTime } from "../format";
import type { Task, TaskInput, TaskState } from "../types";
import { CloseGlyph, Confirm, PriorityBadge, StatusBadge } from "./primitives";
import { TaskForm } from "./task-form";

interface TaskDetailSheetProps {
  task: Task;
  canUpdate: boolean;
  canDelete: boolean;
  canComment: boolean;
  onSave: (values: TaskInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
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

export function TaskDetailSheet({
  task,
  canUpdate,
  canDelete,
  canComment,
  onSave,
  onDelete,
  onChanged,
  onClose,
}: TaskDetailSheetProps) {
  const titleId = useId();
  const [state, setState] = useState<TaskState | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    taskState(task.id)
      .then((next) => {
        if (!cancelled) {
          setState(next);
          setProblem(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setProblem(
            caught instanceof Error
              ? caught.message
              : "Không tải được luồng trạng thái của công việc.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const move = async (to: string) => {
    setPending(to);
    setProblem(null);
    try {
      await transitionTask(task.id, {
        toStatus: to,
        version: task.version,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setReason("");
      onChanged();
      load();
    } catch (caught) {
      const hint =
        caught instanceof ApiError && caught.status === 409
          ? "Bản ghi vừa thay đổi ở nơi khác. Tải lại rồi thao tác tiếp."
          : caught instanceof ApiError && caught.status === 403
            ? "Bạn không có quyền thực hiện bước này, hoặc bước này cần đề xuất gửi quản lý."
            : null;
      setProblem(
        caught instanceof Error
          ? hint
            ? `${caught.message} ${hint}`
            : caught.message
          : "Chưa chuyển được trạng thái.",
      );
    } finally {
      setPending(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa xoá được công việc.");
      setAskDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const history = [...(state?.history ?? [])].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">{task.code}</span>
            <h2 className="page-heading" id={titleId}>
              {task.name}
            </h2>
            <div className="row items-center gap-2 wrap">
              <StatusBadge status={task.status} />
              <PriorityBadge value={task.fields.priority} />
              {state?.restoreStatus ? (
                <span className="chip">Có thể khôi phục về {state.restoreStatus}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết công việc"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {problem ? (
            <div className="alert alert-danger" role="alert">
              <span>{problem}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
                Tải lại
              </button>
            </div>
          ) : null}

          <dl className="stack gap-0">
            <Row term="Hạn hoàn thành">{formatDate(task.date)}</Row>
            <Row term="Ngày bắt đầu">{formatDate(task.fields.startDate)}</Row>
            <Row term="Người phụ trách">{task.assignee || "Chưa giao"}</Row>
            <Row term="Người kiểm tra">{task.reviewer || "Chưa chỉ định"}</Row>
            <Row term="Phạm vi">{task.scope || "Chưa gắn phạm vi"}</Row>
            <Row term="Dự án">{task.fields.project || "Không thuộc dự án"}</Row>
            <Row term="Tiến độ">
              {typeof task.fields.progress === "number" ? `${task.fields.progress}%` : "—"}
            </Row>
            <Row term="Nhãn">{task.fields.tags || "—"}</Row>
            <Row term="Cập nhật">{formatDateTime(task.updatedAt)}</Row>
          </dl>

          {task.note ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Mô tả</h3>
              <p className="list-main">{task.note}</p>
            </section>
          ) : null}

          <section className="stack gap-3" aria-label="Luồng trạng thái">
            <div className="spread items-center">
              <h3 className="surface-title">Luồng trạng thái</h3>
              <span className="muted">Bản ghi phiên bản {task.version}</span>
            </div>

            {loading ? (
              <span className="skeleton skeleton-line" style={{ width: "60%" }} />
            ) : state && state.allowed.length > 0 ? (
              <>
                <div className="field">
                  <label className="field-label" htmlFor={`${titleId}-reason`}>
                    Lý do chuyển bước
                    <span className="field-hint">Không bắt buộc</span>
                  </label>
                  <input
                    id={`${titleId}-reason`}
                    className="input"
                    value={reason}
                    maxLength={2000}
                    autoComplete="off"
                    placeholder="Ví dụ: Đã kiểm tra xong, chuyển sang nghiệm thu"
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
                <div className="row wrap gap-2">
                  {state.allowed.map((option) => {
                    const blocked = option.blockedBy > 0;
                    return (
                      <button
                        key={option.to}
                        type="button"
                        className="btn btn-ghost"
                        disabled={blocked || pending !== null}
                        aria-busy={pending === option.to ? "true" : undefined}
                        title={
                          blocked
                            ? `Còn ${option.blockedBy} công việc chưa hoàn thành`
                            : `Chuyển sang ${option.to}`
                        }
                        onClick={() => move(option.to)}
                      >
                        {pending === option.to ? "Đang chuyển…" : `Chuyển sang ${option.to}`}
                        {blocked ? (
                          <span className="badge badge-warning">{option.blockedBy}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="muted">
                Công việc đang ở trạng thái kết thúc hoặc bạn chưa có bước nào được phép
                thực hiện. Liên hệ quản lý nếu cần mở lại.
              </p>
            )}
          </section>

          <section className="stack gap-3" aria-label="Thông tin công việc">
            <div className="spread items-center">
              <h3 className="surface-title">Thông tin</h3>
              {canUpdate && !editing ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditing(true)}
                >
                  Sửa thông tin
                </button>
              ) : null}
            </div>
            {editing ? (
              <TaskForm
                initial={task}
                submitLabel="Lưu thay đổi"
                onCancel={() => setEditing(false)}
                onSubmit={async (values) => {
                  await onSave(values);
                  setEditing(false);
                }}
              />
            ) : (
              <p className="muted">
                Chỉnh sửa nội dung không làm thay đổi trạng thái; mọi thay đổi được ghi
                phiên bản.
              </p>
            )}
          </section>

          <CommentThread taskId={task.id} canComment={canComment} />

          <section className="stack gap-3" aria-label="Lịch sử chuyển trạng thái">
            <h3 className="surface-title">Lịch sử chuyển trạng thái</h3>
            {history.length === 0 ? (
              <p className="muted">Chưa có lần chuyển trạng thái nào được ghi nhận.</p>
            ) : (
              <ol className="timeline">
                {history.slice(0, 10).map((entry) => (
                  <li key={entry.id} className="stack gap-1">
                    <div className="row wrap items-center gap-2">
                      <strong>
                        {entry.fromStatus} → {entry.toStatus}
                      </strong>
                      <span className="muted">{formatDateTime(entry.occurredAt)}</span>
                    </div>
                    <span className="muted">
                      {entry.actorName} · {entry.actorRole}
                    </span>
                    {entry.reason ? <p className="list-main">{entry.reason}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="sheet-foot">
          {canDelete ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAskDelete(true)}
              style={{ marginRight: "auto" }}
            >
              Xoá công việc
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>

      {askDelete ? (
        <Confirm
          title="Xoá công việc này?"
          body={`${task.code} — ${task.name}. Hành động này không khôi phục được từ giao diện; lịch sử chuyển trạng thái vẫn được giữ cho kiểm toán.`}
          confirmLabel="Xoá vĩnh viễn"
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setAskDelete(false)}
        />
      ) : null}
    </>
  );
}
