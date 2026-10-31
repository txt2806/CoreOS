import type { AccessChangeKind, AccountRole, AccountStatus } from "./types";

/**
 * Catalog key of this branch. The controller gates every mutation with
 * `@AdminOnly()` instead of `@RequirePermission`, so the screen mirrors that
 * rule (only `is_system_admin` sees the write controls) and this key is what
 * the permission matrix lists.
 */
export const FEATURE_KEY = "tenant-system/access-control/accounts";

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;
export const EXPORT_FILE_PREFIX = "tai-khoan";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 80;
export const DISPLAY_NAME_MAX = 200;
export const EMAIL_MAX = 200;
export const EMPLOYEE_CODE_MAX = 50;
export const LOCKED_REASON_MAX = 500;
export const REASON_MAX = 500;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export const ROLE_LABELS: Record<AccountRole, string> = {
  EMPLOYEE: "Nhân viên",
  MANAGER: "Quản lý",
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đang khoá",
};

export const ACCESS_KIND_LABELS: Record<AccessChangeKind, string> = {
  ROLE: "Vai trò",
  ADMIN: "Quyền quản trị",
  STATUS: "Trạng thái",
  PASSWORD: "Mật khẩu",
};

/** `/accounts/:id/history` caps itself at the 100 most recent rows. */
export const HISTORY_NOTE = "Lịch sử hiển thị tối đa 100 thay đổi gần nhất do máy chủ trả về.";
