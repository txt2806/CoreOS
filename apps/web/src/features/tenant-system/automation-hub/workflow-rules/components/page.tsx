"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "../api/client";
import { ORDER_NOTE, TRIGGER_LABELS, TRIGGERS } from "../constants";
import type { EnabledFilter } from "../hooks/use-rules";
import { useRules } from "../hooks/use-rules";
import type { Rule, RuleInput } from "../types";
import {
  AlertGlyph,
  CloseGlyph,
  Confirm,
  Pagination,
  PlusGlyph,
  SearchGlyph,
} from "./primitives";
import { RuleDialog } from "./rule-dialogs";
import { RunSheet } from "./run-sheet";
import { SessionBanner } from "./session-banner";
import { RuleTable } from "./table";

const ENABLED_FILTERS: readonly { value: EnabledFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "enabled", label: "Đang bật" },
  { value: "disabled", label: "Đang tắt" },
];

type DialogState = { mode: "create" } | { mode: "edit"; rule: Rule } | null;

export function WorkflowRulesPage() {
  const rules = useRules();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [runRule, setRunRule] = useState<Rule | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setDialogError(null);
    setDialog({ mode: "create" });
  };

  const openEdit = (rule: Rule) => {
    setDialogError(null);
    setDialog({ mode: "edit", rule });
  };

  const save = async (input: RuleInput) => {
    if (!dialog) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      if (dialog.mode === "edit") {
        await rules.update(dialog.rule.id, { ...input, version: dialog.rule.version });
      } else {
        await rules.create(input);
      }
      setDialog(null);
    } catch (caught) {
      setDialogError(
        caught instanceof ApiError ? caught.message : "Chưa lưu được quy tắc. Thử lại giúp mình.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await rules.remove(deleting);
      setDeleting(null);
    } catch (caught) {
      setDeleteError(
        caught instanceof ApiError ? caught.message : "Chưa xoá được quy tắc. Thử lại giúp mình.",
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const unauthorized = rules.error?.status === 401;
  const forbidden = rules.error?.status === 403;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Tự động hoá</p>
          <h1>Quy tắc tự động</h1>
          <p className="page-lede">
            Khi một công việc được tạo hoặc cập nhật, quy tắc khớp điều kiện sẽ được áp dụng theo thứ
            tự. Mọi lượt chạy đều được ghi lại kèm lý do khớp hoặc bỏ qua.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={rules.reload}
            disabled={rules.loading}
          >
            Tải lại
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <PlusGlyph />
            Tạo quy tắc
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tổng quan quy tắc tự động">
        <div className="metric">
          <span className="metric-value tabular">
            {rules.loadingTotal.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Quy tắc</span>
          <span className="metric-note">trong toàn hệ thống</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {rules.enabledCount.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Đang bật</span>
          <span className="metric-note">
            {rules.disabledCount.toLocaleString("vi-VN")} quy tắc đang tắt
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{rules.applied.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Lượt đã áp dụng</span>
          <span className="metric-note">tính từ khi hệ thống chạy</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{rules.skipped.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Lượt bỏ qua</span>
          <span className="metric-note">khớp nhưng không có hành động</span>
        </div>
      </section>

      <SessionBanner />

      <div className="stack gap-2" aria-live="polite">
        {rules.feedback ? (
          <div
            className={
              rules.feedback.tone === "error"
                ? "alert alert-danger"
                : rules.feedback.tone === "warning"
                  ? "alert alert-warning"
                  : rules.feedback.tone === "success"
                    ? "alert alert-success"
                    : "alert"
            }
            role={rules.feedback.tone === "error" ? "alert" : "status"}
          >
            <AlertGlyph />
            <div className="stack gap-1">
              <span>{rules.feedback.message}</span>
              {rules.feedback.hint ? <span className="muted">{rules.feedback.hint}</span> : null}
            </div>
            <button
              type="button"
              className="btn btn-icon"
              aria-label="Đóng thông báo"
              onClick={() => rules.setFeedback(null)}
              style={{ marginLeft: "auto" }}
            >
              <CloseGlyph />
            </button>
          </div>
        ) : null}
      </div>

      <section className="surface" aria-label="Danh sách quy tắc tự động">
        <div className="surface-head">
          <div className="toolbar">
            <div className="toolbar-filters">
              <div className="search">
                <SearchGlyph />
                <input
                  id="rule-search"
                  className="input"
                  type="search"
                  value={rules.q}
                  autoComplete="off"
                  placeholder="Tìm theo tên hoặc mô tả…"
                  aria-label="Tìm quy tắc"
                  onChange={(event) => rules.setQ(event.target.value)}
                />
                {rules.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => rules.setQ("")}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <label className="sr-only" htmlFor="rule-trigger-filter">
                Lọc theo thời điểm chạy
              </label>
              <select
                id="rule-trigger-filter"
                className="select"
                value={rules.trigger}
                onChange={(event) =>
                  rules.setTrigger(TRIGGERS.find((item) => item === event.target.value) ?? "")
                }
                style={{ width: 172 }}
              >
                <option value="">Mọi thời điểm</option>
                {TRIGGERS.map((item) => (
                  <option key={item} value={item}>
                    {TRIGGER_LABELS[item]}
                  </option>
                ))}
              </select>

              <div className="segmented" role="group" aria-label="Lọc theo trạng thái">
                {ENABLED_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="segment"
                    aria-pressed={rules.statusFilter === item.value}
                    onClick={() => rules.setStatusFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="toolbar-actions">
              <span className="result-count">
                {rules.total.toLocaleString("vi-VN")} quy tắc
                {rules.filtersActive ? ` · ${rules.visible.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {rules.filtersActive ? (
            <div className="row wrap items-center gap-2 px-4 pb-3">
              {rules.q.trim() ? (
                <span className="chip" data-active="true">
                  Từ khoá: {rules.q.trim()}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label="Bỏ từ khoá tìm kiếm"
                    onClick={() => rules.setQ("")}
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {rules.trigger ? (
                <span className="chip" data-active="true">
                  {TRIGGER_LABELS[rules.trigger]}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label="Bỏ lọc thời điểm"
                    onClick={() => rules.setTrigger("")}
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {rules.statusFilter !== "all" ? (
                <span className="chip" data-active="true">
                  {rules.statusFilter === "enabled" ? "Đang bật" : "Đang tắt"}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label="Bỏ lọc trạng thái"
                    onClick={() => rules.setStatusFilter("all")}
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={rules.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {unauthorized || forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">
              {unauthorized ? "Phiên đăng nhập đã hết hạn" : "Bạn chưa được cấp quyền xem quy tắc"}
            </span>
            <p className="empty-body">
              {unauthorized
                ? "Đăng nhập lại để tiếp tục. Nội dung đang sửa trong hộp thoại sẽ mất khi tải lại."
                : "Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Quy tắc tự động rồi tải lại trang."}
            </p>
            {unauthorized ? (
              <Link className="btn btn-primary" href="/tenant-system/auth">
                Đăng nhập
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={rules.reload}>
                Thử lại
              </button>
            )}
          </div>
        ) : rules.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách quy tắc</span>
            <p className="empty-body">{rules.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={rules.reload}>
              Thử lại
            </button>
          </div>
        ) : rules.loading ? (
          <div className="surface-body stack gap-2" aria-busy="true">
            <span className="sr-only">Đang tải danh sách quy tắc…</span>
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="skeleton skeleton-row" aria-hidden="true" />
            ))}
          </div>
        ) : rules.total === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {rules.filtersActive
                ? "Không có quy tắc nào khớp bộ lọc"
                : "Chưa có quy tắc tự động nào"}
            </span>
            <p className="empty-body">
              {rules.filtersActive
                ? "Thử từ khoá ngắn hơn hoặc bỏ lọc trạng thái để xem toàn bộ danh sách."
                : "Tạo quy tắc đầu tiên để hệ thống tự giao việc, chuyển trạng thái hoặc gửi thông báo khi công việc thay đổi."}
            </p>
            {rules.filtersActive ? (
              <button type="button" className="btn btn-primary" onClick={rules.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <PlusGlyph />
                Tạo quy tắc đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <RuleTable
              rows={rules.visible}
              pendingId={rules.pendingId}
              sort={rules.sort}
              onSort={rules.setSort}
              onEdit={openEdit}
              onToggle={(rule) => void rules.toggle(rule)}
              onRuns={setRunRule}
              onDelete={(rule) => {
                setDeleteError(null);
                setDeleting(rule);
              }}
            />
          </div>
        )}

        {!unauthorized && !forbidden && !rules.error && rules.total > 0 ? (
          <Pagination
            page={rules.page}
            pageSize={rules.pageSize}
            total={rules.total}
            onPage={rules.setPage}
            onPageSize={rules.setPageSize}
          />
        ) : null}
      </section>

      <p className="page-footnote">
        {ORDER_NOTE} Máy chủ trả toàn bộ quy tắc trong một lần gọi; tìm kiếm, lọc và phân trang chạy
        trên trình duyệt. Xoá quy tắc chỉ bỏ cấu hình — các lượt chạy đã ghi vẫn còn để đối chiếu, và
        thao tác luôn kèm số phiên bản nên không ghi đè thay đổi của người khác.
      </p>

      {dialog ? (
        <RuleDialog
          mode={dialog.mode}
          rule={dialog.mode === "edit" ? dialog.rule : undefined}
          busy={submitting}
          serverError={dialogError}
          onSubmit={(input) => void save(input)}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {runRule ? <RunSheet rule={runRule} onClose={() => setRunRule(null)} /> : null}

      {deleting ? (
        <Confirm
          title="Xoá quy tắc này?"
          body={`“${deleting.name}” sẽ ngừng chạy ngay. Lượt chạy đã ghi vẫn được giữ để kiểm toán, nhưng cấu hình điều kiện và hành động không khôi phục được từ giao diện.`}
          confirmLabel="Xoá quy tắc"
          busy={deleteBusy}
          problem={deleteError}
          onConfirm={() => void confirmDelete()}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
