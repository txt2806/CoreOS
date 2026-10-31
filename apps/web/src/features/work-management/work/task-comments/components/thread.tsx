"use client";

import { useCallback, useEffect, useState } from "react";
import { addComment, listComments } from "../api/client";
import type { TaskComment } from "../types";

function stamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Thread for one task. It owns its own data so the tasks screen stays a pure
 * composition of two features.
 */
export function CommentThread({ taskId, canComment }: { taskId: string; canComment: boolean }) {
  const [items, setItems] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listComments(taskId)
      .then((page) => setItems(page.items))
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Không tải được trao đổi."),
      )
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(load, [load]);

  const submit = async () => {
    const body = draft.trim();
    if (body.length === 0) {
      setNotice("Nhập nội dung trao đổi trước khi gửi.");
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const created = await addComment(taskId, body);
      setItems((current) => [...current, created]);
      setDraft("");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Chưa gửi được trao đổi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="stack gap-3" aria-label="Trao đổi của công việc">
      <div className="spread items-center">
        <h3 className="surface-title">Trao đổi</h3>
        <span className="muted tabular">{items.length} nội dung</span>
      </div>

      {loading ? (
        <div className="stack gap-2" aria-busy="true">
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line" style={{ width: "70%" }} />
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="muted">
          Chưa có trao đổi nào. Ghi lại quyết định hoặc câu hỏi để người sau không phải
          đoán.
        </p>
      ) : (
        <ul className="list" aria-live="polite">
          {items.map((comment) => (
            <li key={comment.id} className="stack gap-1 py-2">
              <div className="row items-center gap-2">
                <span className="avatar avatar-sm" aria-hidden="true">
                  {comment.author.slice(0, 1).toUpperCase()}
                </span>
                <strong>{comment.author}</strong>
                {comment.kind === "SYSTEM" ? (
                  <span className="badge">Hệ thống</span>
                ) : null}
                <span className="muted">{stamp(comment.createdAt)}</span>
              </div>
              <p className="list-main">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <div className="field">
          <label className="field-label" htmlFor={`comment-${taskId}`}>
            Nội dung trao đổi
            <span className="field-hint">{draft.length}/4000</span>
          </label>
          <textarea
            id={`comment-${taskId}`}
            className="textarea"
            rows={3}
            maxLength={4000}
            value={draft}
            placeholder="Ví dụ: Đã chốt phương án với khách hàng, cần bổ sung test hồi quy."
            onChange={(event) => setDraft(event.target.value)}
          />
          {notice ? (
            <span className="field-error" role="alert">
              {notice}
            </span>
          ) : null}
          <div className="row justify-end">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={submit}
              disabled={sending}
              aria-busy={sending ? "true" : undefined}
            >
              {sending ? "Đang gửi…" : "Gửi trao đổi"}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">
          Bạn không có quyền bình luận công việc này. Liên hệ quản trị hệ thống nếu cần.
        </p>
      )}
    </section>
  );
}
