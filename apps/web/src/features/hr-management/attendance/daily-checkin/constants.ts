import type { AttendanceSource, AttendanceStatus } from "./types";

/** Permission catalog key owned by this branch — matches `@RequirePermission`. */
export const FEATURE_KEY = "hr-management/attendance/daily-checkin";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Status always reads as a word; the dot and the tone are decoration on top. */
export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  OPEN: "Chưa ghi giờ ra",
  COMPLETE: "Đủ giờ vào/ra",
  LOCKED: "Đã chốt",
};

export const STATUS_TONE: Record<AttendanceStatus, string> = {
  OPEN: "badge badge-warning",
  COMPLETE: "badge badge-success",
  LOCKED: "badge",
};

export const SOURCE_LABEL: Record<AttendanceSource, string> = {
  WEB: "Web",
  MOBILE: "Điện thoại",
  KIOSK: "Ki-ốt",
  MANUAL: "Nhập tay",
};

/** The API closes open records at this local time; the note in the footer says so. */
export const AUTO_CLOSE_TIME = "23:59";

export const EXPORT_FILE_PREFIX = "cham-cong";
