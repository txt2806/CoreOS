import type { ExplanationStatus, ExplanationType } from "./types";

/** Exactly the key used by `@RequirePermission` in the controller. */
export const FEATURE_KEY = "hr-management/attendance/checkin-explanations";

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 50;

/** BR-ATT: a correction must be filed within three working days of the day itself. */
export const EXPLANATION_DEADLINE_WORKDAYS = 3;

export const STATUS_LABEL: Record<ExplanationStatus, string> = {
  PENDING: "Chờ quản lý duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã huỷ",
};

export const STATUS_TONE: Record<ExplanationStatus, string> = {
  PENDING: "badge badge-warning",
  APPROVED: "badge badge-success",
  REJECTED: "badge badge-danger",
  CANCELLED: "badge",
};

export const STATUS_HINT: Record<ExplanationStatus, string> = {
  PENDING: "Đơn đang chờ người có quyền duyệt xử lý.",
  APPROVED: "Giờ công đã được ghi nhận theo đề nghị.",
  REJECTED: "Đơn bị từ chối, giờ công giữ nguyên.",
  CANCELLED: "Nhân sự tự huỷ đơn trước khi được duyệt.",
};

export const TYPE_LABEL: Record<ExplanationType, string> = {
  FORGOT_CHECKIN: "Quên chấm công vào",
  MISSED_CHECKOUT: "Quên chấm công ra",
  WRONG_TIME: "Sai giờ chấm công",
  OTHER: "Lý do khác",
};

export const TYPE_HINT: Record<ExplanationType, string> = {
  FORGOT_CHECKIN: "Đề nghị bổ sung giờ vào cho ngày đã chọn.",
  MISSED_CHECKOUT: "Đề nghị bổ sung giờ ra cho ngày đã chọn.",
  WRONG_TIME: "Đề nghị sửa cả giờ vào và giờ ra đã ghi.",
  OTHER: "Dùng khi giờ công sai vì lý do khác hai trường hợp trên.",
};

export const EXPORT_FILE_PREFIX = "giai-trinh-cham-cong";
