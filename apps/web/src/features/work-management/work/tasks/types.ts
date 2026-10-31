/** Mirrors `apps/api/src/features/work-management/work/tasks/dto/tasks.dto.ts`. */
export const TASK_STATUSES = [
  "Cần làm",
  "Đang làm",
  "Làm lại",
  "Chờ kiểm tra",
  "Hoãn lại",
  "Hoàn thành",
  "Đã hủy",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Thấp", "Trung bình", "Cao", "Khẩn cấp"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskFields {
  project?: string;
  priority?: TaskPriority;
  progress?: number;
  startDate?: string;
  tags?: string;
  checklist?: ChecklistItem[];
}

export interface Task {
  id: string;
  module: "tasks";
  code: string;
  name: string;
  scope: string;
  status: TaskStatus;
  date: string;
  assignee: string;
  reviewer: string;
  note: string;
  fields: TaskFields;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  code: string;
  name: string;
  scope: string;
  date: string;
  assignee: string;
  reviewer: string;
  note: string;
  fields: TaskFields;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PermissionSnapshot {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  actions: string[];
}

export interface AllowedMove {
  code: string;
  to: string;
  blockedBy: number;
}

export interface AllowedEntry {
  taskId: string;
  status: string;
  allowed: AllowedMove[];
  restoreStatus: string | null;
}

export interface TaskTransition {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  actorName: string;
  actorRole: string;
  occurredAt: string;
}

/** Shape of `GET /task-workflow/tasks/:taskId/state`. */
export interface TaskState {
  task: {
    id: string;
    code: string;
    name: string;
    status: string;
    date: string;
    assignee: string;
    reviewer: string;
    version: number;
  };
  allowed: AllowedMove[];
  restoreStatus: string | null;
  history: TaskTransition[];
}

export type TaskAction = "view" | "create" | "update" | "delete" | "approve";
