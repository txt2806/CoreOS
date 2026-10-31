"use client";

import type { ReactNode } from "react";
import { formatDateTime } from "../format";
import type { Account, AccountStatus } from "../types";
import {
  AdminBadge,
  RoleBadge,
  SkeletonRows,
  SortButton,
  StatusBadge,
} from "./primitives";

export type ColumnKey = "account" | "employeeCode" | "email" | "role" | "status" | "lastLogin";

export interface SortState {
  key: ColumnKey;
  dir: "asc" | "desc";
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  account: "Tài khoản",
  employeeCode: "Mã nhân viên",
  email: "Email",
  role: "Vai trò",
  status: "Trạng thái",
  lastLogin: "Đăng nhập gần nhất",
};

export const ALL_COLUMNS: ColumnKey[] = [
  "account",
  "employeeCode",
  "email",
  "role",
  "status",
  "lastLogin",
];

/** Account, role and status are structural; the rest can be hidden. */
export const OPTIONAL_COLUMNS: ColumnKey[] = ["employeeCode", "email", "lastLogin"];

const ROLE_RANK: Record<string, number> = { MANAGER: 0, EMPLOYEE: 1 };
const STATUS_RANK: Record<string, number> = { ACTIVE: 0, LOCKED: 1 };

/**
 * Sorting runs on the rows the page holds. `GET /accounts` has no `sort`
 * parameter, so the footnote says so instead of implying a global order.
 */
export function sortAccounts(accounts: Account[], sort: SortState): Account[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (account: Account): number | string => {
    switch (sort.key) {
      case "role":
        return ROLE_RANK[account.role] ?? 9;
      case "status":
        return STATUS_RANK[account.status] ?? 9;
      case "lastLogin":
        return account.lastLoginAt ?? "";
      case "employeeCode":
        return account.employeeCode;
      case "email":
        return account.email;
      default:
        return account.displayName;
    }
  };
  return [...accounts].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") return factor * (a - b);
    return factor * String(a).localeCompare(String(b), "vi");
  });
}

export function nextSort(current: SortState, key: ColumnKey): SortState {
  if (current.key !== key) return { key, dir: key === "account" ? "asc" : "desc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

interface AccountTableProps {
  accounts: Account[];
  loading: boolean;
  sort: SortState;
  optimistic: Record<string, AccountStatus>;
  pendingId: string | null;
  canManage: boolean;
  hidden: ColumnKey[];
  onSort: (key: ColumnKey) => void;
  onOpen: (account: Account) => void;
  onEdit: (account: Account) => void;
  onToggleLock: (account: Account) => void;
}

function cell(account: Account, key: ColumnKey, status: AccountStatus, onOpen: () => void): ReactNode {
  switch (key) {
    case "account":
      return (
        <div className="stack gap-1">
          <button type="button" className="link truncate" onClick={onOpen} title={account.displayName}>
            {account.displayName}
          </button>
          <span className="muted truncate mono">@{account.username}</span>
        </div>
      );
    case "employeeCode":
      return account.employeeCode ? (
        <span className="mono">{account.employeeCode}</span>
      ) : (
        <span className="subtle">Chưa gắn</span>
      );
    case "email":
      return account.email ? (
        <span className="truncate">{account.email}</span>
      ) : (
        <span className="subtle">—</span>
      );
    case "role":
      return (
        <div className="row wrap gap-1">
          <RoleBadge role={account.role} />
          <AdminBadge granted={account.isSystemAdmin} />
        </div>
      );
    case "status":
      return (
        <div className="stack gap-1">
          <StatusBadge status={status} />
          {account.mustChangePassword ? (
            <span className="badge badge-warning">Mật khẩu tạm</span>
          ) : null}
          {status === "LOCKED" && account.lockedReason ? (
            <span className="muted truncate" title={account.lockedReason}>
              {account.lockedReason}
            </span>
          ) : null}
        </div>
      );
    case "lastLogin":
      return account.lastLoginAt ? (
        <span className="tabular">{formatDateTime(account.lastLoginAt)}</span>
      ) : (
        <span className="subtle">Chưa đăng nhập</span>
      );
  }
}

export function AccountTable({
  accounts,
  loading,
  sort,
  optimistic,
  pendingId,
  canManage,
  hidden,
  onSort,
  onOpen,
  onEdit,
  onToggleLock,
}: AccountTableProps) {
  const columns = ALL_COLUMNS.filter((key) => !hidden.includes(key));

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Danh sách tài khoản của trang hiện tại, sắp xếp theo cột đang chọn.
        </caption>
        <thead>
          <tr>
            {columns.map((key) => (
              <th
                key={key}
                scope="col"
                aria-sort={
                  sort.key === key
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <SortButton
                  label={COLUMN_LABELS[key]}
                  active={sort.key === key}
                  direction={sort.dir}
                  onClick={() => onSort(key)}
                />
              </th>
            ))}
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        {loading ? (
          <SkeletonRows
            rows={Math.min(8, Math.max(3, accounts.length || 6))}
            columns={columns.length + 1}
          />
        ) : (
          <tbody>
            {accounts.map((account) => {
              const status = optimistic[account.id] ?? account.status;
              const busy = pendingId === account.id;
              return (
                <tr key={account.id}>
                  {columns.map((key) => (
                    <td key={key}>
                      {cell(account, key, status, () => onOpen(account))}
                    </td>
                  ))}
                  <td>
                    <div className="row gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onOpen(account)}
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEdit(account)}
                        disabled={!canManage}
                        title={
                          canManage
                            ? "Sửa thông tin hồ sơ"
                            : "Chỉ quản trị hệ thống mới sửa được tài khoản"
                        }
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className={status === "ACTIVE" ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"}
                        onClick={() => onToggleLock(account)}
                        disabled={!canManage || busy}
                        aria-busy={busy ? "true" : undefined}
                        title={
                          canManage
                            ? status === "ACTIVE"
                              ? "Khoá tài khoản kèm lý do"
                              : "Mở khoá để người dùng đăng nhập lại"
                            : "Chỉ quản trị hệ thống mới đổi được trạng thái"
                        }
                      >
                        {status === "ACTIVE" ? "Khoá" : "Mở khoá"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        )}
      </table>
    </div>
  );
}
