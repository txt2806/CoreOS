import type { ReportStatus } from "./types";

/**
 * Reports share the `workspace-today` permission branch with the daily
 * workspace and the calendar — the catalog holds a single key for all three.
 */
export const FEATURE_KEY = "work-management/coordination/workspace-today";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 100;

export const STATUS_TONE: Record<ReportStatus, string> = {
  "Bản nháp": "badge",
  "Đã phát hành": "badge badge-success",
};

/** Titles stay short so the breakdown widgets fit a bento-4 cell. */
export const STATUS_LABEL: Record<ReportStatus, string> = {
  "Bản nháp": "Bản nháp",
  "Đã phát hành": "Đã phát hành",
};

export const EXPORT_FILE_PREFIX = "bao-cao";
