"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NOTE_STATUSES } from "../types";
import type { KnowledgeNote, NoteStatus } from "../types";
import { formatDate, formatDateTime, paragraphs, tagList } from "../format";
import { getNote } from "../api/client";
import { Confirm, CloseGlyph, StatusBadge } from "./primitives";

interface ReaderSheetProps {
  note: KnowledgeNote;
  pending: boolean;
  onEdit: () => void;
  onStatus: (status: NoteStatus) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Reading surface for one bài. It re-reads `GET /notes/:id` on open so the body is
 * current even if the row came from an older page; a failed re-read keeps the row
 * content and says so, rather than blanking the sheet.
 */
export function ReaderSheet({ note, pending, onEdit, onStatus, onDelete, onClose }: ReaderSheetProps) {
  const [fresh, setFresh] = useState<KnowledgeNote | null>(null);
  const [staleNote, setStaleNote] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFresh(null);
    setStaleNote(false);
    getNote(note.id)
      .then((body) => {
        if (!cancelled) setFresh(body);
      })
      .catch(() => {
        if (!cancelled) setStaleNote(true);
      });
    return () => {
      cancelled = true;
    };
  }, [note.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const view = fresh ?? note;
  const tags = tagList(view.fields);
  const blocks = paragraphs(view.fields.content);

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-1" style={{ minWidth: 0 }}>
            <span className="page-eyebrow">Bài trong kho tri thức</span>
            <h2 className="dialog-title" id={titleId}>
              {view.name}
            </h2>
            <div className="row wrap items-center gap-2">
              <span className="mono muted">{view.code}</span>
              <StatusBadge status={view.status} />
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng bài đang đọc"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {staleNote ? (
            <div className="alert alert-warning" role="status" aria-live="polite">
              Không đọc lại được bản mới nhất. Nội dung dưới đây lấy từ danh sách đã tải.
            </div>
          ) : null}

          <dl className="field-grid" style={{ margin: 0 }}>
            <div className="stack gap-1">
              <dt className="field-label">Ngày áp dụng</dt>
              <dd className="muted tabular" style={{ margin: 0 }}>
                {formatDate(view.date)}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Cập nhật gần nhất</dt>
              <dd className="muted tabular" style={{ margin: 0 }}>
                {formatDateTime(view.updatedAt)}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Người phụ trách</dt>
              <dd className="muted" style={{ margin: 0 }}>
                {view.assignee || "Chưa gán"}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Phạm vi</dt>
              <dd className="muted" style={{ margin: 0 }}>
                {view.scope || "Toàn hệ thống"}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Nhóm nội dung</dt>
              <dd className="muted" style={{ margin: 0 }}>
                {view.fields.category || "Chưa phân nhóm"}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Phiên bản ghi nhận</dt>
              <dd className="muted tabular" style={{ margin: 0 }}>
                v{view.version}
              </dd>
            </div>
          </dl>

          {tags.length > 0 ? (
            <div className="row wrap items-center gap-2">
              {tags.map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="divider" />

          {blocks.length > 0 ? (
            blocks.map((block, index) => (
              <p key={index} style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {block}
              </p>
            ))
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Bài này chưa có nội dung. Mở “Sửa” để bổ sung hướng dẫn.
            </p>
          )}

          {view.note ? (
            <div className="alert alert-warning">
              <div className="stack gap-1">
                <strong>Ghi chú nội bộ</strong>
                <span>{view.note}</span>
              </div>
            </div>
          ) : null}

          {/* The API exposes one WorkNote row: no version history, no approval queue. */}
          <p className="page-footnote">
            Phân hệ mới lưu một bản ghi cho mỗi bài: chưa có endpoint lịch sử phiên bản
            hay hàng đợi duyệt, nên màn hình đọc không hiển thị hai phần đó.
          </p>
        </div>

        <div className="sheet-foot">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setConfirming(true)}
            disabled={pending}
          >
            Xoá bài
          </button>
          <div className="row items-center gap-2" style={{ marginLeft: "auto" }}>
            {NOTE_STATUSES.filter((status) => status !== view.status).map((status) => (
              <button
                key={status}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onStatus(status)}
                disabled={pending}
                aria-busy={pending ? "true" : undefined}
              >
                {status === "Đã xuất bản"
                  ? "Xuất bản"
                  : status === "Lưu trữ"
                    ? "Lưu trữ"
                    : "Về bản nháp"}
              </button>
            ))}
            <button type="button" className="btn btn-primary" onClick={onEdit}>
              Sửa bài
            </button>
          </div>
        </div>
      </aside>

      {confirming ? (
        <Confirm
          title={`Xoá ${view.code}?`}
          body="Bản ghi bị xoá hẳn khỏi phân hệ và không khôi phục được. Nếu chỉ muốn ngừng hiển thị, chọn “Lưu trữ” thay vì xoá."
          confirmLabel="Xoá vĩnh viễn"
          busy={pending}
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}
