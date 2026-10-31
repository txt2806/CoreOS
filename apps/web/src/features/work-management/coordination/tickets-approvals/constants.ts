import type { Quorum, SlaState, StepStatus, VoteDecision } from "./types";

/** Exact key used by `@RequirePermission(FEATURE, …)` in the controller. */
export const FEATURE_KEY = "work-management/coordination/tickets-approvals";

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** The API names steps and votes in English; the UI never shows raw enums. */
export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  WAITING: "Chưa tới lượt",
  PENDING: "Đang chờ quyết định",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  SKIPPED: "Bỏ qua",
};

export const STEP_STATUS_TONE: Record<StepStatus, string> = {
  WAITING: "badge",
  PENDING: "badge badge-warning",
  APPROVED: "badge badge-success",
  REJECTED: "badge badge-danger",
  SKIPPED: "badge",
};

export const VOTE_LABEL: Record<VoteDecision, string> = {
  PENDING: "Chưa bỏ phiếu",
  APPROVED: "Đồng ý",
  REJECTED: "Từ chối",
};

export const VOTE_TONE: Record<VoteDecision, string> = {
  PENDING: "badge",
  APPROVED: "badge badge-success",
  REJECTED: "badge badge-danger",
};

export const SLA_LABEL: Record<SlaState, string> = {
  ON_TRACK: "Đúng hạn",
  DUE_SOON: "Sắp tới hạn",
  OVERDUE: "Quá hạn",
};

export const SLA_TONE: Record<SlaState, string> = {
  ON_TRACK: "badge badge-success",
  DUE_SOON: "badge badge-warning",
  OVERDUE: "badge badge-danger",
};

export const QUORUM_LABEL: Record<Quorum, string> = {
  ANY: "Một người duyệt là đủ",
  ALL: "Cần toàn bộ người duyệt",
  MAJORITY: "Cần đa số người duyệt",
};

export const REQUEST_STATUS_TONE: Record<string, string> = {
  "Chờ duyệt": "badge badge-warning",
  "Đã duyệt": "badge badge-success",
  "Từ chối": "badge badge-danger",
  "Đã hủy": "badge",
};

/** A reject reason shorter than this is refused by the API. */
export const MIN_REJECT_NOTE = 3;
