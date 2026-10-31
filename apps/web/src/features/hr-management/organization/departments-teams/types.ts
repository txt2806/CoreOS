/**
 * Mirrors `apps/api/src/features/hr-management/organization/departments-teams/
 * dto/departments-teams.dto.ts` field for field.
 */
export const ORG_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  managerName: string;
  status: OrgStatus;
  teamCount: number;
  activeTeamCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  description: string;
  managerName: string;
  status: OrgStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** `createDepartmentSchema` defaults `description`, `managerName` and `status`. */
export interface DepartmentInput {
  code: string;
  name: string;
  description: string;
  managerName: string;
  status: OrgStatus;
}

/** `updateDepartmentSchema` is `.partial()` plus a mandatory `version`. */
export interface DepartmentPatch {
  code?: string;
  name?: string;
  description?: string;
  managerName?: string;
  status?: OrgStatus;
  version: number;
}

export interface TeamInput {
  departmentId: string;
  code: string;
  name: string;
  description: string;
  managerName: string;
  status: OrgStatus;
}

/**
 * `updateTeamSchema` is `teamFields.omit({ departmentId: true }).partial()` —
 * a team cannot be moved between departments through this endpoint.
 */
export interface TeamPatch {
  code?: string;
  name?: string;
  description?: string;
  managerName?: string;
  status?: OrgStatus;
  version: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PermissionSnapshot {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  actions: string[];
}

export interface PermissionsMe {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  canManage: boolean;
  items: { featureKey: string; actions: string[] }[];
}
