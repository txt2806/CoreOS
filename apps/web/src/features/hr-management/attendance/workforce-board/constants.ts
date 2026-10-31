import type { PresenceStatus } from "./types";

/** Permission catalog key owned by this branch — matches `@RequirePermission`. */
export const FEATURE_KEY = "hr-management/attendance/workforce-board";

export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

export const STATUS_LABEL: Record<PresenceStatus, string> = {
  IN_OFFICE: "Tại văn phòng",
  REMOTE: "Làm từ xa",
  OFF_SITE: "Công tác ngoài",
  LEAVE: "Đang nghỉ phép",
};

export const STATUS_TONE: Record<PresenceStatus, string> = {
  IN_OFFICE: "badge badge-success",
  REMOTE: "badge badge-info",
  OFF_SITE: "badge badge-accent",
  LEAVE: "badge badge-warning",
};

export const STATUS_HINT: Record<PresenceStatus, string> = {
  IN_OFFICE: "Có mặt tại văn phòng theo ca đã khai báo",
  REMOTE: "Làm việc từ xa, không cần gửi đơn giải trình",
  OFF_SITE: "Đang công tác ngoài văn phòng",
  LEAVE: "Đang nghỉ theo đơn đã duyệt",
};

/** Board order: the places people are working from first, leave last. */
export const BOARD_ORDER: PresenceStatus[] = ["IN_OFFICE", "REMOTE", "OFF_SITE", "LEAVE"];

export const EXPORT_FILE_PREFIX = "hien-dien";
