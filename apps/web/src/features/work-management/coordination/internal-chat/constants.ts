import type { ConversationStatus } from "./types";

/** Exact key of this branch in the permission catalog. */
export const FEATURE_KEY = "work-management/coordination/internal-chat";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

export const STATUS_TONE: Record<ConversationStatus, string> = {
  "Đang mở": "badge badge-success",
  "Đã đóng": "badge",
};

/**
 * No websocket endpoint exists for messages, so the screen re-reads the page on
 * focus and on this interval. Long enough to stay quiet, short enough to feel
 * near-live for an ops inbox.
 */
export const POLL_INTERVAL_MS = 30_000;

export const COMMENT_LIMIT = 500;
