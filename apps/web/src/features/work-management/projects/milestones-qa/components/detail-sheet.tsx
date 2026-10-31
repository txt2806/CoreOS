"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { ApiError, getMilestone, unlinkTask, updateMilestone } from "../api/client";
import { MILESTONE_STATUS_LABEL } from "../constants";
import { donePercent, formatDate, formatDateTime, targetTone } from "../format";
import {
  MILESTONE_MOVES,
  type MilestoneDetail,
  type MilestoneInput,
  type MilestoneStatus,
} from "../types";
import { MilestoneForm } from "./milestone-form";
import {
  CloseGlyph,
  Confirm,
  MilestoneStatusBadge,
} from "./primitives";
import { QaPanel } from "./qa-panel";

interface MilestoneDetailSheetProps {
  milestoneId: string;
  projectLabel: string;
  canUpdate: boolean;
  projectOptions: { id: string; code: string; name: string; status: string }[];
  projectOptionsError: string | null;
  onSave: (values: Omit<MilestoneInput, "projectId">) => Promise<unknown>;
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

export function MilestoneDetailSheet({
  milestoneId,
  projectLabel,
  canUpdate,
  projectOptions,
  projectOptionsError,
  onSave,
  onChanged,
  onClose,
}: MilestoneDetailSheetProps) {
  const titleId = useId();
  const [detail, setDetail] = useState<MilestoneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<MilestoneStatus | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [askUnlink, setAskUnlink] = useState<{ taskId: string; label: string } | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getMilestone(milestoneId)
      .then((next) => {
        if (cancelled) return;
        setDetail(next);
        setLoadError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLoadError(
          caught instanceof Error ? caught.message : "Không tải được chi tiết mốc.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [milestoneId]);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A confirm owns Escape while it is open, so the sheet does not close under it.
      if (event.key === "Escape" && !askUnlink) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, askUnlink]);

  /** Status moves are optimistic: the badge flips first and rolls back on refusal. */
  const move = async (to: MilestoneStatus) => {
    if (!detail) return;
    const previous = detail;
    setPendingStatus(to);
    setProblem(null);
    setDetail({ ...detail, status: to });
    try {
      const updated = await updateMilestone(detail.id, {
        status: to,
        version: detail.version,
      });
      setDetail({ ...updated, items: previous.items });
      onChanged();
    } catch (caught) {
      setDetail(previous);
      const hint =
        caught instanceof ApiError && caught.status === 409
          ? "Bước này không hợp lệ với trạng thái hiện tại. Tải lại để xem các bước được phép."
          : caught instanceof ApiError && caught.status === 403
            ? "Bạn không có quyền cập nhật mốc."
            : null;
      setProblem(
        caught instanceof Error ? (hint ? `${caught.message} ${hint}` : caught.message) : "Chưa đổi được trạng thái mốc.",
      );
    } finally {
      setPendingStatus(null);
    }
  };

  const confirmUnlink = async () => {
    if (!detail || !askUnlink) return;
    setUnlinking(askUnlink.taskId);
    setProblem(null);
    try {
      const next = await unlinkTask(detail.id, askUnlink.taskId);
      setDetail(next);
      setAskUnlink(null);
      onChanged();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa bỏ gắn được công việc.");
      setAskUnlink(null);
    } finally {
      setUnlinking(null);
    }
  };

  const tone = detail ? targetTone(detail.targetDate, detail.status) : "normal";
  const done = detail ? donePercent(detail.itemCount, detail.completedCount) : null;
  const moves = detail ? MILESTONE_MOVES[detail.status] : [];

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow">{projectLabel}</span>
            <h2 className="page-heading" id={titleId}>
              {detail?.name ?? "Đang tải mốc…"}
            </h2>
            <div className="row items-center gap-2 wrap">
              {detail ? <MilestoneStatusBadge status={detail.status} /> : null}
              {detail ? (
                <span className="muted">Bản ghi phiên bản {detail.version}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết mốc"
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

          {loading ? (
            <div className="stack gap-2">
              <span className="skeleton skeleton-line" style={{ width: "75%" }} />
              <span className="skeleton skeleton-line" style={{ width: "60%" }} />
              <span className="skeleton skeleton-line" style={{ width: "45%" }} />
            </div>
          ) : loadError ? (
            <div className="error-state" role="alert">
              <span className="empty-title">Không tải được chi tiết mốc</span>
              <p className="empty-body">{loadError}</p>
              <button type="button" className="btn btn-primary" onClick={load}>
                Thử lại
              </button>
            </div>
          ) : detail ? (
            <>
              <dl className="stack gap-0">
                <Row term="Dự án">{projectLabel}</Row>
                <Row term="Ngày mục tiêu">
                  <span className={tone === "overdue" ? "deadline deadline-danger" : ""}>
                    {formatDate(detail.targetDate)}
                  </span>
                </Row>
                <Row term="Tham chiếu hợp đồng">{detail.contractRef || "—"}</Row>
                <Row term="Công việc">
                  {done === null
                    ? "Chưa gắn việc"
                    : `${detail.completedCount.toLocaleString("vi-VN")}/${detail.itemCount.toLocaleString("vi-VN")} hoàn thành · ${done}%`}
                </Row>
                <Row term="Trạng thái lưu">
                  {MILESTONE_STATUS_LABEL[detail.storedStatus]}
                </Row>
                <Row term="Cập nhật">{formatDateTime(detail.updatedAt)}</Row>
              </dl>

              {detail.description ? (
                <section className="stack gap-2">
                  <h3 className="surface-title">Mô tả</h3>
                  <p className="list-main">{detail.description}</p>
                </section>
              ) : null}

              <section className="stack gap-3" aria-label="Chuyển trạng thái mốc">
                <div className="spread items-center">
                  <h3 className="surface-title">Trạng thái mốc</h3>
                  {detail.status === "MISSED" ? (
                    <span className="muted">
                      Quá hạn được tính từ ngày mục tiêu, không lưu tay.
                    </span>
                  ) : null}
                </div>
                {moves.length === 0 ? (
                  <p className="muted">
                    Mốc đã ở trạng thái kết thúc; không còn bước chuyển nào được phép.
                  </p>
                ) : (
                  <div className="row wrap gap-2">
                    {moves.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => move(status)}
                        disabled={!canUpdate || pendingStatus !== null}
                        aria-busy={pendingStatus === status ? "true" : undefined}
                        title={
                          canUpdate
                            ? `Chuyển mốc sang ${MILESTONE_STATUS_LABEL[status]}`
                            : "Bạn không có quyền cập nhật mốc"
                        }
                      >
                        {pendingStatus === status
                          ? "Đang chuyển…"
                          : `Chuyển sang ${MILESTONE_STATUS_LABEL[status]}`}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="stack gap-3" aria-label="Thông tin mốc">
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
                  <MilestoneForm
                    initial={detail}
                    projects={projectOptions}
                    projectsError={projectOptionsError}
                    submitLabel="Lưu thay đổi"
                    onCancel={() => setEditing(false)}
                    onSubmit={async (values) => {
                      // `updateMilestoneSchema` omits projectId and is strict, so it is not sent.
                      await onSave({
                        name: values.name,
                        description: values.description,
                        targetDate: values.targetDate,
                        contractRef: values.contractRef,
                        status: values.status,
                      });
                      setEditing(false);
                      load();
                    }}
                  />
                ) : (
                  <p className="muted">
                    Sửa tên, mô tả, ngày mục tiêu hoặc tham chiếu hợp đồng không đổi trạng
                    thái mốc.
                  </p>
                )}
              </section>

              <section className="stack gap-3" aria-label="Công việc thuộc mốc">
                <div className="spread items-center wrap gap-2">
                  <div className="stack gap-1">
                    <h3 className="surface-title">Công việc thuộc mốc</h3>
                    <span className="muted">
                      {detail.itemCount === 0
                        ? "Chưa gắn công việc nào"
                        : `${detail.itemCount.toLocaleString("vi-VN")} công việc · ${detail.completedCount.toLocaleString("vi-VN")} đã xong`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={load}
                    aria-label="Tải lại công việc của mốc"
                  >
                    Tải lại
                  </button>
                </div>

                {detail.items.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-title">Mốc chưa gắn công việc</span>
                    <p className="empty-body">
                      Mốc chưa có công việc nào nên chưa có tiêu chí kiểm tra để nghiệm
                      thu. Việc gắn công việc vào mốc thực hiện qua API
                      <span className="mono"> /milestones/:id/items</span>; màn hình này
                      chưa có bộ chọn công việc vì không được đọc dữ liệu phân hệ Công việc.
                    </p>
                  </div>
                ) : (
                  <ul className="list">
                    {detail.items.map((task) => {
                      const expanded = openTaskId === task.taskId;
                      return (
                        <li key={task.taskId} className="list-row" style={{ display: "block" }}>
                          <div className="spread wrap items-center gap-2">
                            <div className="stack gap-1" style={{ minWidth: 0 }}>
                              <span className="row wrap items-center gap-2">
                                <span className="mono muted">{task.code}</span>
                                <span className="truncate">{task.name}</span>
                                {task.completed ? (
                                  <span className="badge badge-success">
                                    <span className="dot" />
                                    Hoàn thành
                                  </span>
                                ) : (
                                  <span className="badge">
                                    <span className="dot" />
                                    {task.status}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="row wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                aria-expanded={expanded}
                                onClick={() =>
                                  setOpenTaskId(expanded ? null : task.taskId)
                                }
                              >
                                {expanded ? "Ẩn tiêu chí" : "Xem tiêu chí kiểm tra"}
                              </button>
                              {canUpdate ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() =>
                                    setAskUnlink({ taskId: task.taskId, label: task.name })
                                  }
                                  disabled={unlinking === task.taskId}
                                >
                                  Bỏ gắn
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {expanded ? (
                            <div style={{ paddingTop: "var(--space-3)" }}>
                              <QaPanel task={task} canUpdate={canUpdate} />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
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

      {askUnlink ? (
        <Confirm
          title="Bỏ gắn công việc khỏi mốc?"
          body={`“${askUnlink.label}” sẽ không còn thuộc mốc này. Tiêu chí kiểm tra của công việc vẫn được giữ.`}
          confirmLabel="Bỏ gắn"
          busy={unlinking === askUnlink.taskId}
          onConfirm={confirmUnlink}
          onClose={() => setAskUnlink(null)}
        />
      ) : null}
    </>
  );
}
