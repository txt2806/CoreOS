"use client";

import type { ReactNode } from "react";
import { PERIOD_STATUS_LABEL } from "../constants";
import { formatDateTime, formatMinutes, weekRange } from "../format";
import { PERIOD_STATUSES, type Period } from "../types";
import { PeriodStatusBadge, SkeletonRows, SortButton, ThresholdBadge } from "./primitives";

export type ColumnKey =
  | "week"
  | "employee"
  | "status"
  | "total"
  | "threshold"
  | "decided"
  | "updatedAt";

export type SortKey = ColumnKey;
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  week: "Tuần",
  employee: "Nhân viên",
  status: "Trạng thái",
  total: "Tổng thời gian",
  threshold: "Ngưỡng",
  decided: "Quyết định",
  updatedAt: "Cập nhật",
};

/** Week and status are structural; the rest can be hidden on a narrow screen. */
export const ALL_COLUMNS: ColumnKey[] = [
  "week",
  "employee",
  "status",
  "total",
  "threshold",
  "decided",
  "updatedAt",
];

export const OPTIONAL_COLUMNS: ColumnKey[] = ["employee", "threshold", "decided", "updatedAt"];

const STATUS_RANK: Record<string, number> = Object.fromEntries(
  PERIOD_STATUSES.map((status, index) => [status, index]),
);

/**
 * Sorting runs on the rows this page already holds: `GET /timesheets/periods`
 * has no `sort` parameter, so the control is scoped to the loaded page.
 */
export function sortPeriods(periods: Period[], sort: SortState): Period[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (period: Period): number | string => {
    switch (sort.key) {
      case "status":
        return STATUS_RANK[period.status] ?? 99;
      case "total":
        return period.totalMinutes;
      case "threshold":
        return period.overThreshold ? 1 : 0;
      case "decided":
        return period.decidedAt ?? "";
      case "updatedAt":
        return period.updatedAt;
      case "employee":
        return period.employeeName;
      default:
        return period.weekStart;
    }
  };
  return [...periods].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") return factor * (a - b);
    return factor * String(a).localeCompare(String(b), "vi");
  });
}

/** A new column starts descending: the newest or largest value is what people look for first. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) return { key, dir: "desc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

interface PeriodTableProps {
  periods: Period[];
  loading: boolean;
  sort: SortState;
  onSort: (key: SortKey) => void;
  hidden: ColumnKey[];
  onOpen: (period: Period) => void;
}

function cell(period: Period, key: ColumnKey, onOpen: (period: Period) => void): ReactNode {
  switch (key) {
    case "week":
      return (
        <div className="stack gap-1">
          <button
            type="button"
            className="link tabular"
            onClick={() => onOpen(period)}
            title={`Mở kỳ ${weekRange(period.weekStart)}`}
          >
            {weekRange(period.weekStart)}
          </button>
          <span className="muted">
            {period.status === "OPEN" ? "Có thể sửa" : PERIOD_STATUS_LABEL[period.status]}
          </span>
        </div>
      );
    case "employee":
      return <span className="truncate">{period.employeeName || "—"}</span>;
    case "status":
      return <PeriodStatusBadge status={period.status} />;
    case "total":
      return <span className="tabular">{formatMinutes(period.totalMinutes)}</span>;
    case "threshold":
      return <ThresholdBadge over={period.overThreshold} />;
    case "decided":
      return period.decidedAt ? (
        <div className="stack gap-1">
          <span className="tabular">{formatDateTime(period.decidedAt)}</span>
          <span className="muted truncate">{period.decidedByName || "—"}</span>
        </div>
      ) : (
        <span className="subtle">Chưa duyệt</span>
      );
    case "updatedAt":
      return <span className="tabular">{formatDateTime(period.updatedAt)}</span>;
  }
}

export function PeriodTable({
  periods,
  loading,
  sort,
  onSort,
  hidden,
  onOpen,
}: PeriodTableProps) {
  const columns = ALL_COLUMNS.filter((key) => !hidden.includes(key));

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Danh sách kỳ timesheet của trang hiện tại, sắp xếp theo cột đang chọn.
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
          </tr>
        </thead>
        {loading ? (
          <SkeletonRows
            rows={Math.min(8, Math.max(3, periods.length || 6))}
            columns={columns.length}
          />
        ) : (
          <tbody>
            {periods.map((period) => (
              <tr key={period.id}>
                {columns.map((key) => (
                  <td key={key}>{cell(period, key, onOpen)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
