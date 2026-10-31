import type { PeriodStatus } from "./types";

/** Exactly the key used by `@RequirePermission` in the controller. */
export const FEATURE_KEY = "hr-management/attendance/attendance-reports";

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  DRAFT: "Đang tổng hợp",
  CLOSED: "Đã chốt",
};

export const PERIOD_STATUS_TONE: Record<PeriodStatus, string> = {
  DRAFT: "badge badge-warning",
  CLOSED: "badge badge-success",
};

export const PERIOD_STATUS_HINT: Record<PeriodStatus, string> = {
  DRAFT: "Còn thêm và sửa được dòng công.",
  CLOSED: "Chỉ đọc; phải mở lại thành nháp mới sửa được.",
};

/** The API caps one line at 31 days across the three day columns. */
export const MAX_DAYS_PER_LINE = 31;
export const MAX_OVERTIME_HOURS = 400;

export const EXPORT_FILE_PREFIX = "bang-cong";

/**
 * Columns the API does not expose. The screen states this openly instead of
 * showing zeros that would read as “no lateness”.
 */
export const UNAVAILABLE_METRICS: { label: string; reason: string }[] = [
  {
    label: "Phút đi muộn",
    reason: "chưa có trường tổng hợp phút đi muộn trong kỳ công",
  },
  {
    label: "Phút về sớm",
    reason: "chưa có trường tổng hợp phút về sớm trong kỳ công",
  },
  {
    label: "Phút làm việc thực tế",
    reason: "chưa có trường tổng hợp phút làm việc thực tế trong kỳ công",
  },
  {
    label: "Lần thiếu giờ ra",
    reason: "chưa có trường đếm lần thiếu giờ ra trong kỳ công",
  },
  {
    label: "Ngày vắng không phép",
    reason: "chưa có trường đếm ngày vắng không phép trong kỳ công",
  },
];
