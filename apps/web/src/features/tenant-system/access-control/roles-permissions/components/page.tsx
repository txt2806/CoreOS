"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  GROUP_LABELS,
  GROUP_ORDER,
  ROLE_LABELS,
  SYSTEM_ADMIN_NOTE,
} from "../constants";
import { usePermissions } from "../hooks/use-permissions";
import type { PermissionRole } from "../types";
import { HistorySheet } from "./history-sheet";
import { PermissionMatrix } from "./matrix";
import {
  AlertGlyph,
  ClockGlyph,
  CloseGlyph,
  Pagination,
  SaveGlyph,
  SearchGlyph,
  ShieldGlyph,
} from "./primitives";
import { SessionBanner } from "./session-banner";

const ROLES: readonly PermissionRole[] = ["EMPLOYEE", "MANAGER"];

export function PermissionsPage() {
  const permissions = usePermissions();
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    data,
    actor,
    actorMissing,
    role,
    setRole,
    dirtyCount,
    canEdit,
  } = permissions;

  /**
   * Guards a reload or a closed tab while cells are still only in the draft.
   * The save endpoint is the only way out, so leaving silently would lose work.
   */
  useEffect(() => {
    if (dirtyCount === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyCount]);

  const customCells = useMemo(
    () => (data?.items ?? []).filter((item) => item.role === role && !item.isDefault).length,
    [data, role],
  );

  const labelOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of data?.items ?? []) {
      if (!map.has(item.featureKey)) map.set(item.featureKey, item.label);
    }
    return (featureKey: string) => map.get(featureKey) ?? featureKey;
  }, [data]);

  const openHistory = () => {
    setHistoryOpen(true);
    void permissions.loadHistory();
  };

  const unauthorized = permissions.error?.status === 401;
  const forbidden = permissions.error?.status === 403;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Truy cập · Phân quyền</p>
          <h1>Ma trận quyền</h1>
          <p className="page-lede">
            Gán quyền theo chức năng cho hai vai trò Nhân viên và Quản lý. Mọi thay đổi chỉ có hiệu
            lực sau khi bấm lưu và đều được ghi nhật ký kiểm toán.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={openHistory}>
            <ClockGlyph />
            Lịch sử thay đổi
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={permissions.reload}
            disabled={permissions.loading}
          >
            Tải lại
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tổng quan ma trận quyền">
        <div className="metric">
          <span className="metric-value tabular">
            {(permissions.featureCount ?? 0).toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Chức năng</span>
          <span className="metric-note">trong danh mục quyền</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {permissions.grantCount(role).toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Quyền đã cấp</span>
          <span className="metric-note">{ROLE_LABELS[role]}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {(permissions.assignable.length * ROLES.length).toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Ô quyền</span>
          <span className="metric-note">
            {permissions.assignable.length} hành động × {ROLES.length} vai trò
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{customCells.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Đã chỉnh khỏi mặc định</span>
          <span className="metric-note">{ROLE_LABELS[role]}</span>
        </div>
      </section>

      <SessionBanner />

      <div className="stack gap-2" aria-live="polite">
        {permissions.feedback ? (
          <div
            className={
              permissions.feedback.tone === "error"
                ? "alert alert-danger"
                : permissions.feedback.tone === "warning"
                  ? "alert alert-warning"
                  : permissions.feedback.tone === "success"
                    ? "alert alert-success"
                    : "alert"
            }
            role={permissions.feedback.tone === "error" ? "alert" : "status"}
          >
            <AlertGlyph />
            <div className="stack gap-1">
              <span>{permissions.feedback.message}</span>
              {permissions.feedback.hint ? (
                <span className="muted">{permissions.feedback.hint}</span>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-icon"
              aria-label="Đóng thông báo"
              onClick={() => permissions.setFeedback(null)}
              style={{ marginLeft: "auto" }}
            >
              <CloseGlyph />
            </button>
          </div>
        ) : null}

        {actor?.isSystemAdmin ? (
          <div className="alert alert-warning" role="note">
            <ShieldGlyph />
            <span>{SYSTEM_ADMIN_NOTE}</span>
          </div>
        ) : actorMissing ? null : !canEdit ? (
          <div className="alert" role="note">
            <ShieldGlyph />
            <span>
              Bạn đang xem ma trận ở chế độ chỉ đọc vì chỉ quản trị hệ thống được sửa phân quyền.
              Liên hệ quản trị viên nếu cần điều chỉnh.
            </span>
          </div>
        ) : null}
      </div>

      <section className="surface" aria-label="Bảng quyền theo chức năng">
        <div className="surface-head">
          <div className="toolbar">
            <div className="toolbar-filters">
              <div className="search">
                <SearchGlyph />
                <input
                  id="perm-search"
                  className="input"
                  type="search"
                  value={permissions.q}
                  autoComplete="off"
                  placeholder="Tìm theo tên hoặc khoá chức năng…"
                  aria-label="Tìm chức năng"
                  onChange={(event) => permissions.setQ(event.target.value)}
                />
                {permissions.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => permissions.setQ("")}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <label className="sr-only" htmlFor="perm-group">
                Lọc theo phân hệ
              </label>
              <select
                id="perm-group"
                className="select"
                value={permissions.group}
                onChange={(event) =>
                  permissions.setGroup(
                    GROUP_ORDER.find((item) => item === event.target.value) ?? "",
                  )
                }
                style={{ width: 184 }}
              >
                <option value="">Tất cả phân hệ</option>
                {GROUP_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {GROUP_LABELS[item]}
                  </option>
                ))}
              </select>

              <div className="segmented" role="group" aria-label="Vai trò đang xem">
                {ROLES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="segment"
                    aria-pressed={role === item}
                    onClick={() => setRole(item)}
                  >
                    {ROLE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="toolbar-actions">
              <span className="result-count">
                {permissions.total.toLocaleString("vi-VN")} chức năng
                {permissions.filtersActive ? ` · ${permissions.visible.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {permissions.filtersActive ? (
            <div className="row wrap items-center gap-2 px-4 pb-3">
              {permissions.q.trim() ? (
                <span className="chip" data-active="true">
                  Từ khoá: {permissions.q.trim()}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label="Bỏ từ khoá tìm kiếm"
                    onClick={() => permissions.setQ("")}
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {permissions.group ? (
                <span className="chip" data-active="true">
                  Phân hệ: {GROUP_LABELS[permissions.group]}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label="Bỏ lọc phân hệ"
                    onClick={() => permissions.setGroup("")}
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={permissions.clearFilters}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {dirtyCount > 0 ? (
          <div className="bulk-bar">
            <span className="badge badge-warning">
              <span className="dot" aria-hidden="true" />
              {dirtyCount.toLocaleString("vi-VN")} ô chưa lưu
            </span>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label className="field-label" htmlFor="perm-reason">
                Lý do thay đổi (không bắt buộc)
              </label>
              <input
                id="perm-reason"
                className="input"
                value={permissions.reason}
                maxLength={500}
                placeholder="Ví dụ: mở quyền duyệt cho quản lý khu vực"
                onChange={(event) => permissions.setReason(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={permissions.discard}
              disabled={permissions.saving}
            >
              Huỷ thay đổi
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void permissions.save()}
              disabled={permissions.saving}
              aria-busy={permissions.saving}
            >
              <SaveGlyph />
              {permissions.saving ? "Đang lưu…" : "Lưu ma trận"}
            </button>
          </div>
        ) : null}

        {unauthorized || forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">
              {unauthorized ? "Phiên đăng nhập đã hết hạn" : "Bạn chưa được cấp quyền xem ma trận"}
            </span>
            <p className="empty-body">
              {unauthorized
                ? "Đăng nhập lại để tiếp tục. Các ô đang chỉnh dở chỉ được giữ trong trình duyệt này và sẽ mất khi tải lại trang."
                : "Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Phân quyền rồi tải lại trang."}
            </p>
            {unauthorized ? (
              <Link className="btn btn-primary" href="/tenant-system/auth">
                Đăng nhập
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={permissions.reload}>
                Thử lại
              </button>
            )}
          </div>
        ) : permissions.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được ma trận quyền</span>
            <p className="empty-body">{permissions.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={permissions.reload}>
              Thử lại
            </button>
          </div>
        ) : permissions.loading ? (
          <div className="surface-body stack gap-2" aria-busy="true">
            <span className="sr-only">Đang tải ma trận quyền…</span>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="skeleton skeleton-row" aria-hidden="true" />
            ))}
          </div>
        ) : permissions.total === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {permissions.filtersActive
                ? "Không có chức năng nào khớp bộ lọc"
                : "Danh mục quyền đang trống"}
            </span>
            <p className="empty-body">
              {permissions.filtersActive
                ? "Thử từ khoá ngắn hơn hoặc bỏ lọc phân hệ để xem toàn bộ danh mục."
                : "Máy chủ chưa trả về chức năng nào. Tải lại trang để lấy danh mục mới nhất."}
            </p>
            {permissions.filtersActive ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={permissions.clearFilters}
              >
                Xoá bộ lọc
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={permissions.reload}>
                Tải lại
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <PermissionMatrix
              rows={permissions.visible}
              role={role}
              assignable={permissions.assignable}
              actionsFor={permissions.actionsFor}
              isDirty={permissions.isDirty}
              isDefault={permissions.isDefault}
              editable={canEdit}
              onToggle={permissions.toggle}
            />
          </div>
        )}

        {!unauthorized && !forbidden && !permissions.error && permissions.total > 0 ? (
          <Pagination
            page={permissions.page}
            pageSize={permissions.pageSize}
            total={permissions.total}
            onPage={permissions.setPage}
            onPageSize={permissions.setPageSize}
          />
        ) : null}
      </section>

      <p className="page-footnote">
        Máy chủ trả về toàn bộ danh mục quyền trong một lần gọi; tìm kiếm, lọc phân hệ và phân trang
        chạy trên trình duyệt nên không phát sinh thêm yêu cầu. Mỗi lần lưu chỉ gửi những ô đã đổi
        kèm số phiên bản, nên nếu người khác vừa sửa cùng ô thì máy chủ sẽ từ chối và bạn cần tải lại
        trước khi lưu tiếp. Quyền mới có hiệu lực từ yêu cầu kế tiếp của người dùng và không thể khôi
        phục bằng cách tải lại trang.
      </p>

      {historyOpen ? (
        <HistorySheet
          items={permissions.historyItems}
          error={permissions.historyError}
          loading={permissions.historyItems === null && !permissions.historyError}
          labelOf={labelOf}
          onRetry={() => void permissions.loadHistory()}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </div>
  );
}
