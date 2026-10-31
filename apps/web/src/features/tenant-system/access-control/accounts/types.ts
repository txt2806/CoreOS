/**
 * Mirrors `apps/api/src/features/tenant-system/access-control/accounts/dto/accounts.dto.ts`.
 *
 * The account record carries no `jobTitle` or `team` column — the employee
 * number is the only link to HR the API stores, so the screen shows that and
 * never invents a title or a team name.
 */
export type AccountRole = "EMPLOYEE" | "MANAGER";
export type AccountStatus = "ACTIVE" | "LOCKED";
export type AccessChangeKind = "ROLE" | "ADMIN" | "STATUS" | "PASSWORD";

export interface Account {
  id: string;
  username: string;
  displayName: string;
  email: string;
  employeeCode: string;
  role: AccountRole;
  isSystemAdmin: boolean;
  status: AccountStatus;
  lockedReason: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessChangeEntry {
  id: string;
  kind: AccessChangeKind;
  fromValue: string;
  toValue: string;
  actorName: string;
  reason: string;
  createdAt: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AccountListQuery {
  page: number;
  pageSize: number;
  q: string;
  role: AccountRole | "";
  status: AccountStatus | "";
}

/** `createAccountSchema` is strict: exactly these keys, nothing else. */
export interface CreateAccountInput {
  username: string;
  displayName: string;
  email: string;
  employeeCode: string;
  role: AccountRole;
  isSystemAdmin: boolean;
  status: AccountStatus;
  lockedReason: string;
  password: string;
  actorName: string;
}

/** `updateAccountSchema` only accepts the profile fields plus the version. */
export interface UpdateAccountInput {
  username?: string;
  displayName?: string;
  email?: string;
  employeeCode?: string;
  version: number;
}

/** Role, admin flag and status are changed through the access endpoint. */
export interface ChangeAccessInput {
  role?: AccountRole;
  isSystemAdmin?: boolean;
  status?: AccountStatus;
  lockedReason?: string;
  actorName: string;
  reason?: string;
  version: number;
}

export interface ResetPasswordInput {
  password: string;
  actorName: string;
  reason?: string;
  version: number;
}

export interface SessionActor {
  accountId: string;
  employeeId: string;
  username: string;
  displayName: string;
  role: AccountRole;
  isSystemAdmin: boolean;
  mustChangePassword: boolean;
  sessionId: string;
}

export interface SessionResult {
  actor: SessionActor;
  idleMinutes: number;
  expiresAt: string;
}
