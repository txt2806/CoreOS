import type { AssignmentSource, ShiftStatus } from "./types";

/** Exactly the key used by `@RequirePermission` in the controller. */
export const FEATURE_KEY = "hr-management/attendance/shifts-schedules";

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

export const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = {
  ACTIVE: "Đang áp dụng",
  INACTIVE: "Đã ngừng",
};

export const SHIFT_STATUS_TONE: Record<ShiftStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge",
};

export const SOURCE_LABEL: Record<AssignmentSource, string> = {
  MANUAL: "Gán tay",
  PATTERN: "Theo mẫu tuần",
};

export const SOURCE_TONE: Record<AssignmentSource, string> = {
  MANUAL: "badge badge-info",
  PATTERN: "badge badge-accent",
};

/** 1 = Monday … 7 = Sunday, the numbering the API and the database use. */
export const WEEKDAYS: { value: number; short: string; label: string }[] = [
  { value: 1, short: "T2", label: "Thứ hai" },
  { value: 2, short: "T3", label: "Thứ ba" },
  { value: 3, short: "T4", label: "Thứ tư" },
  { value: 4, short: "T5", label: "Thứ năm" },
  { value: 5, short: "T6", label: "Thứ sáu" },
  { value: 6, short: "T7", label: "Thứ bảy" },
  { value: 7, short: "CN", label: "Chủ nhật" },
];

export const EXPORT_FILE_PREFIX = "lich-phan-ca";

/** The API caps one bulk write at 200 days; the copy warns before the round trip. */
export const MAX_BULK_DAYS = 200;

export type WorkspaceTab = "assignments" | "shifts" | "patterns";

export const TAB_LABEL: Record<WorkspaceTab, string> = {
  assignments: "Lịch phân ca",
  shifts: "Ca làm việc",
  patterns: "Mẫu tuần",
};
