/** Shapes mirrored from the endpoints this screen reads. No invented fields. */

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

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  checkIn: string;
  checkOut: string | null;
  source: "WEB" | "MOBILE" | "KIOSK" | "MANUAL";
  note: string;
  status: "OPEN" | "COMPLETE" | "LOCKED";
  version: number;
}

export interface TodayTask {
  id: string;
  code: string;
  name: string;
  scope: string;
  status: string;
  date: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  link: string;
  source: string;
  readAt: string | null;
  createdAt: string;
}

export interface Approval {
  id: string;
  code: string;
  name: string;
  status: string;
  date: string;
  assignee: string;
  fields: { requester?: string; category?: string; amount?: number };
}

export interface InboxEntry {
  request: Approval;
  step: { sequence: number; status: string; quorum: string };
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PermissionsMe {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  canManage: boolean;
  items: { featureKey: string; actions: string[] }[];
}
