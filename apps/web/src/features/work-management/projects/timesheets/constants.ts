import type { PeriodStatus } from "./types";

/**
 * Exact key the backend guards with `@RequirePermission` in
 * `timesheets/timesheets.controller.ts`. Only the GETs carry the guard; writes are
 * scoped by ownership and period status, which the screen mirrors.
 */
export const FEATURE_KEY = "work-management/projects/timesheets";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  OPEN: "Đang mở",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị trả lại",
};

export const PERIOD_STATUS_TONE: Record<PeriodStatus, string> = {
  OPEN: "badge badge-info",
  SUBMITTED: "badge badge-warning",
  APPROVED: "badge badge-success",
  REJECTED: "badge badge-danger",
};

/** Filter chips follow the DTO enum order so the UI never offers a status the API rejects. */
export const FILTER_STATUSES: PeriodStatus[] = [
  "OPEN",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

/**
 * Rules mirrored from the DTO so the form can refuse a bad entry before the
 * request; the API remains the authority and repeats every check.
 */
export const MINUTE_STEP = 15;
export const DAY_LIMIT_MINUTES = 720;
export const DAY_THRESHOLD_MINUTES = 480;
export const WEEK_THRESHOLD_MINUTES = 2400;

/** Minutes are chosen from this list so a typed value can never break the 15-minute grid. */
export const MINUTE_CHOICES: number[] = Array.from(
  { length: DAY_LIMIT_MINUTES / MINUTE_STEP },
  (_, index) => (index + 1) * MINUTE_STEP,
);

export const EXPORT_FILE_PREFIX = "timesheet";
