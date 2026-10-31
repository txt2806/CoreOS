"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NOTIFICATION_SOURCES } from "../types";
import type { NotificationItem, NotificationSource } from "../types";
import { SOURCE_LABEL } from "../constants";
import { excerpt, formatDateTime, relativeTime, safeLink } from "../format";
import { useNotifications, type Feedback } from "../hooks/use-notifications";
import {
  ArrowGlyph,
  BellGlyph,
  CheckGlyph,
  CloseGlyph,
  Pagination,
  ReadBadge,
  SearchGlyph,
  SkeletonLines,
  SourceBadge,
  TrashGlyph,
} from "./primitives";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

export function NotificationsPage() {
  const inbox = useNotifications();
  const [term, setTerm] = useState("");
  const [source, setSource] = useState<NotificationSource | "">("");

  /* `q` and `source` have no server params — the list route only filters by
     recipient and unread, so these two are honest client-side filters. */
  const visible = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase("vi");
    return inbox.rows.filter((item) => {
      if (source && item.source !== source) return false;
      if (!needle) return true;
      return (
        item.title.toLocaleLowerCase("vi").includes(needle) ||
        item.body.toLocaleLowerCase("vi").includes(needle)
      );
    });
  }, [inbox.rows, term, source]);

  const filtersActive = Boolean(term || source || inbox.query.unread);
  const readCount = inbox.rows.filter((item) => item.readAt).length;
  const forbidden = inbox.error?.status === 403;
  const noSession = inbox.sessionProblem !== null;

  const clearAll = () => {
    setTerm("");
    setSource("");
    inbox.clearFilters();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Điều phối công việc</p>
          <h1>Thông báo</h1>
          <p className="page-lede">
            Mọi việc cần bạn biết, gộp từ công việc, bình luận, tin nhắn, cuộc họp và đề
            xuất. Đọc xong thì đánh dấu đã đọc để số chưa đọc phản ánh đúng việc còn tồn.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={inbox.markAll}
            disabled={inbox.unreadTotal === 0 || inbox.pending === "all"}
            aria-busy={inbox.pending === "all" ? "true" : undefined}
          >
            <CheckGlyph />
            {inbox.pending === "all" ? "Đang cập nhật…" : "Đánh dấu tất cả đã đọc"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={inbox.reload}
            aria-busy={inbox.loading ? "true" : undefined}
          >
            Tải lại
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tình hình thông báo">
        <div className="metric">
          <span className="metric-value tabular">
            {inbox.unreadTotal.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Chưa đọc</span>
          <span className="metric-note">toàn bộ thông báo của bạn</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {inbox.data.total.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Thông báo trong hộp</span>
          <span className="metric-note">
            {inbox.query.unread ? "đang lọc chỉ chưa đọc" : "gồm cả đã đọc"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {inbox.unreadOnPage.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Chưa đọc trên trang này</span>
          <span className="metric-note">đếm từ dữ liệu đã tải</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{readCount.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Đã đọc trên trang này</span>
          <span className="metric-note">đếm từ dữ liệu đã tải</span>
        </div>
      </section>

      {inbox.feedback ? (
        <div className={ALERT_TONE[inbox.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{inbox.feedback.message}</span>
            {inbox.feedback.hint ? (
              <span className="muted">{inbox.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => inbox.setFeedback(null)}
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
                  id="notice-search"
                  className="input"
                  type="search"
                  value={term}
                  autoComplete="off"
                  placeholder="Lọc theo tiêu đề, nội dung…"
                  aria-label="Lọc thông báo trên trang này"
                  onChange={(event) => setTerm(event.target.value)}
                />
                {term ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => setTerm("")}
                    aria-label="Xoá từ khoá lọc"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <div className="segmented" role="group" aria-label="Lọc theo trạng thái đọc">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={inbox.query.unread ? "false" : "true"}
                  onClick={() => inbox.patchQuery({ unread: false, page: 1 })}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={inbox.query.unread ? "true" : "false"}
                  onClick={() => inbox.patchQuery({ unread: true, page: 1 })}
                >
                  Chưa đọc
                </button>
              </div>

              <select
                className="select"
                value={source}
                aria-label="Lọc theo nguồn thông báo trên trang này"
                onChange={(event) => setSource(event.target.value as NotificationSource | "")}
                style={{ width: 168 }}
              >
                <option value="">Mọi nguồn</option>
                {NOTIFICATION_SOURCES.map((item) => (
                  <option key={item} value={item}>
                    {SOURCE_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="badge">
                <span className="dot" />
                {inbox.live ? "Đang nhận trực tiếp" : "Làm mới mỗi phút"}
              </span>
              <span className="result-count">
                {inbox.data.total.toLocaleString("vi-VN")} thông báo ·{" "}
                {visible.length} hiển thị
              </span>
            </div>
          </div>

          {filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {inbox.query.unread ? (
                <span className="chip" data-active="true">
                  Chỉ chưa đọc
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => inbox.patchQuery({ unread: false, page: 1 })}
                    aria-label="Bỏ lọc chưa đọc"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {term ? (
                <span className="chip" data-active="true">
                  Lọc: “{term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => setTerm("")}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {source ? (
                <span className="chip" data-active="true">
                  Nguồn: {SOURCE_LABEL[source]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => setSource("")}
                    aria-label="Bỏ lọc nguồn"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem thông báo</span>
            <p className="empty-body">
              Phân hệ Thông báo chỉ mở cho người có quyền “Xem”. Yêu cầu quản trị hệ thống
              cấp quyền rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={inbox.reload}>
              Tải lại
            </button>
          </div>
        ) : noSession ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không xác định được người nhận thông báo</span>
            <p className="empty-body">
              {inbox.sessionProblem?.message ??
                "Phiên đăng nhập không còn hiệu lực nên không đọc được hộp thông báo."}
            </p>
            <button type="button" className="btn btn-primary" onClick={inbox.reload}>
              Thử lại
            </button>
          </div>
        ) : inbox.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được thông báo</span>
            <p className="empty-body">{inbox.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={inbox.reload}>
              Thử lại
            </button>
          </div>
        ) : inbox.loading && inbox.rows.length === 0 ? (
          <div className="surface-body">
            <SkeletonLines rows={6} />
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {filtersActive
                ? "Không có thông báo nào khớp bộ lọc"
                : inbox.data.total > 0
                  ? "Trang này không còn thông báo nào"
                  : "Hộp thông báo đang trống"}
            </span>
            <p className="empty-body">
              {filtersActive
                ? "Bỏ lọc chưa đọc hoặc đổi từ khoá để xem lại toàn bộ hộp thông báo."
                : inbox.data.total > 0
                  ? "Dữ liệu đã đổi sau lần tải trước. Về trang đầu để xem các thông báo còn lại."
                  : "Khi có việc cần bạn xử lý, thông báo sẽ xuất hiện ở đây và tự cập nhật."}
            </p>
            {filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={clearAll}>
                Xoá bộ lọc
              </button>
            ) : inbox.data.total > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => inbox.patchQuery({ page: 1 })}
              >
                Về trang đầu
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={inbox.reload}>
                <BellGlyph />
                Tải lại hộp thông báo
              </button>
            )}
          </div>
        ) : (
          <ul
            className="list"
            aria-label="Danh sách thông báo"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {visible.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                pending={inbox.pending === item.id}
                onRead={() => inbox.markReadItem(item)}
                onRemove={() => inbox.remove(item)}
              />
            ))}
          </ul>
        )}

        {!forbidden && !inbox.error && inbox.data.total > 0 ? (
          <Pagination
            id="notices"
            page={inbox.data.page}
            pageSize={inbox.data.pageSize}
            total={inbox.data.total}
            onPage={(page) => inbox.patchQuery({ page })}
            onPageSize={(size) => inbox.patchQuery({ pageSize: size, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Máy chủ lọc thông báo theo đúng mã nhân viên của phiên đăng nhập; hộp này không
        hiển thị thông báo đã bị xoá. Trang mở luồng sự kiện trực tiếp của máy chủ — nếu
        trình duyệt không giữ được luồng, danh sách tự làm mới mỗi phút. Bộ lọc từ khoá và
        nguồn chỉ áp dụng trên trang đang tải, không phải toàn hệ thống.
      </p>
    </div>
  );
}

function NotificationRow({
  item,
  pending,
  onRead,
  onRemove,
}: {
  item: NotificationItem;
  pending: boolean;
  onRead: () => void;
  onRemove: () => void;
}) {
  const href = safeLink(item.link);
  const unread = !item.readAt;

  return (
    <li
      className="list-row"
      style={unread ? { boxShadow: "inset 3px 0 0 var(--accent)" } : undefined}
    >
      <div className="list-main">
        <div className="row wrap items-center gap-2">
          <SourceBadge source={item.source} />
          <ReadBadge read={!unread} />
          <span className="muted tabular" style={{ fontSize: 12 }}>
            {formatDateTime(item.createdAt)} · {relativeTime(item.createdAt)}
          </span>
        </div>
        {href ? (
          <Link className="link" href={href} onClick={onRead}>
            <strong>{item.title}</strong>
          </Link>
        ) : (
          <strong>{item.title}</strong>
        )}
        <span className="list-meta">{excerpt(item.body)}</span>
      </div>

      <div className="row items-center gap-2" style={{ flex: "none" }}>
        {unread ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onRead}
            disabled={pending}
            aria-busy={pending ? "true" : undefined}
            aria-label={`Đánh dấu đã đọc: ${item.title}`}
          >
            <CheckGlyph />
            Đã đọc
          </button>
        ) : null}
        {href ? (
          <Link
            className="btn btn-ghost btn-sm"
            href={href}
            onClick={onRead}
            aria-label={`Mở nội dung liên quan: ${item.title}`}
          >
            <ArrowGlyph />
            Mở
          </Link>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onRemove}
          disabled={pending}
          aria-label={`Xoá thông báo: ${item.title}`}
        >
          <TrashGlyph />
        </button>
      </div>
    </li>
  );
}
