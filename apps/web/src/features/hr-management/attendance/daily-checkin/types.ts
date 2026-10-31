/**
 * Mirrors `apps/api/src/features/hr-management/attendance/daily-checkin/dto/daily-checkin.dto.ts`.
 * Only fields the API returns are declared here.
 */
export const ATTENDANCE_STATUSES = ["OPEN", "COMPLETE", "LOCKED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_SOURCES = ["WEB", "MOBILE", "KIOSK", "MANUAL"] as const;
export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number];

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  /** YYYY-MM-DD. */
  workDate: string;
  /** HH:mm. */
  checkIn: string;
  /** HH:mm, null while the person has not checked out. */
  checkOut: string | null;
  source: AttendanceSource;
  note: string;
  status: AttendanceStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceInput {
  employeeId: string;
  employeeName: string;
  workDate: string;
  checkIn: string;
  checkOut?: string | null;
  source: AttendanceSource;
  note: string;
}

export interface AttendancePatch {
  checkIn?: string;
  checkOut?: string | null;
  note?: string;
  version: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Shape of `GET /auth/session`, the only source of the signed-in employee. */
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

/** Shape of `GET /permissions/me`. */
export interface PermissionsMe {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  canManage: boolean;
  items: { featureKey: string; actions: string[] }[];
}

/** The slice of `PermissionsMe` this screen keeps: actions for its own key. */
export interface PermissionSnapshot {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  actions: string[];
}
