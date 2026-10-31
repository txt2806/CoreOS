import type { EventStatus } from "./types";

/**
 * Calendar and reports live inside the `workspace-today` branch, so the
 * permission catalog holds one key for all three screens.
 */
export const FEATURE_KEY = "work-management/coordination/workspace-today";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 100;

export const STATUS_TONE: Record<EventStatus, string> = {
  "Đã lên lịch": "badge",
  "Đang diễn ra": "badge badge-info",
  "Hoàn thành": "badge badge-success",
  "Đã hủy": "badge badge-danger",
};

/** Monday-first, matching the working week of the tenant. */
export const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

export const KIND_TONE: Record<string, string> = {
  "Cuộc họp": "chip",
  "Thời gian tập trung": "chip",
  "Sự kiện": "chip",
};

export const EXPORT_FILE_PREFIX = "lich-lam-viec";
