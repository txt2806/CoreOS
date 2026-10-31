"use client";

import type { ReactNode } from "react";
import { LEAVE_TYPE_LABEL } from "../constants";
import { formatDate, formatDateTime, sessionOf } from "../format";
import { LEAVE_STATUSES, type LeaveRequest } from "../types";
import { SkeletonRows, SortButton, StatusBadge } from "./primitives";

export type ColumnKey =
  | "employee"
  | "leaveType"
  | "range"
  | "days"
  | "status"
  | "decidedBy"
  | "createdAt";

export type SortKey = ColumnKey;
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  employee: "Nhân sự",
  leaveType: "Loại nghỉ",
  range: "Khoảng nghỉ",
  days: "Số ngày",
  status: "Trạng thái",
  decidedBy: "Người quyết định",
  createdAt: "Ngày gửi",
};

export const ALL_COLUMNS: ColumnKey[] = [
  "employee",
  "leaveType",
  "range",
  "days",
  "status",
  "decidedBy",
  "createdAt",
];

const NUMERIC: ColumnKey[] = ["days"];

const STATUS_RANK: Record<string, number> = Object.fromEntries(
  LEAVE_STATUSES.map((status, index) => [status, index]),
);

/**
 * Sorting applies to the rows this page holds: the list endpoint has no `sort`
 * parameter, and the footnote says so rather than implying a global order.
 */
export function sortRequests(rows: LeaveRequest[], sort: SortState): LeaveRequest[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (row: LeaveRequest): number | string => {
    switch (sort.key) {
      case "status":
        return STATUS_RANK[row.status] ?? 99;
      case "days":
        return row.days;
      case "employee":
        return row.employeeName;
      case "leaveType":
        return LEAVE_TYPE_LABEL[row.leaveType];
      case "range":
        return row.fromDate;
      case "decidedBy":
        return row.decidedBy;
      case "createdAt":
        return row.createdAt;
    }
  };
  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") return factor * (a - b);
    return factor * String(a).localeCompare(String(b), "vi");
  });
}

export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) return { key, dir: key === "createdAt" ? "desc" : "asc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

interface LeaveTableProps {
  rows: LeaveRequest[];
  loading: boolean;
  sort: SortState;
  onSort: (key: SortKey) => void;
  onOpen: (request: LeaveRequest) => void;
  optimistic: Record<string, string>;
}

function cell(
  request: LeaveRequest,
  key: ColumnKey,
  optimisticStatus: string | undefined,
  onOpen: (request: LeaveRequest) => void,
): ReactNode {
  switch (key) {
    case "employee":
      return (
        <div className="cell-title">
          <button
            type="button"
            className="link truncate"
            onClick={() => onOpen(request)}
            title={`${request.employeeName} — ${request.reason}`}
          >
            <strong>{request.employeeName}</strong>
          </button>
          <span className="truncate">{request.reason}</span>
        </div>
      );
    case "leaveType":
      return LEAVE_TYPE_LABEL[request.leaveType];
    case "range":
      return (
        <div className="cell-title">
          <span className="tabular">
            {formatDate(request.fromDate)} → {formatDate(request.toDate)}
          </span>
          <span>{sessionOf(request)}</span>
        </div>
      );
    case "days":
      return <span className="tabular">{request.days.toLocaleString("vi-VN")}</span>;
    case "status": {
      /* A cancelled row keeps its optimistic label until the reload answers. */
      const shown = LEAVE_STATUSES.find((item) => item === optimisticStatus) ?? request.status;
      return <StatusBadge status={shown} />;
    }
    case "decidedBy":
      return request.decidedBy || <span className="subtle">Chưa xử lý</span>;
    case "createdAt":
      return <span className="tabular muted">{formatDateTime(request.createdAt)}</span>;
  }
}

export function LeaveTable({ rows, loading, sort, onSort, onOpen, optimistic }: LeaveTableProps) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Danh sách đơn nghỉ phép của trang hiện tại, sắp xếp theo cột đang chọn.
        </caption>
        <thead>
          <tr>
            {ALL_COLUMNS.map((key) => (
              <th
                key={key}
                scope="col"
                className={NUMERIC.includes(key) ? "num" : undefined}
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
          </tr>
        </thead>
        {loading ? (
          <SkeletonRows
            rows={Math.min(8, Math.max(3, rows.length || 6))}
            columns={ALL_COLUMNS.length}
          />
        ) : (
          <tbody>
            {rows.map((request) => (
              <tr key={request.id}>
                {ALL_COLUMNS.map((key) => (
                  <td key={key} className={NUMERIC.includes(key) ? "num" : undefined}>
                    {cell(request, key, optimistic[request.id], onOpen)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
