/**
 * Mirrors `apps/api/src/features/hr-management/organization/positions-grades/
 * dto/positions-grades.dto.ts` field for field.
 *
 * A `Position` is a job title and a `Grade` is the seniority step of that title.
 * Neither is a system role: the product has exactly two roles, EMPLOYEE and
 * MANAGER, and `job_title` on the employee record is only an attribute.
 */
export const ORG_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export interface Position {
  id: string;
  code: string;
  name: string;
  description: string;
  status: OrgStatus;
  gradeCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  code: string;
  name: string;
  rank: number;
  description: string;
  status: OrgStatus;
  /** Nullish: a grade may exist without being tied to one position. */
  positionId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PositionInput {
  code: string;
  name: string;
  description: string;
  status: OrgStatus;
}

export interface PositionPatch {
  code?: string;
  name?: string;
  description?: string;
  status?: OrgStatus;
  version: number;
}

export interface GradeInput {
  code: string;
  name: string;
  rank: number;
  description: string;
  status: OrgStatus;
  positionId: string | null;
}

export interface GradePatch {
  code?: string;
  name?: string;
  rank?: number;
  description?: string;
  status?: OrgStatus;
  positionId?: string | null;
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
