import type { AllocationStatus } from "./types";

/** Exact key the backend guards with `@RequirePermission` in `resource-capacity.controller.ts`. */
export const FEATURE_KEY = "hr-management/employees/resource-capacity";

export const PAGE_SIZES = [10, 25, 50] as const;
/**
 * One summary read per row is what makes the utilisation column real, so the
 * default page stays small; raising it multiplies the number of requests.
 */
export const DEFAULT_PAGE_SIZE = 10;

export const ALLOCATION_STATUS_LABEL: Record<AllocationStatus, string> = {
  PLANNED: "Dự kiến",
  ACTIVE: "Đang chạy",
  CANCELLED: "Đã huỷ",
};

export const ALLOCATION_STATUS_TONE: Record<AllocationStatus, string> = {
  PLANNED: "badge",
  ACTIVE: "badge badge-success",
  CANCELLED: "badge badge-danger",
};

/** Mirrors the zod limits so the form refuses a value the API would reject. */
export const HOURS_PER_DAY_MIN = 1;
export const HOURS_PER_DAY_MAX = 24;
export const DAYS_MIN = 0;
export const DAYS_MAX = 366;
export const PERCENT_MIN = 0;
export const PERCENT_MAX = 200;
export const NOTE_LIMIT = 500;

export const EXPORT_FILE_PREFIX = "cong-suat";
