/**
 * Mirrors `apps/api/src/features/hr-management/attendance/workforce-board/dto/workforce-board.dto.ts`.
 */
export const PRESENCE_STATUSES = ["IN_OFFICE", "REMOTE", "LEAVE", "OFF_SITE"] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export interface Presence {
  id: string;
  employeeId: string;
  employeeName: string;
  /** YYYY-MM-DD. */
  workDate: string;
  status: PresenceStatus;
  shiftLabel: string;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PresenceInput {
  employeeId: string;
  employeeName: string;
  workDate: string;
  status: PresenceStatus;
  shiftLabel: string;
  note: string;
}

export interface PresencePatch {
  status?: PresenceStatus;
  shiftLabel?: string;
  note?: string;
  version: number;
}

/** Shape of `GET /workforce-board/summary?workDate=…`. */
export interface PresenceSummary {
  workDate: string;
  items: { status: PresenceStatus; count: number }[];
  total: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Shape of `GET /auth/session`. */
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
