import type { OrgStatus } from "./types";

/**
 * The permission-catalog key for this module. `DepartmentsController` and
 * `TeamsController` carry no `@RequirePermission` decorator, so the snapshot is
 * only used here to hide affordances the actor cannot use — the API itself is
 * still the authority on every write.
 */
export const FEATURE_KEY = "hr-management/organization/departments-teams";

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 100;

/** Field caps copied from `departmentFields` / `teamFields` in the zod DTO. */
export const LIMITS = {
  code: 50,
  name: 200,
  description: 2000,
  managerName: 150,
} as const;

export const STATUS_LABEL: Record<OrgStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
};

export const STATUS_TONE: Record<OrgStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge",
};

/**
 * Organization rule (AGENTS.md): a department or team that is operating needs at
 * least one MANAGER. The API stores that as a free-text `managerName`, so an
 * ACTIVE row with an empty manager is surfaced as a warning.
 */
export const MANAGER_RULE = "Đơn vị đang hoạt động cần ít nhất một người quản lý.";

export const EXPORT_FILE_PREFIX = "phong-ban-nhom";
