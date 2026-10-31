"use client";

import type { ReactNode } from "react";
import { donePercent, formatDate, targetTone } from "../format";
import { MILESTONE_STATUSES, type Milestone } from "../types";
import { AlertGlyph, MilestoneStatusBadge, SkeletonRows, SortButton } from "./primitives";

export type ColumnKey =
  | "name"
  | "status"
  | "targetDate"
  | "progress"
  | "contractRef"
  | "project"
  | "updatedAt";

export type SortKey = ColumnKey;
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: "Mốc",
  status: "Trạng thái",
  targetDate: "Ngày mục tiêu",
  progress: "Công việc",
  contractRef: "Tham chiếu hợp đồng",
  project: "Dự án",
  updatedAt: "Cập nhật",
};

/** Name, status and target date are structural; the rest can be hidden. */
export const ALL_COLUMNS: ColumnKey[] = [
  "name",
  "status",
  "targetDate",
  "progress",
  "contractRef",
  "project",
  "updatedAt",
];

export const OPTIONAL_COLUMNS: ColumnKey[] = [
  "contractRef",
  "project",
  "updatedAt",
  "progress",
];

const STATUS_RANK: Record<string, number> = Object.fromEntries(
  MILESTONE_STATUSES.map((status, index) => [status, index]),
);

/**
 * Sorting runs on the rows this page already holds: `GET /milestones` has no
 * `sort` parameter, so the control is scoped to the loaded page.
 */
export function sortMilestones(milestones: Milestone[], sort: SortState): Milestone[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (milestone: Milestone): number | string => {
    switch (sort.key) {
      case "status":
        return STATUS_RANK[milestone.status] ?? 99;
      case "progress": {
        const done = donePercent(milestone.itemCount, milestone.completedCount);
        return done === null ? -1 : done;
      }
      case "contractRef":
        return milestone.contractRef;
      case "project":
        return milestone.projectId;
      case "updatedAt":
        return milestone.updatedAt;
      case "targetDate":
        return milestone.targetDate;
      default:
        return milestone.name;
    }
  };
  return [...milestones].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") return factor * (a - b);
    return factor * String(a).localeCompare(String(b), "vi");
  });
}

export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) return { key, dir: key === "targetDate" ? "asc" : "desc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

interface MilestoneTableProps {
  milestones: Milestone[];
  loading: boolean;
  sort: SortState;
  onSort: (key: SortKey) => void;
  hidden: ColumnKey[];
  projectName: (projectId: string) => string;
  onOpen: (milestone: Milestone) => void;
}

function TargetDate({ milestone }: { milestone: Milestone }) {
  const tone = targetTone(milestone.targetDate, milestone.status);
  if (tone === "overdue")
    return (
      <span className="deadline deadline-danger">
        <AlertGlyph /> {formatDate(milestone.targetDate)}
      </span>
    );
  if (tone === "soon")
    return (
      <span className="deadline deadline-warning">
        {formatDate(milestone.targetDate)}
      </span>
    );
  return <span className="tabular">{formatDate(milestone.targetDate)}</span>;
}

function cell(
  milestone: Milestone,
  key: ColumnKey,
  projectName: (projectId: string) => string,
  onOpen: (milestone: Milestone) => void,
): ReactNode {
  switch (key) {
    case "name":
      return (
        <div className="stack gap-1">
          <button
            type="button"
            className="link truncate"
            onClick={() => onOpen(milestone)}
            title={milestone.name}
          >
            {milestone.name}
          </button>
          <span className="muted truncate">
            {milestone.description || "Chưa có mô tả"}
          </span>
        </div>
      );
    case "status":
      return <MilestoneStatusBadge status={milestone.status} />;
    case "targetDate":
      return <TargetDate milestone={milestone} />;
    case "progress": {
      const done = donePercent(milestone.itemCount, milestone.completedCount);
      return (
        <span className="tabular">
          {done === null
            ? "Chưa gắn việc"
            : `${milestone.completedCount.toLocaleString("vi-VN")}/${milestone.itemCount.toLocaleString("vi-VN")} · ${done}%`}
        </span>
      );
    }
    case "contractRef":
      return milestone.contractRef || <span className="subtle">—</span>;
    case "project":
      return <span className="truncate">{projectName(milestone.projectId)}</span>;
    case "updatedAt":
      return <span className="tabular">{formatDate(milestone.updatedAt)}</span>;
  }
}

export function MilestoneTable({
  milestones,
  loading,
  sort,
  onSort,
  hidden,
  projectName,
  onOpen,
}: MilestoneTableProps) {
  const columns = ALL_COLUMNS.filter((key) => !hidden.includes(key));

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Danh sách mốc của trang hiện tại, sắp xếp theo cột đang chọn.
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
            rows={Math.min(8, Math.max(3, milestones.length || 6))}
            columns={columns.length}
          />
        ) : (
          <tbody>
            {milestones.map((milestone) => (
              <tr key={milestone.id}>
                {columns.map((key) => (
                  <td key={key}>{cell(milestone, key, projectName, onOpen)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
