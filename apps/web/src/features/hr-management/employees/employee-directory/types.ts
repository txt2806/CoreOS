/**
 * Mirrors `apps/api/src/features/hr-management/employees/employee-directory/
 * dto/employee-directory.dto.ts` field for field.
 *
 * The directory deliberately carries no credential material and no system role:
 * `jobTitle` is a free-text attribute, and the only roles in the product are
 * EMPLOYEE and MANAGER.
 */
export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface Employee {
  id: string;
  code: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  departmentName: string;
  teamName: string;
  managerName: string;
  startDate: string | null;
  status: EmployeeStatus;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** `createEmployeeSchema` defaults every field except code and fullName. */
export interface EmployeeInput {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  departmentName: string;
  teamName: string;
  managerName: string;
  startDate: string | null;
  status: EmployeeStatus;
  note: string;
}

/** `updateEmployeeSchema` is `.partial()` plus a mandatory `version`. */
export interface EmployeePatch {
  code?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  departmentName?: string;
  teamName?: string;
  managerName?: string;
  startDate?: string | null;
  status?: EmployeeStatus;
  note?: string;
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

/**
 * `GET /auth/session`. The directory row itself has no role field, so this is the
 * only place a role badge can come from — and only for the signed-in actor.
 */
export interface Session {
  actor: {
    accountId: string;
    employeeId: string;
    username: string;
    displayName: string;
    role: "EMPLOYEE" | "MANAGER";
    isSystemAdmin: boolean;
    mustChangePassword: boolean;
  };
  idleMinutes: number;
  expiresAt: string;
}
