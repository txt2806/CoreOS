"use client";

import type { ReactNode } from "react";
import { PROJECT_STATUSES, type Project } from "../types";
import { formatDate } from "../format";
import { ProgressCell, SkeletonRows, SortButton, StatusBadge } from "./primitives";

export type ColumnKey =
  | "code"
  | "name"
  | "status"
  | "assignee"
  | "date"
  | "progress"
  | "team"
  | "members";

export type SortKey = ColumnKey;
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  code: "Mã",
  name: "Dự án",
  status: "Trạng thái",
  assignee: "Quản lý",
  date: "Mốc thời gian",
  progress: "Tiến độ",
  team: "Nhóm",
  members: "Thành viên",
};

/** Code, name, status and the date anchor the row; the rest may be hidden. */
export const ALL_COLUMNS: ColumnKey[] = [
  "code",
  "name",
  "status",
  "assignee",
  "date",
  "progress",
  "team",
  "members",
];

export const OPTIONAL_COLUMNS: ColumnKey[] = ["assignee", "team", "members", "progress"];

const NUMERIC: ColumnKey[] = ["progress"];

const STATUS_RANK: Record<string, number> = Object.fromEntries(
  PROJECT_STATUSES.map((status, index) => [status, index]),
);

/**
 * Sorting runs on the rows this page already holds: `GET /projects` exposes no
 * `sort` parameter, so the control is scoped to the loaded page instead of
 * implying a server-side order that does not exist.
 */
export function sortProjects(projects: Project[], sort: SortState): Project[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (project: Project): number | string => {
    switch (sort.key) {
      case "status":
        return STATUS_RANK[project.status] ?? 99;
      case "progress":
        return project.fields.progress ?? 0;
      case "team":
        return project.fields.team ?? "";
      case "members":
        return project.fields.members ?? "";
      case "code":
      case "assignee":
      case "date":
        return project[sort.key] ?? "";
      default:
        return project.name;
    }
  };
  return [...projects].sort((left, right) => {
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

interface ProjectTableProps {
  projects: Project[];
  loading: boolean;
  sort: SortState;
  onSort: (key: SortKey) => void;
  hidden: ColumnKey[];
  onOpen: (project: Project) => void;
}

function cell(
  project: Project,
  key: ColumnKey,
  onOpen: (project: Project) => void,
): ReactNode {
  switch (key) {
    case "code":
      return <span className="mono">{project.code}</span>;
    case "name":
      return (
        <div className="stack gap-1">
          <button
            type="button"
            className="link truncate"
            onClick={() => onOpen(project)}
            title={project.name}
          >
            {project.name}
          </button>
          <span className="muted truncate">{project.scope || "Chưa gắn phạm vi"}</span>
        </div>
      );
    case "status":
      return <StatusBadge status={project.status} />;
    case "assignee":
      return project.assignee || <span className="subtle">Chưa chỉ định</span>;
    case "date":
      return <span className="tabular">{formatDate(project.date)}</span>;
    case "progress":
      return <ProgressCell value={project.fields.progress} />;
    case "team":
      return project.fields.team || <span className="subtle">—</span>;
    case "members":
      return project.fields.members || <span className="subtle">—</span>;
  }
}

export function ProjectTable({
  projects,
  loading,
  sort,
  onSort,
  hidden,
  onOpen,
}: ProjectTableProps) {
  const columns = ALL_COLUMNS.filter((key) => !hidden.includes(key));

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Danh sách dự án của trang hiện tại, sắp xếp theo cột đang chọn.
        </caption>
        <thead>
          <tr>
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
          <SkeletonRows
            rows={Math.min(8, Math.max(3, projects.length || 6))}
            columns={columns.length}
          />
        ) : (
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                {columns.map((key) => (
                  <td key={key} className={NUMERIC.includes(key) ? "num" : undefined}>
                    {cell(project, key, onOpen)}
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
