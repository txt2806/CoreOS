"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { LEAVE_TYPE_LABEL, STATUS_LABEL } from "../constants";
import { formatDate, formatDateTime, sessionOf } from "../format";
import type { LeavePatch, LeaveRequest, Session } from "../types";
import type { QuotaContext } from "../hooks/use-leave-requests";
import { CloseGlyph, Confirm, StatusBadge } from "./primitives";
import { LeaveForm } from "./leave-form";

interface LeaveDetailSheetProps {
  request: LeaveRequest;
  canUpdate: boolean;
  pending: boolean;
  actor: Session["actor"] | null;
  canFileForOthers: boolean;
  quota: QuotaContext | null;
  quotaProblem: string | null;
  usedDaysOf: (employeeId: string) => Promise<number | null>;
  onSave: (patch: Omit<LeavePatch, "version">) => Promise<unknown>;
  onCancel: () => Promise<unknown>;
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

export function LeaveDetailSheet({
  request,
  canUpdate,
  pending,
  actor,
  canFileForOthers,
  quota,
  quotaProblem,
  usedDaysOf,
  onSave,
  onCancel,
  onClose,
}: LeaveDetailSheetProps) {
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const confirmCancel = async () => {
    setProblem(null);
    try {
      await onCancel();
      setAskCancel(false);
      onClose();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa hủy được đơn nghỉ phép.");
      setAskCancel(false);
    }
  };

  const pendingEditable = request.status === "PENDING";

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">{request.employeeId}</span>
            <h2 className="page-heading" id={titleId}>
              {request.employeeName}
            </h2>
            <div className="row items-center gap-2 wrap">
              <StatusBadge status={request.status} />
              <span className="badge">{LEAVE_TYPE_LABEL[request.leaveType]}</span>
              <span className="chip">{sessionOf(request)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết đơn nghỉ phép"
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

          <dl className="stack gap-0">
            <Row term="Từ ngày">{formatDate(request.fromDate)}</Row>
            <Row term="Đến ngày">{formatDate(request.toDate)}</Row>
            <Row term="Số ngày làm việc">
              {request.days.toLocaleString("vi-VN")} ngày
            </Row>
            <Row term="Phiên nghỉ">{sessionOf(request)}</Row>
            <Row term="Ngày gửi">{formatDateTime(request.createdAt)}</Row>
            <Row term="Người quyết định">
              {request.decidedBy || <span className="subtle">Chưa xử lý</span>}
            </Row>
            <Row term="Thời điểm quyết định">{formatDateTime(request.decidedAt)}</Row>
            <Row term="Bản ghi phiên bản">{request.version}</Row>
          </dl>

          <section className="stack gap-2">
            <h3 className="surface-title">Lý do</h3>
            <p className="list-main">{request.reason}</p>
          </section>

          {request.decisionNote ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Ghi chú quyết định</h3>
              <p className="list-main">{request.decisionNote}</p>
            </section>
          ) : null}

          <section className="stack gap-3" aria-label="Diễn biến đơn nghỉ">
            <h3 className="surface-title">Diễn biến</h3>
            {/* No history endpoint exists for a leave request, so the timeline is
                built from the timestamps the record itself carries. */}
            <ol className="timeline">
              <li className="stack gap-1">
                <div className="row wrap items-center gap-2">
                  <strong>Gửi đơn</strong>
                  <span className="muted">{formatDateTime(request.createdAt)}</span>
                </div>
                <span className="muted">{request.employeeName}</span>
              </li>
              {request.decidedAt ? (
                <li className="stack gap-1">
                  <div className="row wrap items-center gap-2">
                    <strong>{STATUS_LABEL[request.status]}</strong>
                    <span className="muted">{formatDateTime(request.decidedAt)}</span>
                  </div>
                  <span className="muted">{request.decidedBy || "Không ghi người duyệt"}</span>
                </li>
              ) : (
                <li className="stack gap-1">
                  <div className="row wrap items-center gap-2">
                    <strong>Đang chờ quản lý duyệt</strong>
                  </div>
                  <span className="muted">
                    Đơn sẽ bị tính là nghỉ không phép nếu bị từ chối sau ngày nghỉ.
                  </span>
                </li>
              )}
              {request.updatedAt !== request.createdAt ? (
                <li className="stack gap-1">
                  <div className="row wrap items-center gap-2">
                    <strong>Cập nhật gần nhất</strong>
                    <span className="muted">{formatDateTime(request.updatedAt)}</span>
                  </div>
                </li>
              ) : null}
            </ol>
          </section>

          {canUpdate && pendingEditable ? (
            <section className="stack gap-3" aria-label="Sửa đơn nghỉ phép">
              <div className="spread items-center">
                <h3 className="surface-title">Sửa nội dung đơn</h3>
                {editing ? null : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditing(true)}
                  >
                    Sửa đơn
                  </button>
                )}
              </div>
              {editing ? (
                <LeaveForm
                  initial={request}
                  actor={actor}
                  canFileForOthers={canFileForOthers}
                  quota={quota}
                  quotaProblem={quotaProblem}
                  usedDaysOf={usedDaysOf}
                  submitLabel="Lưu thay đổi"
                  onCancel={() => setEditing(false)}
                  onSubmit={async (values) => {
                    await onSave({
                      leaveType: values.leaveType,
                      fromDate: values.fromDate,
                      toDate: values.toDate,
                      reason: values.reason,
                    });
                    setEditing(false);
                  }}
                />
              ) : (
                <p className="muted">
                  Chỉ đơn đang chờ duyệt mới sửa được. Ngày nghỉ sau khi lưu được máy chủ tính lại.
                </p>
              )}
            </section>
          ) : null}
        </div>

        <div className="sheet-foot">
          {canUpdate && pendingEditable ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAskCancel(true)}
              disabled={pending}
              style={{ marginRight: "auto" }}
            >
              {pending ? "Đang hủy…" : "Hủy đơn"}
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>

      {askCancel ? (
        <Confirm
          title="Hủy đơn nghỉ phép này?"
          body={`${request.employeeName} · ${formatDate(request.fromDate)} → ${formatDate(
            request.toDate,
          )}. Đơn chuyển sang “Đã hủy” và không còn tính vào hạn mức phép năm.`}
          confirmLabel="Hủy đơn"
          busy={pending}
          onConfirm={confirmCancel}
          onClose={() => setAskCancel(false)}
        />
      ) : null}
    </>
  );
}
