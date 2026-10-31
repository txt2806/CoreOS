import type { TaskPriority, TaskStatus } from "./types";

/** Permission catalog key owned by this branch. */
export const FEATURE_KEY = "work-management/work/tasks";
export const WORKFLOW_KEY = "work-management/work/task-workflow";
export const COMMENTS_KEY = "work-management/work/task-comments";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Vietnamese labels stay in one place so filters, badges and forms agree. */
export const STATUS_TONE: Record<TaskStatus, string> = {
  "Cần làm": "badge",
  "Đang làm": "badge badge-info",
  "Làm lại": "badge badge-warning",
  "Chờ kiểm tra": "badge badge-accent",
  "Hoãn lại": "badge",
  "Hoàn thành": "badge badge-success",
  "Đã hủy": "badge badge-danger",
};

export const PRIORITY_TONE: Record<TaskPriority, string> = {
  Thấp: "badge",
  "Trung bình": "badge badge-info",
  Cao: "badge badge-warning",
  "Khẩn cấp": "badge badge-danger",
};

/** Column order on the board: work in flight first, closed work last. */
export const BOARD_COLUMNS: TaskStatus[] = [
  "Cần làm",
  "Đang làm",
  "Làm lại",
  "Chờ kiểm tra",
  "Hoãn lại",
  "Hoàn thành",
  "Đã hủy",
];

export const OPEN_STATUSES: TaskStatus[] = [
  "Cần làm",
  "Đang làm",
  "Làm lại",
  "Chờ kiểm tra",
  "Hoãn lại",
];

/** A deadline inside this window is "sắp đến hạn" rather than "quá hạn". */
export const SOON_WINDOW_DAYS = 3;

export const EXPORT_FILE_PREFIX = "cong-viec";
