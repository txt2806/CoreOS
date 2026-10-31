import type { NotificationSource } from "./types";

/** Key of this branch in the permission catalog. */
export const FEATURE_KEY = "work-management/coordination/notifications";

export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

export const SOURCE_LABEL: Record<NotificationSource, string> = {
  task: "Công việc",
  comment: "Bình luận",
  message: "Tin nhắn",
  meeting: "Cuộc họp",
  request: "Đề xuất",
};

export const SOURCE_TONE: Record<NotificationSource, string> = {
  task: "badge badge-info",
  comment: "badge badge-accent",
  message: "badge",
  meeting: "badge badge-info",
  request: "badge badge-warning",
};

/**
 * Used only when the SSE stream (`GET /notifications/stream`) cannot be opened —
 * the stream pushes new and deleted notices to the tab.
 */
export const POLL_INTERVAL_MS = 60_000;

export const BODY_EXCERPT = 160;
