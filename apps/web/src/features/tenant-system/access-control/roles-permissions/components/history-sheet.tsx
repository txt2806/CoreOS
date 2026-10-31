"use client";

import { useEffect, useId, useRef } from "react";
import { ACTION_LABELS, HISTORY_LIMIT_NOTE, ROLE_LABELS } from "../constants";
import { formatDateTime } from "../format";
import type { PermissionAction, PermissionChangeEntry } from "../types";
import { ClockGlyph, CloseGlyph } from "./primitives";

function labelsOf(actions: PermissionAction[]): string {
  return actions.length === 0
    ? "không quyền nào"
    : actions.map((action) => ACTION_LABELS[action]).join(", ");
}

export function HistorySheet({
  items,
  error,
  loading,
  labelOf,
  onRetry,
  onClose,
}: {
  items: PermissionChangeEntry[] | null;
  error: string | null;
  loading: boolean;
  labelOf: (featureKey: string) => string;
  onRetry: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">Nhật ký quyền</span>
            <h2 className="page-heading" id={titleId}>
              Lịch sử thay đổi quyền
            </h2>
            <span className="muted">{HISTORY_LIMIT_NOTE}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-icon"
            aria-label="Đóng lịch sử thay đổi"
            onClick={onClose}
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {error ? (
            <div className="alert alert-danger" role="alert">
              <span>{error}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                Thử lại
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="stack gap-3" aria-busy="true" aria-live="polite">
              <span className="sr-only">Đang tải lịch sử thay đổi quyền…</span>
              {[0, 1, 2].map((row) => (
                <div key={row} className="skeleton skeleton-row" aria-hidden="true" />
              ))}
            </div>
          ) : items === null ? null : items.length === 0 ? (
            <div className="empty-state">
              <span className="empty-title">Chưa có thay đổi nào</span>
              <p className="empty-body">
                Ma trận đang giữ nguyên bộ quyền mặc định. Lần lưu đầu tiên sẽ xuất hiện ở đây kèm
                tên người thực hiện.
              </p>
            </div>
          ) : (
            <ol className="timeline">
              {items.map((entry) => {
                const added = entry.toActions.filter((action) => !entry.fromActions.includes(action));
                const removed = entry.fromActions.filter((action) => !entry.toActions.includes(action));
                return (
                  <li key={entry.id} className="stack gap-1">
                    <div className="row wrap items-center gap-2">
                      <strong>{labelOf(entry.featureKey)}</strong>
                      <span className="badge">
                        <span className="dot" aria-hidden="true" />
                        {ROLE_LABELS[entry.role]}
                      </span>
                    </div>
                    <span className="muted tabular">{formatDateTime(entry.createdAt)}</span>
                    <div className="row wrap items-center gap-2">
                      {added.map((action) => (
                        <span key={`add-${action}`} className="badge badge-success">
                          <span className="dot" aria-hidden="true" />
                          Thêm {ACTION_LABELS[action]}
                        </span>
                      ))}
                      {removed.map((action) => (
                        <span key={`remove-${action}`} className="badge badge-danger">
                          <span className="dot" aria-hidden="true" />
                          Bỏ {ACTION_LABELS[action]}
                        </span>
                      ))}
                      {added.length === 0 && removed.length === 0 ? (
                        <span className="muted">Không đổi hành động, chỉ ghi nhận phiên bản mới.</span>
                      ) : null}
                    </div>
                    <span className="muted">
                      {entry.actorName} · từ {labelsOf(entry.fromActions)} sang{" "}
                      {labelsOf(entry.toActions)}
                    </span>
                    {entry.reason ? <p className="list-main">{entry.reason}</p> : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="sheet-foot">
          <span className="muted row items-center gap-2">
            <ClockGlyph />
            Mọi thay đổi quyền đều được ghi nhật ký kiểm toán.
          </span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>
    </>
  );
}
