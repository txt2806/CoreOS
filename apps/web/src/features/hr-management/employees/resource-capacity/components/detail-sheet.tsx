"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import {
  ApiError,
  cancelAllocation,
  capacityDetail,
  createAllocation,
  listAllocations,
  updateAllocation,
  updatePeriod,
} from "../api/client";
import { ALLOCATION_STATUS_LABEL } from "../constants";
import { formatDate, formatDateTime, formatHours, formatPercent } from "../format";
import type { Allocation, CapacityDetail, PeriodInput } from "../types";
import { AllocationForm, type AllocationValues } from "./allocation-form";
import { PeriodForm } from "./period-form";
import {
  AllocationStatusBadge,
  CapacityBar,
  CloseGlyph,
  Confirm,
  Modal,
} from "./primitives";

interface PeriodDetailSheetProps {
  periodId: string;
  canCreate: boolean;
  canUpdate: boolean;
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

export function PeriodDetailSheet({
  periodId,
  canCreate,
  canUpdate,
  onChanged,
  onClose,
}: PeriodDetailSheetProps) {
  const titleId = useId();
  const [detail, setDetail] = useState<CapacityDetail | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [askCancel, setAskCancel] = useState<Allocation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(
    (showSkeleton: boolean) => {
      let cancelled = false;
      /* A refresh after a write must not blank the sheet the user is reading. */
      if (showSkeleton) setLoading(true);
      Promise.all([capacityDetail(periodId), listAllocations({ periodId, pageSize: 100 })])
        .then(([capacity, page]) => {
          if (cancelled) return;
          setDetail(capacity);
          setAllocations(page.items);
          /* The list endpoint caps at 100 rows; saying so beats silently hiding some. */
          setTruncated(page.total > page.items.length);
          setLoadError(null);
        })
        .catch((caught: unknown) => {
          if (cancelled) return;
          setLoadError(caught instanceof Error ? caught.message : "Không tải được kỳ công suất.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [periodId],
  );

  useEffect(() => fetchAll(true), [fetchAll]);

  const refresh = () => {
    fetchAll(false);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      /* A dialog owns Escape while open, so the sheet does not close under it. */
      if (event.key !== "Escape") return;
      if (adding || editing || askCancel || editingPeriod) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, adding, editing, askCancel, editingPeriod]);

  const savePeriod = async (values: PeriodInput) => {
    if (!detail) return;
    /* `periodPatch` omits employee fields and leaveDays and is strict, so only these go. */
    await updatePeriod(detail.period.id, {
      fromDate: values.fromDate,
      toDate: values.toDate,
      standardHoursPerDay: values.standardHoursPerDay,
      holidayDays: values.holidayDays,
      note: values.note,
      version: detail.period.version,
    });
    setEditingPeriod(false);
    setProblem(null);
    setFeedback("Đã lưu kỳ công suất; giờ khả dụng được tính lại.");
    refresh();
    onChanged();
  };

  const add = async (values: AllocationValues) => {
    if (!detail) return;
    await createAllocation({ periodId: detail.period.id, ...values });
    setAdding(false);
    setProblem(null);
    setFeedback(`Đã thêm phân bổ “${values.projectRef}”; công suất được tính lại.`);
    refresh();
    onChanged();
  };

  const save = async (values: AllocationValues) => {
    if (!editing) return;
    await updateAllocation(editing.id, { ...values, version: editing.version });
    setEditing(null);
    setProblem(null);
    setFeedback(`Đã cập nhật phân bổ “${values.projectRef}”.`);
    refresh();
    onChanged();
  };

  /**
   * Cancelling is optimistic: the badge flips at once and rolls back on refusal.
   * The utilisation bar still comes from the server, so the sheet says it is
   * being recalculated instead of inventing the new number.
   */
  const confirmCancel = async () => {
    if (!askCancel) return;
    const target = askCancel;
    const previous = allocations;
    setBusy(target.id);
    setProblem(null);
    setAllocations((current) =>
      current.map((item) => (item.id === target.id ? { ...item, status: "CANCELLED" } : item)),
    );
    try {
      await cancelAllocation(target.id, target.version);
      setFeedback(`Đã huỷ phân bổ “${target.projectRef}”; công suất đang được tính lại.`);
      refresh();
      onChanged();
    } catch (caught) {
      setAllocations(previous);
      const hint =
        caught instanceof ApiError && caught.status === 409
          ? "Bản ghi đã thay đổi ở nơi khác."
          : null;
      setProblem(
        caught instanceof Error
          ? `${caught.message}${hint ? ` ${hint}` : ""} Phân bổ đã trở về trạng thái ${ALLOCATION_STATUS_LABEL[target.status]}.`
          : "Chưa huỷ được phân bổ.",
      );
    } finally {
      setBusy(null);
      setAskCancel(null);
    }
  };

  const summary = detail?.summary;
  const unallocatedPercent = summary ? Math.max(0, 100 - summary.allocatedPercent) : 0;

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow">Công suất nhân sự</span>
            <h2 className="page-heading" id={titleId}>
              {detail?.period.employeeName ?? "Đang tải kỳ công suất…"}
            </h2>
            <div className="row items-center gap-2 wrap">
              <span className="muted mono">{detail?.period.employeeId ?? "—"}</span>
              {detail ? (
                <span className="muted">Bản ghi phiên bản {detail.period.version}</span>
              ) : null}
              {summary?.overCapacity ? (
                <span className="badge badge-danger">
                  <span className="dot" />
                  Vượt công suất
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết kỳ công suất"
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
              <span className="empty-title">Không tải được kỳ công suất</span>
              <p className="empty-body">{loadError}</p>
              <button type="button" className="btn btn-primary" onClick={() => fetchAll(true)}>
                Thử lại
              </button>
            </div>
          ) : detail && summary ? (
            <>
              <section className="stack gap-3" aria-label="Công suất của kỳ">
                <div className="spread items-center wrap gap-2">
                  <div className="stack gap-1">
                    <h3 className="surface-title">Công suất</h3>
                    <span className="muted">
                      {formatDate(summary.fromDate)} – {formatDate(summary.toDate)} ·{" "}
                      {summary.workingDays.toLocaleString("vi-VN")} ngày làm việc
                    </span>
                  </div>
                  <span className="muted">Tính bởi máy chủ</span>
                </div>

                <CapacityBar
                  utilization={summary.utilization}
                  over={summary.overCapacity}
                  label={`Công suất của ${summary.employeeName}`}
                />

                <dl className="stack gap-0">
                  <Row term="Giờ khả dụng">{formatHours(summary.availableHours)} giờ</Row>
                  <Row term="Đã phân bổ">
                    {formatHours(summary.allocatedHours)} giờ · {formatPercent(summary.allocatedPercent)}
                  </Row>
                  <Row term="Chưa phân bổ">
                    {formatHours(Math.max(0, summary.remainingHours))} giờ ·{" "}
                    {formatPercent(unallocatedPercent)}
                  </Row>
                  <Row term="Còn trống sau phân bổ">
                    {formatHours(summary.remainingHours)} giờ
                    {summary.overCapacity ? " (âm: vượt công suất)" : ""}
                  </Row>
                  <Row term="Ngày lễ / phép">
                    {summary.holidayDays.toLocaleString("vi-VN")} /{" "}
                    {summary.leaveDays.toLocaleString("vi-VN")}
                  </Row>
                  <Row term="Giờ chuẩn mỗi ngày">
                    {summary.standardHoursPerDay.toLocaleString("vi-VN")} giờ
                  </Row>
                </dl>
                <p className="muted">
                  Giờ khả dụng = (ngày làm việc − ngày lễ − ngày phép) × giờ chuẩn. Tỉ lệ phân bổ
                  là tổng phần trăm của các phân bổ chưa huỷ; phần còn lại là công suất chưa
                  dùng, không phải giờ trống đã được đặt trước.
                </p>
              </section>

              <section className="stack gap-3" aria-label="Phân bổ dự án của kỳ">
                <div className="spread items-center wrap gap-2">
                  <div className="stack gap-1">
                    <h3 className="surface-title">Phân bổ dự án</h3>
                    <span className="muted">
                      {allocations.length.toLocaleString("vi-VN")} phân bổ
                      {truncated ? " (chỉ hiện 100 phân bổ đầu)" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setAdding(true)}
                    disabled={!canCreate}
                    title={canCreate ? "Thêm phân bổ dự án" : "Bạn không có quyền tạo phân bổ"}
                  >
                    Thêm phân bổ
                  </button>
                </div>

                {allocations.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-title">Chưa phân bổ dự án nào</span>
                    <p className="empty-body">
                      Kỳ này có {formatHours(summary.availableHours)} giờ khả dụng và chưa dùng
                      phần nào. Thêm phân bổ để đặt công suất cho dự án.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setAdding(true)}
                      disabled={!canCreate}
                    >
                      Thêm phân bổ
                    </button>
                  </div>
                ) : (
                  <ul className="list">
                    {allocations.map((allocation) => (
                      <li key={allocation.id} className="list-row">
                        <div className="list-main stack gap-1">
                          <span className="row wrap items-center gap-2">
                            <span className="truncate">{allocation.projectRef}</span>
                            <AllocationStatusBadge status={allocation.status} />
                            <span className="tabular">
                              {formatPercent(allocation.percentage)}
                            </span>
                          </span>
                          {allocation.note ? (
                            <span className="muted">{allocation.note}</span>
                          ) : null}
                          <span className="list-meta tabular">
                            Cập nhật {formatDateTime(allocation.updatedAt)}
                          </span>
                        </div>
                        <div className="row wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditing(allocation)}
                            disabled={!canUpdate}
                            aria-label={`Sửa phân bổ ${allocation.projectRef}`}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setAskCancel(allocation)}
                            disabled={!canUpdate || allocation.status === "CANCELLED" || busy === allocation.id}
                            aria-label={`Huỷ phân bổ ${allocation.projectRef}`}
                          >
                            Huỷ
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="stack gap-3" aria-label="Thông tin kỳ công suất">
                <div className="spread items-center wrap gap-2">
                  <h3 className="surface-title">Thông tin kỳ</h3>
                  {canUpdate && !editingPeriod ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingPeriod(true)}
                    >
                      Sửa kỳ
                    </button>
                  ) : null}
                </div>
                {editingPeriod ? (
                  <PeriodForm
                    initial={detail.period}
                    submitLabel="Lưu kỳ"
                    onSubmit={savePeriod}
                    onCancel={() => setEditingPeriod(false)}
                  />
                ) : (
                  <dl className="stack gap-0">
                    <Row term="Ghi chú">{detail.period.note || "—"}</Row>
                    <Row term="Tạo lúc">{formatDateTime(detail.period.createdAt)}</Row>
                    <Row term="Cập nhật">{formatDateTime(detail.period.updatedAt)}</Row>
                  </dl>
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
        <Modal title="Thêm phân bổ dự án" onClose={() => setAdding(false)}>
          <AllocationForm
            submitLabel="Thêm phân bổ"
            onSubmit={add}
            onCancel={() => setAdding(false)}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Sửa phân bổ dự án" onClose={() => setEditing(null)}>
          <AllocationForm
            initial={editing}
            submitLabel="Lưu thay đổi"
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {askCancel ? (
        <Confirm
          title="Huỷ phân bổ này?"
          body={`“${askCancel.projectRef}” sẽ không còn tính vào công suất của kỳ. Bản ghi vẫn được giữ với trạng thái Đã huỷ.`}
          confirmLabel="Huỷ phân bổ"
          busy={busy === askCancel.id}
          onConfirm={confirmCancel}
          onClose={() => setAskCancel(null)}
        />
      ) : null}
    </>
  );
}
