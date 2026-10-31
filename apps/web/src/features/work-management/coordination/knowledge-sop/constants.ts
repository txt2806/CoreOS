import type { NoteStatus } from "./types";

/**
 * Key of this branch in the permission catalog. The `notes` controller declares
 * no `@RequirePermission`, so the screen must not hide write actions behind this
 * key — it is only used to label the branch.
 */
export const FEATURE_KEY = "work-management/coordination/knowledge-sop";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** DTO caps: `fields.content` 20.000, `fields.tags`/`fields.category` 1.000. */
export const CONTENT_LIMIT = 20_000;
export const TAGS_LIMIT = 1_000;
export const CATEGORY_LIMIT = 1_000;

export const STATUS_TONE: Record<NoteStatus, string> = {
  "Bản nháp": "badge badge-warning",
  "Đã xuất bản": "badge badge-success",
  "Lưu trữ": "badge",
};

export const EXCERPT_LENGTH = 180;
