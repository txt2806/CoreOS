"use client";

import { useMemo, useState } from "react";
import { CONVERSATION_STATUSES } from "../types";
import type { Conversation, ConversationStatus } from "../types";
import { formatDate, sortedComments, timeOf } from "../format";
import { useChat, type Feedback } from "../hooks/use-chat";
import { CreateConversationDialog } from "./create-dialog";
import { ConversationThread } from "./thread";
import {
  CloseGlyph,
  Pagination,
  PlusGlyph,
  SearchGlyph,
  SkeletonLines,
  StatusBadge,
} from "./primitives";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

export function InternalChatPage() {
  const chat = useChat();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtersActive = Boolean(chat.query.q || chat.query.status);

  /* Falls back to the first row so the reading pane is never empty for no reason. */
  const active: Conversation | null =
    chat.rows.find((row) => row.id === selectedId) ?? chat.rows[0] ?? null;

  const loadedMessages = useMemo(
    () => chat.rows.reduce((sum, row) => sum + (row.fields.comments?.length ?? 0), 0),
    [chat.rows],
  );

  const forbidden = chat.error?.status === 403;
  const canCreate = chat.can("create");
  const canWrite = chat.can("update");
  const open = chat.totals["Đang mở"];
  const closed = chat.totals["Đã đóng"];

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Điều phối công việc</p>
          <h1>Trao đổi nội bộ</h1>
          <p className="page-lede">
            Mạch trao đổi của từng ca vận hành: chọn một cuộc ở cột trái, đọc và gửi tin
            nhắn ở cột phải. Nội dung tin nhắn được lưu cùng cuộc trao đổi nên ai mở sau
            vẫn đọc được đầy đủ ngữ cảnh.
          </p>
        </div>
        <div className="page-actions">
          {canCreate ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <PlusGlyph />
              Mở cuộc trao đổi
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={chat.reload}
            aria-busy={chat.loading ? "true" : undefined}
          >
            Tải lại
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tình hình trao đổi nội bộ">
        <div className="metric">
          <span className="metric-value tabular">
            {chat.data.total.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Cuộc trao đổi</span>
          <span className="metric-note">tổng theo bộ lọc hiện tại</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {open === undefined ? "—" : open.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Đang mở</span>
          <span className="metric-note">
            {open === undefined ? "máy chủ chưa trả lời" : "còn nhận tin nhắn mới"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {closed === undefined ? "—" : closed.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Đã đóng</span>
          <span className="metric-note">
            {closed === undefined ? "máy chủ chưa trả lời" : "chỉ đọc, mở lại khi cần"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {loadedMessages.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Tin nhắn trên trang này</span>
          <span className="metric-note">đếm từ dữ liệu đã tải</span>
        </div>
      </section>

      {chat.feedback ? (
        <div className={ALERT_TONE[chat.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{chat.feedback.message}</span>
            {chat.feedback.hint ? (
              <span className="muted">{chat.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => chat.setFeedback(null)}
            aria-label="Đóng thông báo"
            style={{ marginLeft: "auto" }}
          >
            <CloseGlyph />
          </button>
        </div>
      ) : null}

      <div className="surface">
        <div className="surface-head">
          <div className="toolbar">
            <div className="toolbar-filters">
              <div className="search">
                <SearchGlyph />
                <input
                  id="chat-search"
                  className="input"
                  type="search"
                  value={chat.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo mã, tên, kênh…"
                  aria-label="Tìm cuộc trao đổi"
                  onChange={(event) => chat.patchQuery({ q: event.target.value, page: 1 })}
                />
                {chat.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => chat.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={chat.query.status ?? ""}
                aria-label="Lọc theo trạng thái cuộc trao đổi"
                onChange={(event) =>
                  chat.patchQuery({
                    status: event.target.value as ConversationStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 168 }}
              >
                <option value="">Mọi trạng thái</option>
                {CONVERSATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {chat.data.total.toLocaleString("vi-VN")} cuộc trao đổi ·{" "}
                {chat.rows.length} hiển thị
              </span>
            </div>
          </div>

          {filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {chat.query.q ? (
                <span className="chip" data-active="true">
                  Tìm: “{chat.query.q}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => chat.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {chat.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {chat.query.status}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => chat.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={chat.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem trao đổi nội bộ</span>
            <p className="empty-body">
              Phân hệ Trao đổi nội bộ chỉ mở cho người có quyền “Xem”. Yêu cầu quản trị hệ
              thống cấp quyền rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={chat.reload}>
              Tải lại
            </button>
          </div>
        ) : chat.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách trao đổi</span>
            <p className="empty-body">{chat.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={chat.reload}>
              Thử lại
            </button>
          </div>
        ) : chat.loading && chat.rows.length === 0 ? (
          <div className="surface-body">
            <SkeletonLines rows={6} />
          </div>
        ) : chat.rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {filtersActive
                ? "Không có cuộc trao đổi nào khớp bộ lọc"
                : chat.data.total > 0
                  ? "Trang này không còn cuộc trao đổi nào"
                  : "Chưa có cuộc trao đổi nào"}
            </span>
            <p className="empty-body">
              {filtersActive
                ? "Thử từ khoá khác hoặc bỏ lọc trạng thái để xem lại toàn bộ danh sách."
                : chat.data.total > 0
                  ? "Dữ liệu đã đổi sau lần tải trước. Về trang đầu để xem các cuộc đang mở."
                  : "Mở cuộc trao đổi đầu tiên để cả ca cùng đọc chung một mạch ghi chú."}
            </p>
            {filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={chat.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : chat.data.total > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => chat.patchQuery({ page: 1 })}
              >
                Về trang đầu
              </button>
            ) : canCreate ? (
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                <PlusGlyph />
                Mở cuộc trao đổi
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={chat.reload}>
                Tải lại
              </button>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div
              className="list"
              aria-label="Danh sách cuộc trao đổi"
              style={{ borderRight: "1px solid var(--line)", maxHeight: 640, overflowY: "auto" }}
            >
              {chat.rows.map((row) => {
                const comments = sortedComments(row.fields.comments ?? []);
                const last = comments[comments.length - 1];
                const isActive = active?.id === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="list-row"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setSelectedId(row.id)}
                    aria-label={`Mở cuộc trao đổi ${row.code} — ${row.name}`}
                    style={
                      isActive
                        ? { background: "var(--surface-inset)", boxShadow: "inset 3px 0 0 var(--accent)" }
                        : undefined
                    }
                  >
                    <span className="list-main">
                      <span className="row items-center gap-2 wrap">
                        <span className="mono muted">{row.code}</span>
                        <StatusBadge status={row.status} />
                      </span>
                      <strong className="truncate">{row.name}</strong>
                      <span className="list-meta truncate">
                        {last ? `${last.author}: ${last.text}` : "Chưa có tin nhắn nào"}
                      </span>
                    </span>
                    <span className="stack gap-1 items-end" style={{ flex: "none" }}>
                      <span className="muted tabular" style={{ fontSize: 12 }}>
                        {last ? timeOf(last.createdAt) : formatDate(row.date)}
                      </span>
                      <span className="muted tabular" style={{ fontSize: 12 }}>
                        {comments.length.toLocaleString("vi-VN")} tin
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {active ? (
              <ConversationThread
                conversation={active}
                author={chat.author}
                pending={chat.pending === active.id}
                canWrite={canWrite}
                onSend={chat.send}
                onToggleStatus={(conversation, status) => void chat.changeStatus(conversation, status)}
              />
            ) : (
              <div className="empty-state">
                <span className="empty-title">Chọn một cuộc trao đổi</span>
                <p className="empty-body">
                  Danh sách bên trái đang trống ở trang này. Chọn cuộc khác hoặc về trang đầu.
                </p>
              </div>
            )}
          </div>
        )}

        {!forbidden && !chat.error && chat.data.total > 0 ? (
          <Pagination
            id="chat"
            page={chat.data.page}
            pageSize={chat.data.pageSize}
            total={chat.data.total}
            onPage={(page) => chat.patchQuery({ page })}
            onPageSize={(size) => chat.patchQuery({ pageSize: size, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Máy chủ chưa mở kênh thời gian thực cho phân hệ này, nên danh sách được đọc lại khi
        bạn quay về tab và mỗi 30 giây. Tin nhắn bạn gửi hiện ngay và được đối chiếu lại
        sau khi lưu; nếu lưu lỗi, nội dung vẫn nằm trong ô soạn để gửi lại.
      </p>

      {!canWrite && !forbidden ? (
        <p className="muted" role="note">
          Bạn chỉ đọc được nội dung: quyền “Sửa” chưa được cấp nên ô soạn tin nhắn đang tắt.
        </p>
      ) : null}

      {creating ? (
        <CreateConversationDialog onCreate={chat.create} onClose={() => setCreating(false)} />
      ) : null}
    </div>
  );
}
