/**
 * Mirrors `apps/api/src/features/hr-management/employees/resource-capacity/dto/resource-capacity.dto.ts`.
 * `percentage` is a share of the period's available hours, not money; nothing here
 * carries a rate or an amount.
 */
export const ALLOCATION_STATUSES = ["PLANNED", "ACTIVE", "CANCELLED"] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export interface Period {
  id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  standardHoursPerDay: number;
  /** Weekdays between the two dates, computed once by the API. */
  workingDays: number;
  holidayDays: number;
  leaveDays: number;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodInput {
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  standardHoursPerDay: number;
  holidayDays: number;
  leaveDays: number;
  note: string;
}

/** `leaveDays` is absent from the patch schema, so it can only be set at creation. */
export interface PeriodPatch {
  fromDate?: string;
  toDate?: string;
  standardHoursPerDay?: number;
  holidayDays?: number;
  note?: string;
  version: number;
}

export interface Allocation {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  projectRef: string;
  percentage: number;
  status: AllocationStatus;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationInput {
  periodId: string;
  projectRef: string;
  percentage: number;
  status: AllocationStatus;
  note: string;
}

export interface AllocationPatch {
  projectRef?: string;
  percentage?: number;
  status?: AllocationStatus;
  note?: string;
  version: number;
}

/** Everything the capacity screen shows comes from this server-side calculation. */
export interface CapacitySummary {
  periodId: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  workingDays: number;
  holidayDays: number;
  leaveDays: number;
  standardHoursPerDay: number;
  availableHours: number;
  allocatedPercent: number;
  allocatedHours: number;
  remainingHours: number;
  utilization: number;
  overCapacity: boolean;
}

/** `GET /resource-capacity/periods/:id/summary` returns both halves. */
export interface CapacityDetail {
  period: Period;
  summary: CapacitySummary;
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
