"use client";

import type { ReactNode } from "react";
import { TASK_STATUSES, type Task } from "../types";
import { DeadlineCell, PriorityBadge, SkeletonRows, SortButton, StatusBadge } from "./primitives";

export type ColumnKey =
  | "code"
  | "name"
  | "status"
  | "priority"
  | "assignee"
  | "reviewer"
  | "date"
  | "progress";

export type SortKey = ColumnKey;
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  code: "Mã",
  name: "Công việc",
  status: "Trạng thái",
  priority: "Ưu tiên",
  assignee: "Phụ trách",
  reviewer: "Kiểm tra",
  date: "Hạn",
  progress: "Tiến độ",
};

/** Code, name, status and deadline are structural; the rest can be hidden. */
export const ALL_COLUMNS: ColumnKey[] = [
  "code",
  "name",
  "status",
  "priority",
  "assignee",
  "reviewer",
  "date",
  "progress",
];

export const OPTIONAL_COLUMNS: ColumnKey[] = [
  "priority",
  "assignee",
  "reviewer",
  "progress",
];

const NUMERIC: ColumnKey[] = ["progress"];

const PRIORITY_RANK: Record<string, number> = {
  "Khẩn cấp": 4,
  Cao: 3,
  "Trung bình": 2,
  Thấp: 1,
};

const STATUS_RANK: Record<string, number> = Object.fromEntries(
  TASK_STATUSES.map((status, index) => [status, index]),
);

/**
 * Sorting is applied to the rows the page actually holds. The list endpoint has
 * no `sort` parameter, so the control is labelled as scoped to the loaded page
 * instead of pretending the whole table was ordered.
 */
export function sortTasks(tasks: Task[], sort: SortState): Task[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (task: Task): number | string => {
    switch (sort.key) {
      case "status":
        return STATUS_RANK[task.status] ?? 99;
      case "priority":
        return PRIORITY_RANK[task.fields.priority ?? ""] ?? 0;
      case "progress":
        return task.fields.progress ?? 0;
      case "date":
      case "code":
      case "assignee":
      case "reviewer":
        return task[sort.key] ?? "";
      default:
        return task.name;
    }
  };
  return [...tasks].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") return factor * (a - b);
    return factor * String(a).localeCompare(String(b), "vi");
  });
}

export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) return { key, dir: key === "date" ? "asc" : "desc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

interface TaskTableProps {
  tasks: Task[];
  loading: boolean;
  sort: SortState;
  onSort: (key: SortKey) => void;
  hidden: ColumnKey[];
  selected: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpen: (task: Task) => void;
}

function cell(task: Task, key: ColumnKey, onOpen: (task: Task) => void): ReactNode {
  switch (key) {
    case "code":
      return <span className="mono">{task.code}</span>;
    case "name":
      return (
        <div className="stack gap-1">
          <button
            type="button"
            className="link truncate"
            onClick={() => onOpen(task)}
            title={task.name}
          >
            {task.name}
          </button>
          <span className="muted truncate">{task.scope || "Chưa gắn phạm vi"}</span>
        </div>
      );
    case "status":
      return <StatusBadge status={task.status} />;
    case "priority":
      return <PriorityBadge value={task.fields.priority} />;
    case "assignee":
      return task.assignee || <span className="subtle">Chưa giao</span>;
    case "reviewer":
      return task.reviewer || <span className="subtle">Chưa chỉ định</span>;
    case "date":
      return <DeadlineCell date={task.date} status={task.status} />;
    case "progress":
      return (
        <span className="tabular">
          {typeof task.fields.progress === "number" ? `${task.fields.progress}%` : "—"}
        </span>
      );
  }
}

export function TaskTable({
  tasks,
  loading,
  sort,
  onSort,
  hidden,
  selected,
  onSelect,
  onSelectAll,
  onOpen,
}: TaskTableProps) {
  const columns = ALL_COLUMNS.filter((key) => !hidden.includes(key));
  const allSelected = tasks.length > 0 && tasks.every((task) => selected.includes(task.id));

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Danh sách công việc của trang hiện tại, sắp xếp theo cột đang chọn.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ width: 44 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                aria-label={
                  allSelected
                    ? "Bỏ chọn toàn bộ công việc trên trang"
                    : "Chọn toàn bộ công việc trên trang"
                }
              />
            </th>
            {columns.map((key) => (
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
          <SkeletonRows rows={Math.min(8, Math.max(3, tasks.length || 6))} columns={columns.length + 1} />
        ) : (
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} aria-selected={selected.includes(task.id)}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(task.id)}
                    onChange={() => onSelect(task.id)}
                    aria-label={`Chọn ${task.code} — ${task.name}`}
                  />
                </td>
                {columns.map((key) => (
                  <td key={key} className={NUMERIC.includes(key) ? "num" : undefined}>
                    {cell(task, key, onOpen)}
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
