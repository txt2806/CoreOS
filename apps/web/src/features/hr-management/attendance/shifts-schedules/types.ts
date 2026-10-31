/**
 * Mirrors `apps/api/src/features/hr-management/attendance/shifts-schedules/dto/shifts-schedules.dto.ts`.
 * The controller persists three resources — shifts, weekly patterns and per-day
 * assignments — so all three get a real UI here.
 */
export const SHIFT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const ASSIGNMENT_SOURCES = ["MANUAL", "PATTERN"] as const;
export type AssignmentSource = (typeof ASSIGNMENT_SOURCES)[number];

export interface ShiftTemplate {
  id: string;
  name: string;
  /** HH:mm. */
  startTime: string;
  endTime: string;
  breakMinutes: number;
  nightShift: boolean;
  /** YYYY-MM-DD — assignments before this date are refused by the server. */
  effectiveFrom: string;
  note: string;
  status: ShiftStatus;
  /** Paid hours after the break, computed by the server. */
  hours: number;
  assignmentCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftInput {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  nightShift: boolean;
  effectiveFrom: string;
  note: string;
  status: ShiftStatus;
}

export interface ShiftPatch extends Partial<ShiftInput> {
  version: number;
}

/** 1 = Monday … 7 = Sunday, matching the API. */
export interface PatternSlot {
  weekday: number;
  shiftId: string;
}

export interface SchedulePattern {
  id: string;
  name: string;
  slots: PatternSlot[];
  note: string;
  status: ShiftStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatternInput {
  name: string;
  slots: PatternSlot[];
  note: string;
  status: ShiftStatus;
}

export interface PatternPatch extends Partial<PatternInput> {
  version: number;
}

export interface ScheduleAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  shiftId: string;
  source: AssignmentSource;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentInput {
  employeeId: string;
  employeeName: string;
  workDate: string;
  shiftId: string;
  source: AssignmentSource;
  note: string;
}

export interface AssignmentPatch {
  shiftId?: string;
  employeeName?: string;
  note?: string;
  version: number;
}

export interface BulkInput {
  shiftId: string;
  from: string;
  to: string;
  weekdays: number[];
  employees: { id: string; name: string }[];
  note: string;
}

export interface ApplyPatternInput {
  from: string;
  to: string;
  employees: { id: string; name: string }[];
}

/**
 * `POST /assignments/bulk` and `POST /patterns/:id/apply` both answer with the
 * write counts plus what the request asked for.
 */
export interface BulkResult {
  created: number;
  skipped: number;
  total: number;
  days?: number;
  employees: number;
  pattern?: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Session {
  actor: {
    accountId: string;
    employeeId: string;
    username: string;
    displayName: string;
    role: "EMPLOYEE" | "MANAGER";
    isSystemAdmin: boolean;
  };
}

export interface PermissionsMe {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  canManage: boolean;
  items: { featureKey: string; actions: string[] }[];
}

export interface PermissionSnapshot {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  actions: string[];
}
