import type { FeatureGroup, PermissionAction, PermissionRole } from "./types";

/** Exact `SELF_FEATURE` used by `@RequirePermission` in the controller. */
export const FEATURE_KEY = "tenant-system/access-control/roles-permissions";

/** `manage` is never stored in a cell; only a system administrator holds it. */
export const RESERVED_ACTION: PermissionAction = "manage";

export const PAGE_SIZES = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = 10;

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Xem",
  create: "Tạo",
  update: "Sửa",
  delete: "Xoá",
  approve: "Duyệt",
  manage: "Quản lý",
};

export const ROLE_LABELS: Record<PermissionRole, string> = {
  EMPLOYEE: "Nhân viên",
  MANAGER: "Quản lý",
};

export const GROUP_LABELS: Record<FeatureGroup, string> = {
  "tenant-system": "Hệ thống tenant",
  "work-management": "Quản lý công việc",
  "hr-management": "Nhân sự",
  crm: "Khách hàng",
};

export const GROUP_ORDER: FeatureGroup[] = [
  "tenant-system",
  "work-management",
  "hr-management",
  "crm",
];

/** `GET /permissions/history` returns the 50 most recent changes. */
export const HISTORY_LIMIT_NOTE = "Lịch sử hiển thị 50 thay đổi gần nhất do máy chủ trả về.";

export const SYSTEM_ADMIN_NOTE =
  "Quản trị hệ thống luôn có đủ mọi quyền và không nằm trong ma trận này. Mỗi thao tác của họ được ghi nhật ký như một ghi đè ngoài phạm vi (out-of-scope override).";
