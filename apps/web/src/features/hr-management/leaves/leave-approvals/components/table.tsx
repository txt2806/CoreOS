"use client";

import { LEAVE_TYPE_LABEL } from "../constants";
import { daysBetween, formatDate, formatDateTime, number, sessionOf, today } from "../format";
import type { Decision, QueueItem } from "../types";
import { CheckGlyph, RejectGlyph, SkeletonRows, SortButton } from "./primitives";

export type QueueSort = { key: "employeeName" | "fromDate" | "days"; dir: "asc" | "desc" };
export type HistorySort = { key: "employeeName" | "decidedAt" | "days"; dir: "asc" | "desc" };

const COLUMNS = 7;

function ariaSort(active: boolean, dir: "asc" | "desc") {
  if (!active) return "none" as const;
  return dir === "asc" ? ("ascending" as const) : ("descending" as const);
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "vi");
}

export function sortQueue(rows: QueueItem[], sort: QueueSort): QueueItem[] {
  return [...rows].sort((left, right) => {
    const result = compare(left[sort.key], right[sort.key]);
    return sort.dir === "asc" ? result : -result;
  });
}

export function sortHistory(rows: Decision[], sort: HistorySort): Decision[] {
  return [...rows].sort((left, right) => {
    const result = compare(
      sort.key === "decidedAt" ? right.decidedAt : left[sort.key],
      sort.key === "decidedAt" ? left.decidedAt : right[sort.key],
    );
    return sort.dir === "asc" ? -result : result;
  });
}

function nextDir(current: "asc" | "desc", active: boolean): "asc" | "desc" {
  return active ? (current === "asc" ? "desc" : "asc") : "asc";
}

interface QueueTableProps {
  rows: QueueItem[];
  loading: boolean;
  canApprove: boolean;
  pendingId: string | null;
  sort: QueueSort;
  onSort: (sort: QueueSort) => void;
  onOpen: (item: QueueItem) => void;
  onApprove: (item: QueueItem) => void;
  onReject: (item: QueueItem) => void;
}

export function QueueTable({
  rows,
  loading,
  canApprove,
  pendingId,
  sort,
  onSort,
  onOpen,
  onApprove,
  onReject,
}: QueueTableProps) {
  const now = today();

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Hàng đợi đơn nghỉ phép đang chờ quản lý quyết định
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort(sort.key === "employeeName", sort.dir)}>
              <SortButton
                label="Nhân sự"
                active={sort.key === "employeeName"}
                direction={sort.dir}
                onClick={() =>
                  onSort({
                    key: "employeeName",
                    dir: nextDir(sort.dir, sort.key === "employeeName"),
                  })
                }
              />
            </th>
            <th scope="col">Loại nghỉ</th>
            <th scope="col" aria-sort={ariaSort(sort.key === "fromDate", sort.dir)}>
              <SortButton
                label="Thời gian nghỉ"
                active={sort.key === "fromDate"}
                direction={sort.dir}
                onClick={() =>
                  onSort({
                    key: "fromDate",
                    dir: nextDir(sort.dir, sort.key === "fromDate"),
                  })
                }
              />
            </th>
            <th scope="col" aria-sort={ariaSort(sort.key === "days", sort.dir)}>
              <SortButton
                label="Số ngày"
                active={sort.key === "days"}
                direction={sort.dir}
                onClick={() =>
                  onSort({ key: "days", dir: nextDir(sort.dir, sort.key === "days") })
                }
              />
            </th>
            <th scope="col">Khởi hành</th>
            <th scope="col">Lý do</th>
            <th scope="col">
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>

        {loading ? (
          <SkeletonRows rows={6} columns={COLUMNS} />
        ) : (
          <tbody>
            {rows.map((item) => {
              const untilStart = daysBetween(now, item.fromDate);
              const busy = pendingId === item.id;
              return (
                <tr key={item.id} data-busy={busy ? "true" : undefined}>
                  <td>
                    <button
                      type="button"
                      className="link cell-title"
                      onClick={() => onOpen(item)}
                      aria-label={`Xem chi tiết đơn nghỉ của ${item.employeeName}`}
                    >
                      {item.employeeName}
                    </button>
                    <span className="mono muted">{item.employeeId}</span>
                  </td>
                  <td>
                    <span className="badge">{LEAVE_TYPE_LABEL[item.leaveType]}</span>
                  </td>
                  <td className="tabular">
                    {formatDate(item.fromDate)} → {formatDate(item.toDate)}
                    <span className="muted">{sessionOf(item)}</span>
                  </td>
                  <td className="tabular">{item.days.toLocaleString("vi-VN")}</td>
                  <td>
                    {untilStart < 0 ? (
                      <span className="deadline deadline-danger">
                        Đã qua {number(Math.abs(untilStart))} ngày
                      </span>
                    ) : untilStart === 0 ? (
                      <span className="deadline deadline-danger">Bắt đầu hôm nay</span>
                    ) : (
                      <span className="deadline">Còn {number(untilStart)} ngày</span>
                    )}
                  </td>
                  <td>
                    <span className="truncate" style={{ maxWidth: 260, display: "block" }}>
                      {item.reason}
                    </span>
                  </td>
                  <td>
                    <div className="row items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onApprove(item)}
                        disabled={!canApprove || busy}
                        aria-label={`Duyệt đơn nghỉ của ${item.employeeName} từ ${formatDate(
                          item.fromDate,
                        )} đến ${formatDate(item.toDate)}`}
                        title={canApprove ? "Duyệt đơn này" : "Bạn không có quyền duyệt"}
                      >
                        <CheckGlyph /> Duyệt
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onReject(item)}
                        disabled={!canApprove || busy}
                        aria-label={`Từ chối đơn nghỉ của ${item.employeeName}`}
                        title={canApprove ? "Từ chối và ghi lý do" : "Bạn không có quyền duyệt"}
                      >
                        <RejectGlyph /> Từ chối
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

interface HistoryTableProps {
  rows: Decision[];
  loading: boolean;
  sort: HistorySort;
  onSort: (sort: HistorySort) => void;
}

export function HistoryTable({ rows, loading, sort, onSort }: HistoryTableProps) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">Lịch sử quyết định nghỉ phép đã lưu</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort(sort.key === "employeeName", sort.dir)}>
              <SortButton
                label="Nhân sự"
                active={sort.key === "employeeName"}
                direction={sort.dir}
                onClick={() =>
                  onSort({
                    key: "employeeName",
                    dir: nextDir(sort.dir, sort.key === "employeeName"),
                  })
                }
              />
            </th>
            <th scope="col">Loại nghỉ</th>
            <th scope="col">Thời gian nghỉ</th>
            <th scope="col" aria-sort={ariaSort(sort.key === "days", sort.dir)}>
              <SortButton
                label="Số ngày"
                active={sort.key === "days"}
                direction={sort.dir}
                onClick={() =>
                  onSort({ key: "days", dir: nextDir(sort.dir, sort.key === "days") })
                }
              />
            </th>
            <th scope="col">Quyết định</th>
            <th scope="col" aria-sort={ariaSort(sort.key === "decidedAt", sort.dir)}>
              <SortButton
                label="Thời điểm"
                active={sort.key === "decidedAt"}
                direction={sort.dir}
                onClick={() =>
                  onSort({
                    key: "decidedAt",
                    dir: nextDir(sort.dir, sort.key === "decidedAt"),
                  })
                }
              />
            </th>
            <th scope="col">Ghi chú</th>
          </tr>
        </thead>

        {loading ? (
          <SkeletonRows rows={5} columns={COLUMNS} />
        ) : (
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="cell-title">{row.employeeName}</span>
                  <span className="mono muted">{row.employeeId}</span>
                </td>
                <td>
                  <span className="badge">{LEAVE_TYPE_LABEL[row.leaveType]}</span>
                </td>
                <td className="tabular">
                  {formatDate(row.fromDate)} → {formatDate(row.toDate)}
                  <span className="muted">{sessionOf(row)}</span>
                </td>
                <td className="tabular">{row.days.toLocaleString("vi-VN")}</td>
                <td>
                  <span
                    className={row.status === "APPROVED" ? "badge badge-success" : "badge badge-danger"}
                  >
                    <span className="dot" />
                    {row.status === "APPROVED" ? "Đã duyệt" : "Từ chối"}
                  </span>
                  <span className="muted">{row.decidedBy}</span>
                </td>
                <td className="tabular">{formatDateTime(row.decidedAt)}</td>
                <td>
                  {row.decisionNote ? (
                    <span className="truncate" style={{ maxWidth: 240, display: "block" }}>
                      {row.decisionNote}
                    </span>
                  ) : (
                    <span className="subtle">Không ghi chú</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
