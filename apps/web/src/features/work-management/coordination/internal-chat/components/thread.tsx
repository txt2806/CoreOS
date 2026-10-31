"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { COMMENT_LIMIT } from "../constants";
import type { ChatComment, Conversation, ConversationStatus } from "../types";
import { dayLabel, initials, sortedComments, timeOf } from "../format";
import { SendGlyph, StatusBadge } from "./primitives";

interface ThreadProps {
  conversation: Conversation;
  author: string | null;
  pending: boolean;
  canWrite: boolean;
  onSend: (conversation: Conversation, text: string) => Promise<boolean>;
  onToggleStatus: (conversation: Conversation, status: ConversationStatus) => void;
}

type Entry = { kind: "day"; key: string; label: string } | { kind: "message"; key: string; comment: ChatComment };

/** Day dividers keep a long thread readable without repeating the date per message. */
function buildEntries(comments: ChatComment[]): Entry[] {
  const entries: Entry[] = [];
  let lastDay = "";
  for (const comment of sortedComments(comments)) {
    const day = comment.createdAt.slice(0, 10);
    if (day !== lastDay) {
      lastDay = day;
      entries.push({ kind: "day", key: `day-${day}`, label: dayLabel(comment.createdAt) });
    }
    entries.push({ kind: "message", key: comment.id, comment });
  }
  return entries;
}

export function ConversationThread({
  conversation,
  author,
  pending,
  canWrite,
  onSend,
  onToggleStatus,
}: ThreadProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const composerId = useId();
  const logRef = useRef<HTMLDivElement | null>(null);

  const comments = useMemo(() => conversation.fields.comments ?? [], [conversation.fields.comments]);
  const entries = useMemo(() => buildEntries(comments), [comments]);
  const closed = conversation.status === "Đã đóng";
  const overLimit = draft.length > COMMENT_LIMIT;

  /* A new message lands at the bottom; without this the reader has to scroll. */
  useEffect(() => {
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [conversation.id, comments.length]);

  useEffect(() => setDraft(""), [conversation.id]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || busy || closed || !canWrite || !author || overLimit) return;
    setBusy(true);
    const ok = await onSend(conversation, body);
    if (ok) setDraft("");
    setBusy(false);
  };

  const hint = closed
    ? "Cuộc trao đổi đã đóng. Mở lại để gửi tin nhắn tiếp theo."
    : !canWrite
      ? "Bạn chỉ được đọc cuộc trao đổi này."
      : !author
        ? "Chưa xác định được người dùng nên chưa thể gửi tin nhắn."
        : "Enter để gửi · Shift+Enter để xuống dòng";

  const disabled = busy || pending || closed || !canWrite || !author || !draft.trim() || overLimit;

  return (
    <div className="stack gap-0">
      <div
        className="spread wrap gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="stack gap-1" style={{ minWidth: 0 }}>
          <div className="row wrap items-center gap-2">
            <strong className="truncate">{conversation.name}</strong>
            <StatusBadge status={conversation.status} />
          </div>
          <div className="row wrap items-center gap-2 muted" style={{ fontSize: 12 }}>
            <span className="mono">{conversation.code}</span>
            <span aria-hidden="true">·</span>
            <span>
              {conversation.fields.channel ? `Kênh ${conversation.fields.channel}` : "Chưa đặt kênh"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular">
              {conversation.fields.participants || "Chưa ghi người tham gia"}
            </span>
          </div>
        </div>

        {canWrite ? (
          <div className="toolbar-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onToggleStatus(conversation, closed ? "Đang mở" : "Đã đóng")}
              disabled={pending}
              aria-busy={pending ? "true" : undefined}
            >
              {closed ? "Mở lại cuộc trao đổi" : "Đóng cuộc trao đổi"}
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={logRef}
        role="log"
        aria-label={`Tin nhắn của ${conversation.name}`}
        className="stack gap-4 px-4 py-4"
        style={{ maxHeight: 480, overflowY: "auto" }}
      >
        {entries.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">Chưa có tin nhắn nào</p>
            <p className="empty-body">
              Gửi tin nhắn đầu tiên để người tham gia nhận được ngữ cảnh của cuộc trao đổi.
            </p>
          </div>
        ) : (
          entries.map((entry) =>
            entry.kind === "day" ? (
              <p key={entry.key} className="subtle tabular" style={{ fontSize: 12, margin: 0 }}>
                {entry.label}
              </p>
            ) : (
              <MessageBubble
                key={entry.key}
                comment={entry.comment}
                mine={author !== null && entry.comment.author === author}
              />
            ),
          )
        )}
      </div>

      <div
        className="stack gap-2 px-4 py-3"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <label className="sr-only" htmlFor={composerId}>
          Nội dung tin nhắn
        </label>
        <textarea
          id={composerId}
          className="textarea"
          rows={2}
          value={draft}
          placeholder={closed ? "Cuộc trao đổi đã đóng" : "Viết tin nhắn…"}
          aria-describedby={`${composerId}-hint`}
          aria-invalid={overLimit ? "true" : undefined}
          disabled={closed || !canWrite || !author}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            /* Enter sends; Shift+Enter keeps the newline users expect in notes. */
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <div className="spread wrap gap-2">
          <span className="muted" id={`${composerId}-hint`} style={{ fontSize: 12 }}>
            {hint}
            {overLimit ? ` · Vượt quá ${COMMENT_LIMIT} ký tự` : ""}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void submit()}
            disabled={disabled}
            aria-busy={busy || pending ? "true" : undefined}
          >
            <SendGlyph />
            {busy || pending ? "Đang gửi…" : "Gửi"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  comment,
  mine,
}: {
  comment: ChatComment;
  mine: boolean;
}) {
  return (
    <div className="row items-end gap-2" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
      {!mine ? (
        <span className="avatar avatar-sm" aria-hidden="true">
          {initials(comment.author)}
        </span>
      ) : null}
      <div className="stack gap-1" style={{ maxWidth: "76%", alignItems: mine ? "flex-end" : "flex-start" }}>
        <div className="row items-center gap-2">
          <span className="subtle" style={{ fontSize: 12 }}>
            {mine ? "Bạn" : comment.author}
          </span>
          <span className="muted tabular" style={{ fontSize: 12 }}>
            {timeOf(comment.createdAt)}
          </span>
        </div>
        <p
          className="rounded-xl px-3 py-2"
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            background: mine ? "var(--accent)" : "var(--surface-inset)",
            color: mine ? "var(--accent-foreground)" : "var(--foreground)",
          }}
        >
          {comment.text}
        </p>
      </div>
    </div>
  );
}
