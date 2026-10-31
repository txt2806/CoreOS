/**
 * Mirrors `apps/api/src/features/tenant-system/organization/work-policies/dto/work-policies.dto.ts`.
 * The DTO carries no effective date, so the screen must not promise one.
 */
export type Status = "ACTIVE" | "INACTIVE";

export interface Policy {
  id: string;
  timezone: string;
  /** `HH:mm` — the DTO validates the shape, it is never a Date. */
  workStart: string;
  workEnd: string;
  breakMinutes: number;
  lateGraceMinutes: number;
  /** ISO weekday numbers, 1 = Monday … 7 = Sunday, sorted by the server. */
  workDays: number[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type PolicyFields = Pick<
  Policy,
  "timezone" | "workStart" | "workEnd" | "breakMinutes" | "lateGraceMinutes" | "workDays"
>;

/** `updatePolicySchema` is `.partial()` plus the mandatory version. */
export type PolicyPatch = Partial<PolicyFields> & { version: number };

export interface Holiday {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  name: string;
  paid: boolean;
  note: string;
  status: Status;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type HolidayInput = Pick<Holiday, "date" | "name" | "paid" | "note" | "status">;
export type HolidayPatch = Partial<HolidayInput> & { version: number };

export interface Network {
  id: string;
  label: string;
  cidr: string;
  note: string;
  status: Status;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type NetworkInput = Pick<Network, "label" | "cidr" | "note" | "status">;
export type NetworkPatch = Partial<NetworkInput> & { version: number };

export interface Quota {
  id: string;
  year: number;
  daysPerYear: number;
  maxCarryOverDays: number;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Leave quotas carry no status: they are edited, never switched off. */
export type QuotaInput = Pick<Quota, "year" | "daysPerYear" | "maxCarryOverDays" | "note">;
export type QuotaPatch = Partial<QuotaInput> & { version: number };

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** `listQuery` — `year` only reaches holidays and quotas on the server. */
export interface ListQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: Status;
  year?: number;
}
