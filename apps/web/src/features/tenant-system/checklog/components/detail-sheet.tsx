"use client";

import { useEffect, useId, useRef } from "react";
import type { AuditEntry } from "../types";
import { compactStamp, diffPreview, formatDateTime, prettyValue } from "../format";
import { CloseGlyph, OverrideBadge, ResultBadge } from "./primitives";

interface DetailSheetProps {
  entry: AuditEntry;
  onClose: () => void;
}

/**
 * Read-only detail: the audit sink is append-only, so there is nothing to edit
 * here and no re-read — the row already carries the stored (redacted) payload.
 */
export function AuditDetailSheet({ entry, onClose }: DetailSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-1" style={{ minWidth: 0 }}>
            <span className="page-eyebrow">Bản ghi nhật ký</span>
            <h2 className="dialog-title" id={titleId}>
              {entry.summary}
            </h2>
            <div className="row wrap items-center gap-2">
              <span className="mono muted">{entry.action}</span>
              <ResultBadge result={entry.result} />
              {entry.isOutOfScopeOverride ? <OverrideBadge /> : null}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết bản ghi"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          <dl className="field-grid" style={{ margin: 0 }}>
            <div className="stack gap-1">
              <dt className="field-label">Thời điểm</dt>
              <dd className="muted tabular" style={{ margin: 0 }}>
                {formatDateTime(entry.createdAt)}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Người thực hiện</dt>
              <dd className="muted" style={{ margin: 0 }}>
                {entry.actorName || "Không ghi tên"}
                {entry.actorRole ? ` · ${entry.actorRole}` : ""}
                {entry.isSystemAdmin ? " · Quản trị hệ thống" : ""}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Phân hệ</dt>
              <dd className="muted mono" style={{ margin: 0 }}>
                {entry.featureKey}
              </dd>
            </div>
            <div className="stack gap-1">
              <dt className="field-label">Đối tượng</dt>
              <dd className="muted" style={{ margin: 0 }}>
                {entry.targetType || "Không ghi loại"}
                {entry.targetId ? (
                  <span className="mono"> · {entry.targetId}</span>
                ) : null}
              </dd>
            </div>
          </dl>

          <div className="stack gap-1">
            <span className="field-label">Tóm tắt thay đổi</span>
            <span className="mono muted">{diffPreview(entry.before, entry.after)}</span>
          </div>

          <div className="stack gap-1">
            <span className="field-label">Lý do ghi kèm</span>
            <span className="muted">{entry.reason || "Không ghi lý do"}</span>
          </div>

          {entry.isOutOfScopeOverride ? (
            <div className="alert alert-danger" role="note">
              <div className="stack gap-1">
                <strong>Thao tác ngoài phạm vi được cấp</strong>
                <span>
                  Bản ghi này đánh dấu một lần ghi đè có chủ đích. Kiểm tra lại lý do và
                  người thực hiện trước khi kết luận.
                </span>
              </div>
            </div>
          ) : null}

          <div className="divider" />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="stack gap-1">
              <span className="field-label">Giá trị trước</span>
              <pre
                className="mono muted"
                style={{
                  margin: 0,
                  padding: "var(--space-3)",
                  background: "var(--surface-inset)",
                  borderRadius: "var(--radius-control)",
                  maxHeight: 260,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 12,
                }}
              >
                {prettyValue(entry.before)}
              </pre>
            </div>
            <div className="stack gap-1">
              <span className="field-label">Giá trị sau</span>
              <pre
                className="mono muted"
                style={{
                  margin: 0,
                  padding: "var(--space-3)",
                  background: "var(--surface-inset)",
                  borderRadius: "var(--radius-control)",
                  maxHeight: 260,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 12,
                }}
              >
                {prettyValue(entry.after)}
              </pre>
            </div>
          </div>

          <p className="page-footnote">
            Trường nhạy cảm được máy chủ thay bằng “[đã ẩn]” ngay khi ghi, nên giá trị gốc
            không tồn tại trong nhật ký này. Bản ghi được ghi lúc{" "}
            <span className="tabular">{compactStamp(entry.createdAt)}</span> và không sửa
            hay xoá được.
          </p>
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>
    </>
  );
}
