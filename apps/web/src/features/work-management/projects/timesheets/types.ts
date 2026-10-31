/**
 * Mirrors `apps/api/src/features/work-management/projects/timesheets/dto/timesheets.dto.ts`.
 * Minutes are integers throughout; money never appears because the API exposes no
 * rate or amount — `billable` is only a flag.
 */
export const PERIOD_STATUSES = ["OPEN", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

/** Entry writing is allowed only while the week is open or was sent back. */
export const EDITABLE_STATUSES: PeriodStatus[] = ["OPEN", "REJECTED"];

export interface Period {
  id: string;
  employeeId: string;
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  status: PeriodStatus;
  totalMinutes: number;
  overThreshold: boolean;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedByName: string;
  decisionNote: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  periodId: string;
  employeeId: string;
  projectId: string | null;
  taskId: string | null;
  workDate: string;
  minutes: number;
  note: string;
  billable: boolean;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Corrections after approval append a row; the original entry is never edited. */
export interface EntryAdjustment {
  id: string;
  entryId: string;
  periodId: string;
  deltaMinutes: number;
  note: string;
  adjustedByName: string;
  createdAt: string;
}

/** `GET /timesheets/periods/:id` and every write on a period return this shape. */
export interface PeriodDetail extends Period {
  entries: TimeEntry[];
  adjustments: EntryAdjustment[];
}

export interface EntryInput {
  workDate: string;
  minutes: number;
  /** Attribution is optional in the DTO; the screen only sends what the user picked. */
  projectId?: string;
  taskId?: string;
  note: string;
  billable: boolean;
}

export interface EntryPatch {
  workDate?: string;
  minutes?: number;
  projectId?: string | null;
  taskId?: string | null;
  note?: string;
  billable?: boolean;
  version: number;
}

/** Trimmed shape of `GET /projects`, used only to label a `projectId`. */
export interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export type Decision = "APPROVE" | "REJECT";

export interface TimesheetRules {
  statuses: string[];
  minuteStep: number;
  dayLimitMinutes: number;
  dayThresholdMinutes: number;
  weekThresholdMinutes: number;
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
