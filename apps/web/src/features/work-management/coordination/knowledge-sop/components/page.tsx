"use client";

import { useState } from "react";
import { NOTE_STATUSES } from "../types";
import type { KnowledgeNote, NoteStatus } from "../types";
import { excerpt, formatDate, formatDateTime, tagList } from "../format";
import { useKnowledge, type Feedback } from "../hooks/use-knowledge";
import { NoteForm } from "./note-form";
import { ReaderSheet } from "./reader-sheet";
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

export function KnowledgeSopPage() {
  const knowledge = useKnowledge();
  const [reading, setReading] = useState<KnowledgeNote | null>(null);
  const [editing, setEditing] = useState<KnowledgeNote | null>(null);
  const [creating, setCreating] = useState(false);

  const filtersActive = Boolean(knowledge.query.q || knowledge.query.status);
  const forbidden = knowledge.error?.status === 403;
  const published = knowledge.totals["Đã xuất bản"];
  const drafts = knowledge.totals["Bản nháp"];
  const archived = knowledge.totals["Lưu trữ"];

  /* Read status changes through the list rows so the sheet shows the optimistic value. */
  const live = reading
    ? knowledge.rows.find((row) => row.id === reading.id) ?? reading
    : null;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Điều phối công việc</p>
          <h1>Ghi chú &amp; quy trình chuẩn</h1>
          <p className="page-lede">
            Kho hướng dẫn dùng chung của ca vận hành. Tìm theo mã hoặc tên bài, mở bài để
            đọc toàn văn rồi xuất bản khi nội dung đã đủ để người khác làm theo.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <PlusGlyph />
            Viết bài mới
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={knowledge.reload}
            aria-busy={knowledge.loading ? "true" : undefined}
          >
            Tải lại
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tình hình kho tri thức">
        <div className="metric">
          <span className="metric-value tabular">
            {knowledge.data.total.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Bài trong kho</span>
          <span className="metric-note">theo bộ lọc hiện tại</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {published === undefined ? "—" : published.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Đã xuất bản</span>
          <span className="metric-note">
            {published === undefined ? "máy chủ chưa trả lời" : "sẵn sàng để tra cứu"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {drafts === undefined ? "—" : drafts.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Bản nháp</span>
          <span className="metric-note">
            {drafts === undefined ? "máy chủ chưa trả lời" : "còn đang soạn"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {archived === undefined ? "—" : archived.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Lưu trữ</span>
          <span className="metric-note">
            {archived === undefined ? "máy chủ chưa trả lời" : "còn đọc được, không còn hiện mặc định"}
          </span>
        </div>
      </section>

      {knowledge.feedback ? (
        <div className={ALERT_TONE[knowledge.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{knowledge.feedback.message}</span>
            {knowledge.feedback.hint ? (
              <span className="muted">{knowledge.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => knowledge.setFeedback(null)}
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
                  id="notes-search"
                  className="input"
                  type="search"
                  value={knowledge.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo mã hoặc tên bài…"
                  aria-label="Tìm bài trong kho tri thức"
                  onChange={(event) =>
                    knowledge.patchQuery({ q: event.target.value, page: 1 })
                  }
                />
                {knowledge.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => knowledge.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={knowledge.query.status ?? ""}
                aria-label="Lọc theo trạng thái bài"
                onChange={(event) =>
                  knowledge.patchQuery({
                    status: event.target.value as NoteStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 168 }}
              >
                <option value="">Mọi trạng thái</option>
                {NOTE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {knowledge.data.total.toLocaleString("vi-VN")} bài ·{" "}
                {knowledge.rows.length} hiển thị
              </span>
            </div>
          </div>

          {filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {knowledge.query.q ? (
                <span className="chip" data-active="true">
                  Tìm: “{knowledge.query.q}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => knowledge.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {knowledge.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {knowledge.query.status}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => knowledge.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={knowledge.clearFilters}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem kho tri thức</span>
            <p className="empty-body">
              Phân hệ Ghi chú &amp; SOP chỉ mở cho người có quyền “Xem”. Yêu cầu quản trị
              hệ thống cấp quyền rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={knowledge.reload}>
              Tải lại
            </button>
          </div>
        ) : knowledge.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được kho tri thức</span>
            <p className="empty-body">{knowledge.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={knowledge.reload}>
              Thử lại
            </button>
          </div>
        ) : knowledge.loading && knowledge.rows.length === 0 ? (
          <div className="surface-body">
            <SkeletonLines rows={5} />
          </div>
        ) : knowledge.rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {filtersActive
                ? "Không có bài nào khớp bộ lọc"
                : knowledge.data.total > 0
                  ? "Trang này không còn bài nào"
                  : "Kho tri thức đang trống"}
            </span>
            <p className="empty-body">
              {filtersActive
                ? "Thử từ khoá khác hoặc bỏ lọc trạng thái để xem lại toàn bộ kho."
                : knowledge.data.total > 0
                  ? "Dữ liệu đã đổi sau lần tải trước. Về trang đầu để xem các bài còn lại."
                  : "Viết bài đầu tiên để ca sau không phải hỏi lại quy trình đã thống nhất."}
            </p>
            {filtersActive ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={knowledge.clearFilters}
              >
                Xoá bộ lọc
              </button>
            ) : knowledge.data.total > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => knowledge.patchQuery({ page: 1 })}
              >
                Về trang đầu
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                <PlusGlyph />
                Viết bài mới
              </button>
            )}
          </div>
        ) : (
          <div className="list" aria-label="Danh sách bài trong kho tri thức">
            {knowledge.rows.map((note) => (
              <button
                key={note.id}
                type="button"
                className="list-row"
                onClick={() => setReading(note)}
                aria-label={`Đọc bài ${note.code} — ${note.name}`}
              >
                <span className="list-main">
                  <span className="row items-center gap-2 wrap">
                    <span className="mono muted">{note.code}</span>
                    <StatusBadge status={note.status} />
                    {note.fields.category ? (
                      <span className="chip">{note.fields.category}</span>
                    ) : null}
                  </span>
                  <strong>{note.name}</strong>
                  <span className="list-meta">{excerpt(note.fields)}</span>
                  <span className="list-meta">
                    {note.assignee || "Chưa gán người phụ trách"}
                    {note.scope ? ` · ${note.scope}` : ""}
                    {tagList(note.fields).length > 0
                      ? ` · ${tagList(note.fields).join(", ")}`
                      : ""}
                  </span>
                </span>

                <span className="stack gap-1 items-end" style={{ flex: "none" }}>
                  <span className="muted tabular" style={{ fontSize: 12 }}>
                    {formatDate(note.date)}
                  </span>
                  <span className="muted tabular" style={{ fontSize: 12 }}>
                    sửa {formatDateTime(note.updatedAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {!forbidden && !knowledge.error && knowledge.total > 0 ? (
          <Pagination
            id="notes"
            page={knowledge.data.page}
            pageSize={knowledge.data.pageSize}
            total={knowledge.total}
            onPage={(page) => knowledge.patchQuery({ page })}
            onPageSize={(size) => knowledge.patchQuery({ pageSize: size, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Mỗi bài là một bản ghi duy nhất: máy chủ chưa mở endpoint lịch sử phiên bản, luồng
        duyệt hai người hay gắn Task/Project, nên màn hình chỉ hiển thị nội dung và trạng
        thái hiện tại. Nội dung lưu dạng văn bản thuần và được hiển thị nguyên văn, không
        render HTML.
      </p>

      {live ? (
        <ReaderSheet
          note={live}
          pending={knowledge.pending === live.id}
          onEdit={() => {
            setEditing(live);
            setReading(null);
          }}
          onStatus={(status) => void knowledge.changeStatus(live, status)}
          onDelete={async () => {
            await knowledge.remove(live);
            setReading(null);
          }}
          onClose={() => setReading(null)}
        />
      ) : null}

      {creating ? (
        <NoteForm
          note={null}
          onCreate={knowledge.create}
          onUpdate={knowledge.save}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editing ? (
        <NoteForm
          note={editing}
          onCreate={knowledge.create}
          onUpdate={knowledge.save}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
