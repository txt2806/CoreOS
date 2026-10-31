import type { LeaveStatus, LeaveType } from "./types";

/** The key `@RequirePermission` uses in `leave-requests.controller.ts`. */
export const FEATURE_KEY = "hr-management/leaves/leave-requests";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Annual leave must be filed at least this many days ahead (BR-LV-10). */
export const LATE_SUBMISSION_DAYS = 3;

/** One request may not exceed 60 working days — the same cap the service enforces. */
export const MAX_WORKING_DAYS = 60;

export const EXPORT_FILE_PREFIX = "don-nghi-phep";

/** Status is always shown as a dot plus this word. */
export const STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

export const STATUS_TONE: Record<LeaveStatus, string> = {
  PENDING: "badge badge-warning",
  APPROVED: "badge badge-success",
  REJECTED: "badge badge-danger",
  CANCELLED: "badge",
};

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: "Phép năm",
  SICK: "Nghỉ ốm",
  UNPAID: "Không lương",
  OTHER: "Khác",
};

/**
 * The API stores a request per calendar window and derives `days` from weekdays,
 * so a half-day session cannot be represented. The labels stay here so the sheet
 * and the table describe the same thing.
 */
export const SESSION_SINGLE_DAY = "Cả ngày";
export const SESSION_MULTI_DAY = "Nhiều ngày";
