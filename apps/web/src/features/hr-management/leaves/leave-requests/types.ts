/** Mirrors `apps/api/src/features/hr-management/leaves/leave-requests/dto/leave-requests.dto.ts`. */
export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID", "OTHER"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  decidedBy: string;
  decidedAt: string | null;
  decisionNote: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** `createSchema` is strict: only these keys may travel, defaults fill the rest. */
export interface LeaveInput {
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
}

/** `updateSchema`: the workflow fields stay out; a version is mandatory. */
export interface LeavePatch {
  leaveType?: LeaveType;
  fromDate?: string;
  toDate?: string;
  reason?: string;
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

/** `GET /auth/session` — the actor's own record, needed to file a request. */
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

/** `GET /work-policies/quotas` — the tenant-wide annual allowance. */
export interface LeaveQuota {
  id: string;
  year: number;
  daysPerYear: number;
  maxCarryOverDays: number;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type LeaveAction = "view" | "create" | "update" | "delete" | "approve";
