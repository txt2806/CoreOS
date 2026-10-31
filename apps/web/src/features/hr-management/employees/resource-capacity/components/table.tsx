"use client";

import type { ReactNode } from "react";
import { formatDate, formatDateTime, formatHours, formatPercent } from "../format";
import type { CapacitySummary, Period } from "../types";
import { CapacityBar, SkeletonRows, SortButton } from "./primitives";

/** A period plus the summary read that completes it; a null summary is shown, not hidden. */
export interface CapacityRow {
  period: Period;
  summary: CapacitySummary | null;
}

export type ColumnKey =
  | "employee"
  | "window"
  | "workingDays"
  | "available"
  | "utilization"
  | "remaining"
  | "updatedAt";

export type SortKey = ColumnKey;
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  employee: "Nhân sự",
  window: "Khoảng ngày",
  workingDays: "Ngày công",
  available: "Giờ khả dụng",
  utilization: "Đã phân bổ",
  remaining: "Còn trống",
  updatedAt: "Cập nhật",
};

/** Employee, window and utilisation are the board's spine; the rest can be hidden. */
export const ALL_COLUMNS: ColumnKey[] = [
  "employee",
  "window",
  "workingDays",
  "available",
  "utilization",
  "remaining",
  "updatedAt",
];

export const OPTIONAL_COLUMNS: ColumnKey[] = [
  "workingDays",
  "available",
  "remaining",
  "updatedAt",
];

/**
 * Sorting runs on the rows this page already holds: `GET /resource-capacity/periods`
 * has no `sort` parameter, so the control is scoped to the loaded page.
 */
export function sortRows(rows: CapacityRow[], sort: SortState): CapacityRow[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (row: CapacityRow): number | string => {
    switch (sort.key) {
      case "window":
        return row.period.fromDate;
      case "workingDays":
        return row.period.workingDays;
      case "available":
        return row.summary?.availableHours ?? -1;
      case "utilization":
        return row.summary?.utilization ?? -1;
      case "remaining":
        return row.summary?.remainingHours ?? -1;
      case "updatedAt":
        return row.period.updatedAt;
      default:
        return row.period.employeeName;
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
  if (current.key !== key) return { key, dir: key === "employee" ? "asc" : "desc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

interface CapacityTableProps {
  rows: CapacityRow[];
  loading: boolean;
  sort: SortState;
  onSort: (key: SortKey) => void;
  hidden: ColumnKey[];
  onOpen: (period: Period) => void;
}

function cell(
  row: CapacityRow,
  key: ColumnKey,
  onOpen: (period: Period) => void,
): ReactNode {
  const { period, summary } = row;
  switch (key) {
    case "employee":
      return (
        <div className="stack gap-1">
          <button
            type="button"
            className="link truncate"
            onClick={() => onOpen(period)}
            title={`Mở kỳ công suất của ${period.employeeName}`}
          >
            {period.employeeName}
          </button>
          <span className="muted mono truncate">{period.employeeId}</span>
        </div>
      );
    case "window":
      return (
        <span className="tabular">
          {formatDate(period.fromDate)} – {formatDate(period.toDate)}
        </span>
      );
    case "workingDays":
      return (
        <div className="stack gap-1">
          <span className="tabular">{period.workingDays.toLocaleString("vi-VN")}</span>
          <span className="muted">
            nghỉ {period.holidayDays.toLocaleString("vi-VN")} · phép{" "}
            {period.leaveDays.toLocaleString("vi-VN")}
          </span>
        </div>
      );
    case "available":
      return (
        <div className="stack gap-1">
          <span className="tabular">{summary ? formatHours(summary.availableHours) : "—"}</span>
          <span className="muted">
            {period.standardHoursPerDay.toLocaleString("vi-VN")} giờ/ngày
          </span>
        </div>
      );
    case "utilization":
      return summary ? (
        <div className="stack gap-1">
          <CapacityBar
            utilization={summary.utilization}
            over={summary.overCapacity}
            label={`Công suất của ${period.employeeName}`}
          />
          <span className="muted">
            {formatHours(summary.allocatedHours)} / {formatHours(summary.availableHours)} giờ ·{" "}
            {formatPercent(summary.allocatedPercent)} tổng phân bổ
          </span>
        </div>
      ) : (
        <span className="subtle">Chưa tính được</span>
      );
    case "remaining":
      return summary ? (
        <span className={summary.overCapacity ? "deadline deadline-danger" : "tabular"}>
          {summary.overCapacity ? "Thiếu " : ""}
          {formatHours(Math.abs(summary.remainingHours))} giờ
        </span>
      ) : (
        <span className="subtle">—</span>
      );
    case "updatedAt":
      return <span className="tabular">{formatDateTime(period.updatedAt)}</span>;
  }
}

export function CapacityTable({
  rows,
  loading,
  sort,
  onSort,
  hidden,
  onOpen,
}: CapacityTableProps) {
  const columns = ALL_COLUMNS.filter((key) => !hidden.includes(key));

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Kỳ công suất của trang hiện tại kèm giờ khả dụng và tỉ lệ đã phân bổ, sắp xếp theo
          cột đang chọn.
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
            rows={Math.min(8, Math.max(3, rows.length || 6))}
            columns={columns.length}
          />
        ) : (
          <tbody>
            {rows.map((row) => (
              <tr key={row.period.id}>
                {columns.map((key) => (
                  <td key={key}>{cell(row, key, onOpen)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
