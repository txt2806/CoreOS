import type { Status } from "./types";

/** Exact `FEATURE` used by `@RequirePermission` in the controller. */
export const FEATURE_KEY = "tenant-system/organization/work-policies";

export const PAGE_SIZES = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = 10;

/** Limits copied from the DTO so the form can explain them before the server does. */
export const BREAK_MINUTES_MAX = 240;
export const GRACE_MINUTES_MAX = 120;
export const QUOTA_DAYS_MAX = 366;
export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;
export const NOTE_MAX = 500;
export const HOLIDAY_NAME_MAX = 200;
export const NETWORK_LABEL_MAX = 150;
export const TIMEZONE_MAX = 64;

export const WEEKDAYS: readonly { value: number; label: string; short: string }[] = [
  { value: 1, label: "Thứ hai", short: "T2" },
  { value: 2, label: "Thứ ba", short: "T3" },
  { value: 3, label: "Thứ tư", short: "T4" },
  { value: 4, label: "Thứ năm", short: "T5" },
  { value: 5, label: "Thứ sáu", short: "T6" },
  { value: 6, label: "Thứ bảy", short: "T7" },
  { value: 7, label: "Chủ nhật", short: "CN" },
];

export const STATUS_LABELS: Record<Status, string> = {
  ACTIVE: "Đang áp dụng",
  INACTIVE: "Tạm ngưng",
};

export const TIMEZONES: readonly string[] = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "UTC",
];

/**
 * The policy DTO has no `effective_from_date`, so nothing schedules the change.
 * Saying so is better than pretending the next working day applies.
 */
export const POLICY_EFFECT_NOTE =
  "Chính sách không có ngày hiệu lực: mọi thay đổi áp dụng ngay cho lượt chấm công và cách tính phép kế tiếp. Nên lưu ngoài giờ làm việc để không cắt ngang ca đang chạy.";

export const NO_DELETE_NOTE =
  "Máy chủ không có endpoint xoá ngày lễ hay mạng văn phòng. Muốn ngừng áp dụng, chuyển trạng thái sang “Tạm ngưng” — dữ liệu chấm công đã ghi vẫn giữ nguyên.";

export const QUOTA_NO_STATUS_NOTE =
  "Hạn mức phép không có trạng thái và không xoá được: mỗi năm một bản ghi, sửa trực tiếp khi cần điều chỉnh.";

export const SIGN_IN_NOTE =
  "Mạng văn phòng là danh sách IPv4/CIDR được phép chấm công tại văn phòng; địa chỉ ngoài danh sách sẽ bị coi là chấm công ngoài văn phòng.";
