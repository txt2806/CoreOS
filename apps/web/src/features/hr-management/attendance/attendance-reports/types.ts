/**
 * Mirrors `apps/api/src/features/hr-management/attendance/attendance-reports/dto/attendance-reports.dto.ts`.
 *
 * The API aggregates only worked days, paid leave, unpaid leave and overtime hours.
 * Late minutes, early-leave minutes, actual work minutes, missing checkouts and
 * unexcused absences are not exposed by any endpoint, so this module never renders
 * them — see the limited-metrics notice on the screen.
 */
export const PERIOD_STATUSES = ["DRAFT", "CLOSED"] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export interface AttendancePeriod {
  id: string;
  /** YYYY-MM; the server requires it to match the month of `fromDate`. */
  periodKey: string;
  name: string;
  fromDate: string;
  toDate: string;
  status: PeriodStatus;
  note: string;
  lineCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodInput {
  periodKey: string;
  name: string;
  fromDate: string;
  toDate: string;
  status: PeriodStatus;
  note: string;
}

export interface PeriodPatch {
  name?: string;
  fromDate?: string;
  toDate?: string;
  status?: PeriodStatus;
  note?: string;
  version: number;
}

export interface PeriodLine {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  /** Days, 0…31 each; the three together must not exceed 31. */
  workedDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  /** Hours, 0…400. */
  overtimeHours: number;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LineInput {
  periodId: string;
  employeeId: string;
  employeeName: string;
  workedDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  note: string;
}

export interface LinePatch {
  employeeName?: string;
  workedDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  overtimeHours?: number;
  note?: string;
  version: number;
}

/** Shape of `GET /attendance-reports/periods/:id/summary`. */
export interface PeriodSummary {
  periodId: string;
  headcount: number;
  workedDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
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
