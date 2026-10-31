import type { MilestoneStatus, QaOutcome } from "./types";

/**
 * Exact key the backend guards with `@RequirePermission` in
 * `milestones-qa/milestones-qa.controller.ts` and `acceptance.controller.ts`.
 */
export const FEATURE_KEY = "work-management/projects/milestones-qa";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** The API speaks English enums; every label the user reads is Vietnamese. */
export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PLANNED: "Lên kế hoạch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  MISSED: "Quá hạn",
  CANCELLED: "Đã huỷ",
};

export const MILESTONE_STATUS_TONE: Record<MilestoneStatus, string> = {
  PLANNED: "badge",
  IN_PROGRESS: "badge badge-info",
  COMPLETED: "badge badge-success",
  MISSED: "badge badge-danger",
  CANCELLED: "badge",
};

export const QA_OUTCOME_LABEL: Record<QaOutcome, string> = {
  PASS: "Đạt",
  FAIL: "Không đạt",
  BLOCKED: "Bị chặn",
};

export const QA_OUTCOME_TONE: Record<QaOutcome, string> = {
  PASS: "badge badge-success",
  FAIL: "badge badge-danger",
  BLOCKED: "badge badge-warning",
};

/**
 * `GET /milestones?status=` filters the *stored* status, and `MISSED` is only ever
 * derived from `targetDate` — filtering by it would always return nothing, so the
 * select omits it and the table shows overdue per row instead.
 */
export const FILTER_STATUSES: MilestoneStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

/** A milestone inside this window is called out before it becomes overdue. */
export const SOON_WINDOW_DAYS = 7;

export const EXPORT_FILE_PREFIX = "moc-va-qa";
