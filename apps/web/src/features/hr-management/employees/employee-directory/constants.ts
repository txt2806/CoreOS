import type { EmployeeStatus } from "./types";

/**
 * The permission-catalog key for this module. `EmployeeDirectoryController`
 * carries no `@RequirePermission` decorator, so the snapshot only hides
 * affordances — the API remains the authority on every write.
 */
export const FEATURE_KEY = "hr-management/employees/employee-directory";

export const PAGE_SIZES = [10, 20, 50, 100] as const;
/** `listQuery.pageSize` defaults to 20 on this endpoint. */
export const DEFAULT_PAGE_SIZE = 20;

export const LIMITS = {
  code: 50,
  fullName: 200,
  email: 200,
  phone: 40,
  jobTitle: 150,
  departmentName: 200,
  teamName: 200,
  managerName: 150,
  note: 2000,
} as const;

export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVE: "Đang làm việc",
  INACTIVE: "Đã nghỉ",
};

export const STATUS_TONE: Record<EmployeeStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge",
};

/** The only two roles the product has; never derived from a job title. */
export const ROLE_LABEL: Record<"EMPLOYEE" | "MANAGER", string> = {
  EMPLOYEE: "Nhân viên",
  MANAGER: "Quản lý",
};

export const EXPORT_FILE_PREFIX = "danh-ba-nhan-su";

/**
 * `q` searches code, fullName, email and jobTitle only — team and department are
 * separate exact-match filters, which the placeholder and hint must make clear.
 */
export const SEARCH_HINT = "Tìm theo mã, họ tên, email hoặc chức danh (không gồm tên nhóm).";
