"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { EVENT_STATUSES } from "../types";
import type { CalendarEvent, EventStatus } from "../types";
import { formatDate, formatDateTime, weekdayLong } from "../format";
import { AlertGlyph, CloseGlyph, Confirm, KindChip, StatusBadge } from "./primitives";

interface EventSheetProps {
  event: CalendarEvent;
  status: EventStatus;
  canUpdate: boolean;
  canDelete: boolean;
  pending: boolean;
  onChangeStatus: (status: EventStatus) => void;
  onDelete: () => Promise<unknown>;
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

export function EventSheet({
  event,
  status,
  canUpdate,
  canDelete,
  pending,
  onChangeStatus,
  onDelete,
  onClose,
}: EventSheetProps) {
  const titleId = useId();
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa xoá được sự kiện.");
      setAskDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const time = [event.fields.startTime, event.fields.endTime].filter(Boolean).join(" – ");

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">{event.code}</span>
            <h2 className="page-heading" id={titleId}>
              {event.name}
            </h2>
            <div className="row items-center gap-2 wrap">
              <StatusBadge status={status} />
              <KindChip kind={event.fields.kind} time={time || undefined} />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết sự kiện"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {problem ? (
            <div className="alert alert-danger" role="alert">
              <AlertGlyph />
              <span>{problem}</span>
            </div>
          ) : null}

          <dl className="stack gap-0">
            <Row term="Ngày">{weekdayLong(event.date)}</Row>
            <Row term="Thời gian">{time || "Cả ngày"}</Row>
            <Row term="Địa điểm">{event.fields.location || "Chưa ghi"}</Row>
            <Row term="Người tham dự">{event.fields.attendees || "Chưa ghi"}</Row>
            <Row term="Phụ trách">{event.assignee || "Chưa giao"}</Row>
            <Row term="Phạm vi">{event.scope || "Chưa gắn phạm vi"}</Row>
            <Row term="Cập nhật">{formatDateTime(event.updatedAt)}</Row>
            <Row term="Bản ghi">phiên bản {event.version}</Row>
          </dl>

          {event.note ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Ghi chú</h3>
              <p className="list-main">{event.note}</p>
            </section>
          ) : null}

          <section className="stack gap-3" aria-label="Đổi trạng thái sự kiện">
            <div className="spread items-center">
              <h3 className="surface-title">Trạng thái</h3>
              <span className="muted">Đổi trạng thái áp dụng ngay, hoàn tác nếu máy chủ từ chối</span>
            </div>
            <div className="row wrap gap-2">
              {EVENT_STATUSES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === status ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                  aria-pressed={option === status}
                  disabled={!canUpdate || pending || option === status}
                  title={
                    canUpdate ? `Chuyển sang ${option}` : "Bạn không có quyền sửa sự kiện"
                  }
                  onClick={() => onChangeStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {!canUpdate ? (
              <p className="muted">Bạn chỉ có quyền xem lịch, không đổi được trạng thái.</p>
            ) : null}
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
              Xoá sự kiện
            </button>
          ) : null}
          <span className="muted tabular">{formatDate(event.date)}</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>

      {askDelete ? (
        <Confirm
          title="Xoá sự kiện này?"
          body={`${event.code} — ${event.name}. Sự kiện sẽ rời khỏi lịch của mọi người tham dự.`}
          confirmLabel="Xoá vĩnh viễn"
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setAskDelete(false)}
        />
      ) : null}
    </>
  );
}
