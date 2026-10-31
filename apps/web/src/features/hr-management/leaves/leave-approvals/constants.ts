import type { DecisionStatus, LeaveType } from "./types";

/** The key `@RequirePermission` uses in `hr-management.leaves.controller.ts`. */
export const FEATURE_KEY = "hr-management/leaves/leave-approvals";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/**
 * `LeaveRequestsRepository.pending()` hard-caps the queue at 200 rows and takes no
 * query string, so the queue is paged in the browser — the footnote says so.
 */
export const QUEUE_LIMIT = 200;

/** `decisionBody.note` is capped at 500 characters. */
export const NOTE_MAX = 500;

/** A rejection is only valid with a reason, so the form refuses an empty note. */
export const NOTE_MIN = 10;

export const DECISION_LABEL: Record<DecisionStatus, string> = {
  APPROVED: "Duyệt",
  REJECTED: "Từ chối",
};

export const DECISION_TONE: Record<DecisionStatus, string> = {
  APPROVED: "badge badge-success",
  REJECTED: "badge badge-danger",
};

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: "Phép năm",
  SICK: "Nghỉ ốm",
  UNPAID: "Không lương",
  OTHER: "Khác",
};

/** A request whose window already started cannot wait any longer. */
export const URGENT_DAYS = 3;

/**
 * The API stores one record per calendar window and derives `days` from weekdays,
 * so there is no half-day session column. These labels keep the screen honest
 * about what it can and cannot show.
 */
export const SESSION_SINGLE_DAY = "Cả ngày";
export const SESSION_MULTI_DAY = "Nhiều ngày";
