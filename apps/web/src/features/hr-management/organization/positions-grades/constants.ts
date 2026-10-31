import type { OrgStatus } from "./types";

/**
 * The permission-catalog key for this module. `PositionsController` and
 * `GradesController` carry no `@RequirePermission` decorator, so the snapshot is
 * used only to hide affordances — the API stays the authority on writes.
 */
export const FEATURE_KEY = "hr-management/organization/positions-grades";

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 100;

/** Caps from the zod DTO: code 50, name 200, description 2000, rank 1..99. */
export const LIMITS = {
  code: 50,
  name: 200,
  description: 2000,
  rankMin: 1,
  rankMax: 99,
} as const;

export const STATUS_LABEL: Record<OrgStatus, string> = {
  ACTIVE: "Đang áp dụng",
  INACTIVE: "Ngừng áp dụng",
};

export const STATUS_TONE: Record<OrgStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge",
};

/** A grade without `positionId` is shared across job titles. */
export const SHARED_GRADE_LABEL = "Dùng chung";

/**
 * Organization rule (AGENTS.md): the only system roles are EMPLOYEE and MANAGER.
 * A job title is an attribute of the employee record, never a role, so the screen
 * states this instead of implying a hierarchy of roles.
 */
export const ROLE_RULE =
  "Chức danh và cấp bậc là thuộc tính của nhân sự, không phải vai trò hệ thống. Hệ thống chỉ có hai vai trò: EMPLOYEE và MANAGER.";

export const EXPORT_FILE_PREFIX = "chuc-danh-cap-bac";
