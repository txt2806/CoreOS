/**
 * Mirrors `apps/api/src/features/hr-management/attendance/checkin-explanations/dto/checkin-explanations.dto.ts`.
 *
 * The DTO exposes no `attachment_url` and no late-submission / over-quota flags, so the
 * UI must not render them. Deadline information is stated as text only.
 */
export const EXPLANATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type ExplanationStatus = (typeof EXPLANATION_STATUSES)[number];

export const EXPLANATION_TYPES = [
  "FORGOT_CHECKIN",
  "MISSED_CHECKOUT",
  "WRONG_TIME",
  "OTHER",
] as const;
export type ExplanationType = (typeof EXPLANATION_TYPES)[number];

export interface Explanation {
  id: string;
  employeeId: string;
  employeeName: string;
  /** YYYY-MM-DD. */
  workDate: string;
  type: ExplanationType;
  reason: string;
  /** "" when the employee did not propose a new clock-in time. */
  requestedCheckIn: string;
  requestedCheckOut: string;
  status: ExplanationStatus;
  decidedBy: string;
  decidedAt: string | null;
  decisionNote: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExplanationInput {
  employeeId: string;
  employeeName: string;
  workDate: string;
  type: ExplanationType;
  reason: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
}

/** Only a pending request may be edited; the server enforces the same rule. */
export interface ExplanationPatch {
  reason?: string;
  type?: ExplanationType;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  version: number;
}

export interface DecisionInput {
  status: "APPROVED" | "REJECTED";
  note: string;
  version: number;
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

export interface PermissionSnapshot {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  actions: string[];
}
