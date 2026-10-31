/** Permission catalog keys this screen reads. They mirror the API decorators. */
export const FEATURE_KEY = "work-management/coordination/workspace-today";
export const TASKS_KEY = "work-management/work/tasks";
export const ATTENDANCE_KEY = "hr-management/attendance/daily-checkin";
export const REQUESTS_KEY = "work-management/coordination/tickets-approvals";

/** A dashboard shows the first few rows; the full list lives on its own screen. */
export const TASK_LIMIT = 5;
export const NOTICE_LIMIT = 4;
export const APPROVAL_LIMIT = 3;

export const TASK_STATUS_TONE: Record<string, string> = {
  "Cần làm": "badge",
  "Đang làm": "badge badge-info",
  "Làm lại": "badge badge-warning",
  "Chờ kiểm tra": "badge badge-accent",
  "Hoãn lại": "badge",
  "Hoàn thành": "badge badge-success",
  "Đã hủy": "badge badge-danger",
};

export const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  OPEN: "Đang trong ca",
  COMPLETE: "Đã đủ giờ vào/ra",
  LOCKED: "Đã khoá sổ công",
};
