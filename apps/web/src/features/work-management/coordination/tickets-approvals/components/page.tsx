"use client";

import { useMemo, useState } from "react";
import { REQUEST_CATEGORIES } from "../types";
import type { InboxEntry, RequestCategory } from "../types";
import { formatDate, money, remainingLabel } from "../format";
import { useApprovals, type Feedback } from "../hooks/use-approvals";
import { ReviewSheet } from "./review-sheet";
import {
  CloseGlyph,
  ClockGlyph,
  Pagination,
  SearchGlyph,
  SkeletonLines,
  SlaBadge,
  StatusBadge,
  StepBadge,
} from "./primitives";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

export function TicketsApprovalsPage() {
  const approvals = useApprovals();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [selected, setSelected] = useState<InboxEntry | null>(null);

  /* The inbox query has no text/category params, so these filters are local. */
  const visible = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase("vi");
    return approvals.items.filter((entry) => {
      if (category && entry.request.fields.category !== category) return false;
      if (!needle) return true;
      return (
        entry.request.code.toLocaleLowerCase("vi").includes(needle) ||
        entry.request.name.toLocaleLowerCase("vi").includes(needle) ||
        (entry.request.fields.requester ?? "").toLocaleLowerCase("vi").includes(needle)
      );
    });
  }, [approvals.items, term, category]);

  const filtersActive = Boolean(term || category);
  const overdue = approvals.items.filter((entry) => entry.step.sla === "OVERDUE").length;
  const dueSoon = approvals.items.filter((entry) => entry.step.sla === "DUE_SOON").length;
  const value = approvals.items.reduce(
    (sum, entry) => sum + (entry.request.fields.amount ?? 0),
    0,
  );
  const forbidden = approvals.error?.status === 403;
  const canApprove = approvals.can("approve");
  const total = approvals.data.total;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Điều phối công việc</p>
          <h1>Đề xuất &amp; phê duyệt</h1>
          <p className="page-lede">
            Hàng đợi các bước đang chờ bạn quyết định, sắp theo hạn xử lý. Mỗi quyết định
            ghi kèm ý kiến và đi tiếp quy trình; từ chối bắt buộc có lý do.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={approvals.reload}
            aria-busy={approvals.loading ? "true" : undefined}
          >
            Tải lại hàng đợi
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tình hình hàng đợi phê duyệt">
        <div className="metric">
          <span className="metric-value tabular">{total.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Bước chờ tôi duyệt</span>
          <span className="metric-note">theo máy chủ, trước khi lọc trên trang</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{overdue.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Quá hạn</span>
          <span className="metric-note">
            {approvals.items.length
              ? `${Math.round((overdue / approvals.items.length) * 100)}% trên trang này`
              : "chưa có dữ liệu"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{dueSoon.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Sắp tới hạn</span>
          <span className="metric-note">cần quyết định trong 24 giờ tới</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{money(value)}</span>
          <span className="metric-label">Giá trị đang chờ</span>
          <span className="metric-note">tổng số tiền trên trang này</span>
        </div>
      </section>

      {approvals.feedback ? (
        <div className={ALERT_TONE[approvals.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{approvals.feedback.message}</span>
            {approvals.feedback.hint ? (
              <span className="muted">{approvals.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => approvals.setFeedback(null)}
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
                  id="inbox-search"
                  className="input"
                  type="search"
                  value={term}
                  autoComplete="off"
                  placeholder="Lọc theo mã, tên, người gửi…"
                  aria-label="Lọc đề xuất trên trang này"
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

              <select
                className="select"
                value={category}
                aria-label="Lọc theo loại đề xuất trên trang này"
                onChange={(event) => setCategory(event.target.value as RequestCategory | "")}
                style={{ width: 176 }}
              >
                <option value="">Mọi loại đề xuất</option>
                {REQUEST_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {total.toLocaleString("vi-VN")} bước chờ · {approvals.items.length} hiển thị
                {filtersActive ? ` · ${visible.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
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
              {category ? (
                <span className="chip" data-active="true">
                  Loại: {category}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => setCategory("")}
                    aria-label="Bỏ lọc loại đề xuất"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setTerm("");
                  setCategory("");
                }}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem hàng đợi phê duyệt</span>
            <p className="empty-body">
              Phân hệ Đề xuất &amp; phê duyệt chỉ mở cho người có quyền “Xem”. Yêu cầu quản
              trị hệ thống cấp quyền rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={approvals.reload}>
              Tải lại
            </button>
          </div>
        ) : approvals.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được hàng đợi phê duyệt</span>
            <p className="empty-body">{approvals.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={approvals.reload}>
              Thử lại
            </button>
          </div>
        ) : approvals.loading ? (
          <div className="surface-body">
            <SkeletonLines rows={5} />
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {filtersActive
                ? "Không có đề xuất nào khớp bộ lọc"
                : approvals.items.length === 0 && total > 0
                  ? "Trang này không còn mục nào chờ bạn"
                  : "Không có đề xuất nào đang chờ bạn"}
            </span>
            <p className="empty-body">
              {filtersActive
                ? "Bộ lọc trên trang này không khớp đề xuất nào. Xoá bớt điều kiện để xem cả hàng đợi."
                : approvals.items.length === 0 && total > 0
                  ? "Các bước trước đây đã được quyết định. Về trang đầu để xem các bước còn lại theo hạn xử lý."
                  : "Hàng đợi trống. Khi có đề xuất tới bước của bạn, mục mới sẽ xuất hiện ở đây."}
            </p>
            {filtersActive ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setTerm("");
                  setCategory("");
                }}
              >
                Xoá bộ lọc
              </button>
            ) : approvals.items.length === 0 && total > 0 && approvals.page > 1 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => approvals.setPage(1)}
              >
                Về trang đầu
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={approvals.reload}>
                Tải lại hàng đợi
              </button>
            )}
          </div>
        ) : (
          <div className="list" aria-label="Đề xuất đang chờ quyết định">
            {visible.map((entry) => (
              <button
                key={entry.request.id}
                type="button"
                className="list-row"
                onClick={() => setSelected(entry)}
                aria-label={`Mở đề xuất ${entry.request.code} — ${entry.request.name}, bước ${entry.step.position}`}
              >
                <span className="list-main">
                  <span className="row items-center gap-2 wrap">
                    <span className="mono muted">{entry.request.code}</span>
                    <StatusBadge status={entry.request.status} />
                    <StepBadge status={entry.step.status} />
                  </span>
                  <strong>{entry.request.name}</strong>
                  <span className="list-meta">
                    {entry.request.fields.requester || "Chưa rõ người gửi"} ·{" "}
                    {entry.request.fields.category ?? "Khác"} ·{" "}
                    {money(entry.request.fields.amount)} · cần {formatDate(entry.request.date)}
                  </span>
                </span>

                <span className="stack gap-1 items-end" style={{ flex: "none" }}>
                  <span className="row items-center gap-2 wrap">
                    <span className="muted">
                      Bước {entry.step.position} · {entry.step.name}
                    </span>
                    <SlaBadge sla={entry.step.sla} />
                  </span>
                  <span className="row items-center gap-1 muted tabular">
                    <ClockGlyph />
                    {remainingLabel(entry.step.remainingMinutes)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {!forbidden && !approvals.error && total > 0 ? (
          <Pagination
            id="inbox"
            page={approvals.page}
            pageSize={approvals.pageSize}
            total={total}
            onPage={approvals.setPage}
            onPageSize={approvals.setPageSize}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Hàng đợi do máy chủ lọc theo người duyệt của từng bước; số “bước chờ” là tổng máy
        chủ trả về nên có thể lớn hơn số dòng hiển thị sau khi loại đề xuất bạn đã bỏ
        phiếu. Thời gian còn lại tính tại lúc tải trang — tải lại để cập nhật.
      </p>

      {selected ? (
        <ReviewSheet
          entry={selected}
          pending={approvals.pending === selected.request.id}
          canApprove={canApprove}
          onSubmit={(decision, note) => approvals.submit(selected, decision, note)}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {!canApprove && !forbidden ? (
        <p className="muted" role="note">
          Bạn chỉ xem được hàng đợi: quyền “Duyệt” chưa được cấp cho tài khoản này.
        </p>
      ) : null}
    </div>
  );
}
