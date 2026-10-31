"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EXPORT_FILE_PREFIX, ROLE_LABELS, STATUS_LABELS } from "../constants";
import { downloadCsv, formatDateTime, today } from "../format";
import { useAccounts, type Feedback } from "../hooks/use-accounts";
import type { Account, AccountRole, AccountStatus } from "../types";
import { AccessDialog, ResetPasswordDialog, type AccessPatch } from "./access-dialogs";
import { CreateAccountDialog, EditAccountDialog, type EditDraft } from "./account-form";
import { AccountDetailSheet } from "./detail-sheet";
import {
  CloseGlyph,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
  SearchGlyph,
} from "./primitives";
import {
  ALL_COLUMNS,
  COLUMN_LABELS,
  OPTIONAL_COLUMNS,
  AccountTable,
  nextSort,
  sortAccounts,
  type ColumnKey,
  type SortState,
} from "./table";
import { SessionBanner } from "./session-banner";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

const ROLE_VALUES: readonly AccountRole[] = ["EMPLOYEE", "MANAGER"];
const STATUS_VALUES: readonly AccountStatus[] = ["ACTIVE", "LOCKED"];

function asRole(value: string): AccountRole | "" {
  return ROLE_VALUES.find((role) => role === value) ?? "";
}

function asStatus(value: string): AccountStatus | "" {
  return STATUS_VALUES.find((status) => status === value) ?? "";
}

function share(value: number, total: number): string {
  if (!total) return "chưa có dữ liệu";
  return `${Math.round((value / total) * 100)}% trên tổng`;
}

export function AccountsPage() {
  const accounts = useAccounts();
  const [sort, setSort] = useState<SortState>({ key: "account", dir: "asc" });
  const [hidden, setHidden] = useState<ColumnKey[]>(["email"]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lockTarget, setLockTarget] = useState<{ account: Account; mode: "lock" | "unlock" } | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<Account | null>(null);

  /* The optimistic status flip must survive until the server answer lands. */
  const rows = useMemo(
    () =>
      sortAccounts(
        accounts.data.items.map((account) => {
          const optimistic = accounts.optimistic[account.id];
          return optimistic ? { ...account, status: optimistic } : account;
        }),
        sort,
      ),
    [accounts.data.items, accounts.optimistic, sort],
  );

  useEffect(() => {
    if (!columnsOpen) return;
    const close = () => setColumnsOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColumnsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [columnsOpen]);

  const toggleColumn = (key: ColumnKey) => {
    setHidden((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const exportRows = (list: Account[]) => {
    const header = [
      "Tên đăng nhập",
      "Tên hiển thị",
      "Email",
      "Mã nhân viên",
      "Vai trò",
      "Quản trị hệ thống",
      "Trạng thái",
      "Lý do khoá",
      "Đăng nhập gần nhất",
      "Cập nhật",
    ];
    const body = list.map((account) => [
      account.username,
      account.displayName,
      account.email,
      account.employeeCode,
      ROLE_LABELS[account.role],
      account.isSystemAdmin ? "Có" : "Không",
      STATUS_LABELS[account.status],
      account.lockedReason,
      account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "",
      formatDateTime(account.updatedAt),
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    accounts.setFeedback({
      tone: "info",
      message: `Đã xuất ${list.length} tài khoản ra tệp CSV.`,
    });
  };

  const detail = openId ? (accounts.data.items.find((item) => item.id === openId) ?? null) : null;
  const totals = accounts.totals;
  const unauthenticated = accounts.actorMissing;
  const forbidden = accounts.error?.status === 403;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Kiểm soát truy cập</p>
          <h1>Tài khoản</h1>
          <p className="page-lede">
            Cấp tài khoản nội bộ, khoá khi cần và giữ lại toàn bộ dấu vết thay đổi quyền. Tài khoản
            không bị xoá — chỉ bị khoá — để lịch sử kiểm toán còn nguyên.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportRows(rows)}
            disabled={rows.length === 0}
            title="Xuất các dòng đang hiển thị ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            disabled={!accounts.canManage && !(totals?.all === 0)}
            title={
              accounts.canManage || totals?.all === 0
                ? "Tạo tài khoản mới"
                : "Chỉ quản trị hệ thống mới tạo được tài khoản"
            }
          >
            <PlusGlyph /> Tạo tài khoản
          </button>
        </div>
      </header>

      {totals ? (
        <section className="metric-strip" aria-label="Số lượng tài khoản theo trạng thái">
          <div className="metric">
            <span className="metric-value tabular">{totals.all.toLocaleString("vi-VN")}</span>
            <span className="metric-label">Tổng tài khoản</span>
            <span className="metric-note">gồm cả tài khoản đang khoá</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{totals.active.toLocaleString("vi-VN")}</span>
            <span className="metric-label">Đang hoạt động</span>
            <span className="metric-note">{share(totals.active, totals.all)}</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{totals.locked.toLocaleString("vi-VN")}</span>
            <span className="metric-label">Đang khoá</span>
            <span className="metric-note">không đăng nhập được</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{totals.managers.toLocaleString("vi-VN")}</span>
            <span className="metric-label">Quản lý</span>
            <span className="metric-note">{share(totals.managers, totals.all)}</span>
          </div>
        </section>
      ) : null}

      <SessionBanner />

      {accounts.feedback ? (
        <div className={ALERT_TONE[accounts.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{accounts.feedback.message}</span>
            {accounts.feedback.hint ? (
              <span className="muted">{accounts.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => accounts.setFeedback(null)}
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
                  id="account-search"
                  className="input"
                  type="search"
                  value={accounts.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên, tên đăng nhập, email, mã nhân viên…"
                  aria-label="Tìm tài khoản"
                  onChange={(event) => accounts.patchQuery({ q: event.target.value, page: 1 })}
                />
                {accounts.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => accounts.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={accounts.query.role}
                aria-label="Lọc theo vai trò"
                onChange={(event) => accounts.patchQuery({ role: asRole(event.target.value), page: 1 })}
                style={{ width: 168 }}
              >
                <option value="">Mọi vai trò</option>
                <option value="EMPLOYEE">Nhân viên</option>
                <option value="MANAGER">Quản lý</option>
              </select>

              <select
                className="select"
                value={accounts.query.status}
                aria-label="Lọc theo trạng thái"
                onChange={(event) =>
                  accounts.patchQuery({ status: asStatus(event.target.value), page: 1 })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Đang khoá</option>
              </select>

              <div className="popover-anchor">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-expanded={columnsOpen}
                  aria-haspopup="true"
                  onClick={() => setColumnsOpen((open) => !open)}
                >
                  Cột hiển thị
                </button>
                {columnsOpen ? (
                  <div className="menu" role="group" aria-label="Chọn cột hiển thị">
                    {OPTIONAL_COLUMNS.map((key) => (
                      <label key={key} className="menu-item">
                        <input
                          type="checkbox"
                          checked={!hidden.includes(key)}
                          onChange={() => toggleColumn(key)}
                        />
                        {COLUMN_LABELS[key]}
                      </label>
                    ))}
                    <button type="button" className="menu-item" onClick={() => setHidden([])}>
                      Hiện tất cả {ALL_COLUMNS.length} cột
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {accounts.data.total.toLocaleString("vi-VN")} tài khoản
                {accounts.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {accounts.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {accounts.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{accounts.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => accounts.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {accounts.query.role ? (
                <span className="chip" data-active="true">
                  Vai trò: {ROLE_LABELS[accounts.query.role]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => accounts.patchQuery({ role: "", page: 1 })}
                    aria-label="Bỏ lọc vai trò"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {accounts.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {STATUS_LABELS[accounts.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => accounts.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={accounts.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {unauthenticated || forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">
              {unauthenticated ? "Phiên đăng nhập đã hết hạn" : "Bạn chưa được cấp quyền xem tài khoản"}
            </span>
            <p className="empty-body">
              {unauthenticated
                ? "Đăng nhập lại để tiếp tục. Danh sách tài khoản chỉ mở cho phiên hợp lệ."
                : "Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Kiểm soát truy cập rồi tải lại trang."}
            </p>
            {unauthenticated ? (
              <Link className="btn btn-primary" href="/tenant-system/auth">
                Tới trang đăng nhập
              </Link>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={accounts.reload}>
                Tải lại
              </button>
            )}
          </div>
        ) : accounts.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách tài khoản</span>
            <p className="empty-body">{accounts.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={accounts.reload}>
              Thử lại
            </button>
          </div>
        ) : !accounts.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {accounts.filtersActive
                ? "Không có tài khoản nào khớp bộ lọc"
                : "Chưa có tài khoản nào"}
            </span>
            <p className="empty-body">
              {accounts.filtersActive
                ? "Thử bỏ một vài điều kiện, hoặc xoá hết bộ lọc để xem toàn bộ danh sách."
                : "Tạo tài khoản đầu tiên — bắt buộc là Quản lý kèm quyền quản trị hệ thống — để bắt đầu cấp quyền cho đội."}
            </p>
            {accounts.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={accounts.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                <PlusGlyph /> Tạo tài khoản
              </button>
            )}
          </div>
        ) : (
          <AccountTable
            accounts={rows}
            loading={accounts.loading}
            sort={sort}
            optimistic={accounts.optimistic}
            pendingId={accounts.pendingId}
            canManage={accounts.canManage}
            hidden={hidden}
            onSort={(key) => setSort((current) => nextSort(current, key))}
            onOpen={(account) => setOpenId(account.id)}
            onEdit={(account) => setEditing(account)}
            onToggleLock={(account) =>
              setLockTarget({
                account,
                mode: (accounts.optimistic[account.id] ?? account.status) === "ACTIVE" ? "lock" : "unlock",
              })
            }
          />
        )}

        {!unauthenticated && !forbidden && !accounts.error && rows.length > 0 ? (
          <Pagination
            page={accounts.query.page}
            pageSize={accounts.query.pageSize}
            total={accounts.data.total}
            onPage={(page) => accounts.patchQuery({ page })}
            onPageSize={(pageSize) => accounts.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Máy chủ sắp xếp theo trạng thái rồi tên hiển thị; bấm tiêu đề cột để sắp xếp lại các dòng
        đang tải trên trang này. Tài khoản không có thao tác xoá — hãy khoá kèm lý do để giữ lịch sử
        kiểm toán.
      </p>

      {detail ? (
        <AccountDetailSheet
          account={detail}
          canManage={accounts.canManage}
          pending={accounts.pendingId === detail.id}
          onAccess={(patch) => accounts.setAccess(detail, patch)}
          onEdit={() => setEditing(detail)}
          onToggleLock={() =>
            setLockTarget({ account: detail, mode: detail.status === "ACTIVE" ? "lock" : "unlock" })
          }
          onResetPassword={() => setResetTarget(detail)}
          onClose={() => setOpenId(null)}
        />
      ) : null}

      {creating ? (
        <CreateAccountDialog
          firstAccount={accounts.data.total === 0}
          onSubmit={(draft) => accounts.create(draft)}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editing ? (
        <EditAccountDialog
          account={editing}
          onSubmit={(draft: EditDraft) => accounts.update(editing, draft)}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {lockTarget ? (
        <AccessDialog
          account={lockTarget.account}
          mode={lockTarget.mode}
          onSubmit={(patch: AccessPatch) => accounts.setAccess(lockTarget.account, patch)}
          onClose={() => setLockTarget(null)}
        />
      ) : null}

      {resetTarget ? (
        <ResetPasswordDialog
          account={resetTarget}
          onSubmit={(password, reason) => accounts.setPassword(resetTarget, password, reason)}
          onClose={() => setResetTarget(null)}
        />
      ) : null}
    </div>
  );
}
