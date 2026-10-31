/**
 * Mirrors the DTOs behind `GET /leaves/workflow/queue`,
 * `POST /leaves/workflow/queue/:requestId/decision` and `GET /leave-approvals`.
 */
export const DECISION_STATUSES = ["APPROVED", "REJECTED"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

/* Re-declared here rather than imported: a feature may only read its own folder. */
export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** The queue reuses the leave-request DTO — the service returns it untouched. */
export interface QueueItem {
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

/** `decisionBody` is strict: only `status` and `note` travel. */
export interface DecisionInput {
  status: DecisionStatus;
  note: string;
}

/** One stored row of the approval history (`/leave-approvals`). */
export interface Decision {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: DecisionStatus;
  decidedBy: string;
  decisionNote: string;
  decidedAt: string;
  createdAt: string;
}

/** `decide()` answers with both records so the caller can echo the stored result. */
export interface DecisionResult {
  request: QueueItem;
  decision: Decision;
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
