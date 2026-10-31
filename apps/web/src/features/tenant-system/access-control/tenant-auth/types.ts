/** Mirrors `apps/api/src/features/tenant-system/access-control/tenant-auth/dto/tenant-auth.dto.ts`. */
export interface LoginInput {
  username: string;
  password: string;
}

export type AccountRole = "EMPLOYEE" | "MANAGER";

/** `actorSchema` — the signed-in identity returned with every session answer. */
export interface SessionActor {
  accountId: string;
  employeeId: string;
  username: string;
  displayName: string;
  role: AccountRole;
  isSystemAdmin: boolean;
  /** Set when an administrator reset the password; the account still works. */
  mustChangePassword: boolean;
  sessionId: string;
}

/** `sessionResultSchema` — both `POST /auth/login` and `GET /auth/session`. */
export interface SessionResult {
  actor: SessionActor;
  idleMinutes: number;
  expiresAt: string;
}

/** `GET /auth/setup` — public probe used to explain a first-run tenant. */
export interface SetupState {
  needsSetup: boolean;
  idleMinutes: number;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}
