"use client";

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, activateSprint, closeSprint, createSprint, projectBoard } from "../api/client";
import { formatDate, formatDateTime } from "../format";
import type {
  PermissionSnapshot,
  Project,
  ProjectInput,
  Sprint,
  SprintBoard,
} from "../types";
import {
  CloseGlyph,
  CommitmentBar,
  Confirm,
  Field,
  Modal,
  Select,
  SprintStatusBadge,
  StatusBadge,
  TextArea,
  TextInput,
} from "./primitives";
import { ProjectForm } from "./project-form";

interface ProjectDetailSheetProps {
  project: Project;
  permission: PermissionSnapshot | null;
  canUpdate: boolean;
  canDelete: boolean;
  onSave: (values: ProjectInput) => Promise<unknown>;
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

/** Active first: the running sprint is what a planner opens this sheet for. */
const STATUS_ORDER: Record<Sprint["status"], number> = { ACTIVE: 0, PLANNED: 1, CLOSED: 2 };

interface SprintDraft {
  name: string;
  startDate: string;
  endDate: string;
  capacity: string;
  goal: string;
}

const EMPTY_SPRINT: SprintDraft = {
  name: "",
  startDate: "",
  endDate: "",
  capacity: "",
  goal: "",
};

export function ProjectDetailSheet({
  project,
  permission,
  canUpdate,
  canDelete,
  onSave,
  onDelete,
  onChanged,
  onClose,
}: ProjectDetailSheetProps) {
  const titleId = useId();
  const [board, setBoard] = useState<SprintBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [askOverCapacity, setAskOverCapacity] = useState<Sprint | null>(null);
  const [closing, setClosing] = useState<Sprint | null>(null);
  const [nextSprintId, setNextSprintId] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<SprintDraft>(EMPTY_SPRINT);
  const [draftError, setDraftError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    projectBoard(project.id)
      .then((next) => {
        if (cancelled) return;
        setBoard(next);
        setBoardError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setBoardError(
          caught instanceof Error ? caught.message : "Không tải được sprint của dự án.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Escape must not stack overlays: a confirm owns the key while it is open.
      if (event.key === "Escape" && !askOverCapacity && !closing && !askDelete) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, askOverCapacity, closing, askDelete]);

  const sprints = useMemo(() => {
    if (!board) return [];
    return [...board.sprints].sort((left, right) => {
      const order = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (order !== 0) return order;
      return right.startDate.localeCompare(left.startDate);
    });
  }, [board]);

  const active = sprints.find((sprint) => sprint.status === "ACTIVE") ?? null;

  /** One sprint may run at a time; the API rejects a second activation. */
  const activate = async (sprint: Sprint, overCapacity: boolean) => {
    setPending(sprint.id);
    setProblem(null);
    // Optimistic: planners see the badge flip immediately, the board answer is authoritative.
    setBoard((current) =>
      current
        ? {
            ...current,
            sprints: current.sprints.map((item) =>
              item.id === sprint.id ? { ...item, status: "ACTIVE" } : item,
            ),
          }
        : current,
    );
    try {
      const updated = await activateSprint(project.id, sprint.id, {
        version: sprint.version,
        overCapacity,
      });
      setBoard((current) =>
        current
          ? {
              ...current,
              sprints: current.sprints.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setAskOverCapacity(null);
      setProblem(null);
      onChanged();
    } catch (caught) {
      setBoard((current) =>
        current
          ? {
              ...current,
              sprints: current.sprints.map((item) =>
                item.id === sprint.id ? { ...item, status: sprint.status } : item,
              ),
            }
          : current,
      );
      setAskOverCapacity(null);
      setProblem(
        caught instanceof Error
          ? `${caught.message} Sprint đã trở về trạng thái trước đó.`
          : "Chưa kích hoạt được sprint.",
      );
    } finally {
      setPending(null);
    }
  };

  const confirmActivate = (sprint: Sprint) => {
    // The API greys out commitments above capacity + 25%; a manager accepts the rest.
    if (sprint.commitment.state === "OVER" && permission?.role === "MANAGER") {
      setAskOverCapacity(sprint);
      return;
    }
    void activate(sprint, false);
  };

  const confirmClose = async () => {
    if (!closing) return;
    const sprint = closing;
    setPending(sprint.id);
    setProblem(null);
    setClosing(null);
    try {
      const next = await closeSprint(project.id, sprint.id, {
        version: sprint.version,
        nextSprintId: nextSprintId || null,
      });
      // The API returns the whole board because unfinished rows may have moved.
      setBoard(next);
      setNextSprintId("");
      onChanged();
    } catch (caught) {
      setProblem(
        caught instanceof Error ? caught.message : "Chưa đóng được sprint.",
      );
    } finally {
      setPending(null);
    }
  };

  const submitSprint = async (event: FormEvent) => {
    event.preventDefault();
    setDraftError(null);
    if (!draft.name.trim()) {
      setDraftError("Nhập tên sprint, ví dụ “Sprint 12 · 01/12–14/12”.");
      return;
    }
    if (!draft.startDate || !draft.endDate) {
      setDraftError("Chọn ngày bắt đầu và ngày kết thúc sprint.");
      return;
    }
    if (draft.endDate < draft.startDate) {
      setDraftError("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
      return;
    }
    const capacity = draft.capacity.trim() ? Number(draft.capacity) : 0;
    if (!Number.isInteger(capacity) || capacity < 0 || capacity > 10000) {
      setDraftError("Năng lực là số nguyên điểm từ 0 đến 10.000.");
      return;
    }
    setPending("create");
    try {
      const created = await createSprint(project.id, {
        name: draft.name.trim(),
        goal: draft.goal.trim(),
        startDate: draft.startDate,
        endDate: draft.endDate,
        capacity,
        note: "",
      });
      setBoard((current) =>
        current ? { ...current, sprints: [...current.sprints, created] } : current,
      );
      setDraft(EMPTY_SPRINT);
      setCreating(false);
      onChanged();
    } catch (caught) {
      setDraftError(
        caught instanceof ApiError ? caught.message : "Chưa tạo được sprint.",
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
      setProblem(caught instanceof Error ? caught.message : "Chưa xoá được dự án.");
      setAskDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const canManageSprints = canUpdate;
  const backlogPoints = board
    ? board.backlog.reduce((sum, item) => sum + item.points, 0)
    : 0;

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">{project.code}</span>
            <h2 className="page-heading" id={titleId}>
              {project.name}
            </h2>
            <div className="row items-center gap-2 wrap">
              <StatusBadge status={project.status} />
              <span className="muted">Bản ghi phiên bản {project.version}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết dự án"
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
            <Row term="Quản lý dự án">{project.assignee || "Chưa chỉ định"}</Row>
            <Row term="Nhóm">{project.fields.team || "Chưa gắn nhóm"}</Row>
            <Row term="Phạm vi">{project.scope || "Chưa gắn phạm vi"}</Row>
            <Row term="Mốc thời gian">{formatDate(project.date)}</Row>
            <Row term="Tiến độ">
              {typeof project.fields.progress === "number"
                ? `${project.fields.progress}%`
                : "Chưa cập nhật"}
            </Row>
            <Row term="Thành viên">{project.fields.members || "Chưa thêm thành viên"}</Row>
            <Row term="Cập nhật">{formatDateTime(project.updatedAt)}</Row>
          </dl>

          {project.fields.objective ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Mục tiêu</h3>
              <p className="list-main">{project.fields.objective}</p>
            </section>
          ) : null}

          {project.note ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Ghi chú</h3>
              <p className="list-main">{project.note}</p>
            </section>
          ) : null}

          <section className="stack gap-3" aria-label="Thông tin dự án">
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
              <ProjectForm
                initial={project}
                submitLabel="Lưu thay đổi"
                onCancel={() => setEditing(false)}
                onSubmit={async (values) => {
                  await onSave(values);
                  setEditing(false);
                }}
              />
            ) : (
              <p className="muted">
                Chỉnh sửa nội dung không đổi trạng thái sprint; mỗi lần lưu tăng phiên
                bản bản ghi.
              </p>
            )}
          </section>

          <section className="stack gap-3" aria-label="Sprint của dự án">
            <div className="spread items-center wrap gap-2">
              <div className="stack gap-1">
                <h3 className="surface-title">Sprint</h3>
                <span className="muted">
                  {active
                    ? `Đang chạy: ${active.name} · còn ${active.daysLeft.toLocaleString("vi-VN")} ngày`
                    : "Chưa có sprint nào đang chạy"}
                </span>
              </div>
              <div className="row gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={load}
                  aria-label="Tải lại sprint của dự án"
                >
                  Tải lại
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCreating((open) => !open)}
                  disabled={!canManageSprints}
                  title={
                    canManageSprints
                      ? "Thêm sprint cho dự án"
                      : "Bạn không có quyền quản lý sprint"
                  }
                >
                  {creating ? "Đóng biểu mẫu" : "Thêm sprint"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="stack gap-2">
                <span className="skeleton skeleton-line" style={{ width: "70%" }} />
                <span className="skeleton skeleton-line" style={{ width: "55%" }} />
              </div>
            ) : boardError ? (
              <div className="error-state" role="alert">
                <span className="empty-title">Không tải được sprint</span>
                <p className="empty-body">{boardError}</p>
                <button type="button" className="btn btn-ghost" onClick={load}>
                  Thử lại
                </button>
              </div>
            ) : sprints.length === 0 && !creating ? (
              <div className="empty-state">
                <span className="empty-title">Dự án chưa có sprint</span>
                <p className="empty-body">
                  Tạo sprint đầu tiên để đặt năng lực và theo dõi cam kết điểm. Mỗi dự án
                  chỉ chạy một sprint tại một thời điểm.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCreating(true)}
                  disabled={!canManageSprints}
                >
                  Thêm sprint
                </button>
              </div>
            ) : (
              <ul className="list">
                {sprints.map((sprint) => {
                  const busy = pending === sprint.id;
                  const blockedByActive = active !== null && active.id !== sprint.id;
                  return (
                    <li key={sprint.id} className="list-row">
                      <div className="list-main stack gap-1">
                        <div className="row wrap items-center gap-2">
                          <strong>{sprint.name}</strong>
                          <SprintStatusBadge status={sprint.status} />
                          {sprint.carried > 0 ? (
                            <span className="badge badge-warning">
                              {sprint.carried} việc chuyển tiếp
                            </span>
                          ) : null}
                        </div>
                        <span className="muted tabular">
                          {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                          {" · "}
                          {sprint.doneCount.toLocaleString("vi-VN")}/
                          {sprint.itemCount.toLocaleString("vi-VN")} việc
                        </span>
                        <CommitmentBar value={sprint.commitment} />
                        {sprint.goal ? (
                          <span className="muted truncate">{sprint.goal}</span>
                        ) : null}
                      </div>
                      <div className="list-meta stack gap-2 items-end">
                        <span className="muted tabular">
                          {sprint.status === "CLOSED"
                            ? `Đóng ${formatDate(sprint.closedAt ?? sprint.endDate)}`
                            : sprint.daysLeft >= 0
                              ? `Còn ${sprint.daysLeft.toLocaleString("vi-VN")} ngày`
                              : `Quá ${Math.abs(sprint.daysLeft).toLocaleString("vi-VN")} ngày`}
                        </span>
                        {sprint.status === "PLANNED" ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => confirmActivate(sprint)}
                            disabled={!canManageSprints || busy || blockedByActive}
                            aria-busy={busy ? "true" : undefined}
                            title={
                              blockedByActive
                                ? `Sprint “${active?.name ?? ""}” đang chạy; đóng sprint đó trước khi kích hoạt sprint mới`
                                : !canManageSprints
                                  ? "Bạn không có quyền kích hoạt sprint"
                                  : "Kích hoạt sprint"
                            }
                          >
                            {busy ? "Đang kích hoạt…" : "Kích hoạt"}
                          </button>
                        ) : sprint.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setNextSprintId("");
                              setClosing(sprint);
                            }}
                            disabled={!canManageSprints || busy}
                            aria-busy={busy ? "true" : undefined}
                            title={
                              canManageSprints
                                ? "Đóng sprint và chọn nơi chuyển việc chưa xong"
                                : "Bạn không có quyền đóng sprint"
                            }
                          >
                            {busy ? "Đang đóng…" : "Đóng sprint"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {creating ? (
              <form className="stack gap-3" onSubmit={submitSprint} noValidate>
                {draftError ? (
                  <div className="alert alert-danger" role="alert">
                    <span>{draftError}</span>
                  </div>
                ) : null}
                <div className="field-grid">
                  <Field
                    label="Tên sprint"
                    htmlFor={`${titleId}-sprint-name`}
                    required
                  >
                    <TextInput
                      id={`${titleId}-sprint-name`}
                      value={draft.name}
                      maxLength={200}
                      autoComplete="off"
                      placeholder="Sprint 12 · 01/12–14/12"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Năng lực (điểm)" htmlFor={`${titleId}-sprint-capacity`}>
                    <TextInput
                      id={`${titleId}-sprint-capacity`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={10000}
                      step={1}
                      value={draft.capacity}
                      placeholder="40"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          capacity: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Bắt đầu" htmlFor={`${titleId}-sprint-start`} required>
                    <TextInput
                      id={`${titleId}-sprint-start`}
                      type="date"
                      value={draft.startDate}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Kết thúc" htmlFor={`${titleId}-sprint-end`} required>
                    <TextInput
                      id={`${titleId}-sprint-end`}
                      type="date"
                      value={draft.endDate}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Mục tiêu sprint" htmlFor={`${titleId}-sprint-goal`}>
                  <TextArea
                    id={`${titleId}-sprint-goal`}
                    rows={2}
                    maxLength={2000}
                    value={draft.goal}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, goal: event.target.value }))
                    }
                  />
                </Field>
                <div className="row justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setCreating(false);
                      setDraftError(null);
                    }}
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pending === "create"}
                    aria-busy={pending === "create" ? "true" : undefined}
                  >
                    {pending === "create" ? "Đang tạo…" : "Tạo sprint"}
                  </button>
                </div>
              </form>
            ) : null}

            {board && board.velocity.closedSprints > 0 ? (
              <div className="row wrap items-center gap-4">
                <span className="muted">
                  Vận tốc trung bình{" "}
                  <strong className="tabular">
                    {board.velocity.average.toLocaleString("vi-VN")}
                  </strong>{" "}
                  điểm trên{" "}
                  {board.velocity.closedSprints.toLocaleString("vi-VN")} sprint đã đóng
                </span>
                <span className="muted">
                  Gần nhất <strong className="tabular">{board.velocity.last.toLocaleString("vi-VN")}</strong>{" "}
                  điểm
                </span>
              </div>
            ) : null}

            <div className="stack gap-2">
              <div className="spread items-center">
                <h4 className="surface-title">Backlog sản phẩm</h4>
                <span className="muted tabular">
                  {board ? board.backlog.length.toLocaleString("vi-VN") : 0} việc ·{" "}
                  {backlogPoints.toLocaleString("vi-VN")} điểm
                </span>
              </div>
              {board && board.backlog.length > 0 ? (
                <ul className="list">
                  {board.backlog.slice(0, 8).map((item) => (
                    <li key={item.id} className="list-row">
                      <div className="list-main stack gap-1">
                        <span className="row wrap items-center gap-2">
                          <span className="mono muted">{item.task?.code ?? "—"}</span>
                          <span className="truncate">
                            {item.task?.name ?? "Công việc đã bị xoá khỏi hệ thống"}
                          </span>
                        </span>
                        <span className="muted">
                          {item.points.toLocaleString("vi-VN")} điểm
                          {item.carriedTimes > 0
                            ? ` · đã chuyển tiếp ${item.carriedTimes.toLocaleString("vi-VN")} lần`
                            : ""}
                        </span>
                      </div>
                      <div className="list-meta">
                        <span className="tabular">
                          {item.task?.assignee || "Chưa giao"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  {board
                    ? "Backlog đang trống. Việc được đưa vào backlog từ màn hình công việc."
                    : "Chưa tải được backlog."}
                </p>
              )}
              {board && board.backlog.length > 8 ? (
                <p className="muted">
                  Đang hiển thị 8 việc đầu theo thứ tự ưu tiên; còn{" "}
                  {(board.backlog.length - 8).toLocaleString("vi-VN")} việc khác.
                </p>
              ) : null}
            </div>
          </section>

          {/*
            Hợp đồng và phản hồi khách hàng chưa có route trong
            `project-spaces.controller.ts`, nên màn hình chỉ nói rõ là chưa có dữ liệu
            thay vì dựng số liệu giả.
          */}
          <section className="stack gap-2" aria-label="Hợp đồng và phản hồi khách hàng">
            <h3 className="surface-title">Hợp đồng &amp; phản hồi khách hàng</h3>
            <p className="muted">
              Phân hệ dự án hiện chưa mở endpoint cho khối hợp đồng và phản hồi khách
              hàng nội bộ. Thông tin hợp đồng đang được lưu ở hồ sơ ngoài; màn hình này
              không hiển thị số liệu ước lượng.
            </p>
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
              Xoá dự án
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>

      {askOverCapacity ? (
        <Confirm
          title="Kích hoạt sprint vượt năng lực?"
          body={`${askOverCapacity.name} đang cam kết ${askOverCapacity.commitment.committed.toLocaleString(
            "vi-VN",
          )} điểm trên năng lực ${askOverCapacity.commitment.capacity.toLocaleString(
            "vi-VN",
          )} điểm (vượt ${askOverCapacity.commitment.overBy.toLocaleString("vi-VN")} điểm). Hệ thống ghi nhận việc vượt năng lực do quản lý chấp thuận.`}
          confirmLabel="Vẫn kích hoạt"
          danger={false}
          busy={pending === askOverCapacity.id}
          onConfirm={() => void activate(askOverCapacity, true)}
          onClose={() => setAskOverCapacity(null)}
        />
      ) : null}

      {closing ? (
        <Modal
          title={`Đóng ${closing.name}?`}
          onClose={() => setClosing(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setClosing(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmClose()}
                disabled={pending === closing.id}
                aria-busy={pending === closing.id ? "true" : undefined}
              >
                {pending === closing.id ? "Đang đóng…" : "Đóng sprint"}
              </button>
            </>
          }
        >
          <div className="stack gap-3">
            <p className="muted">
              Việc chưa xong được chuyển sang sprint bạn chọn hoặc trả về backlog. Vận
              tốc của sprint được chốt tại thời điểm đóng.
            </p>
            <Field label="Chuyển việc chưa xong sang" htmlFor={`${titleId}-next-sprint`}>
              <Select
                id={`${titleId}-next-sprint`}
                value={nextSprintId}
                onChange={(event) => setNextSprintId(event.target.value)}
              >
                <option value="">Trả về backlog</option>
                {sprints
                  .filter(
                    (sprint) =>
                      sprint.id !== closing.id &&
                      sprint.status !== "CLOSED" &&
                      sprint.status !== "ACTIVE",
                  )
                  .map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
        </Modal>
      ) : null}

      {askDelete ? (
        <Confirm
          title="Xoá dự án này?"
          body={`${project.code} — ${project.name}. Hành động này không khôi phục được từ giao diện.`}
          confirmLabel="Xoá vĩnh viễn"
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setAskDelete(false)}
        />
      ) : null}
    </>
  );
}
