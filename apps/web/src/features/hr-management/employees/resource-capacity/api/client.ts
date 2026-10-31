import type {
  Allocation,
  AllocationInput,
  AllocationPatch,
  AllocationStatus,
  CapacityDetail,
  PageResult,
  Period,
  PeriodInput,
  PeriodPatch,
  PermissionSnapshot,
} from "../types";

/**
 * Every call goes through the same-origin proxy, so the HttpOnly session cookie
 * travels with the request and no CORS preflight is involved.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly issues: { path: string; message: string }[];

  constructor(
    status: number,
    message: string,
    issues: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

interface ErrorBody {
  message?: string | string[];
  issues?: { path?: string; message?: string }[];
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      credentials: "same-origin",
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, "Mất kết nối tới máy chủ. Kiểm tra đường truyền rồi thử lại.");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = (body ?? {}) as ErrorBody;
    const message = Array.isArray(error.message)
      ? error.message.join(" ")
      : (error.message ?? "Yêu cầu không thực hiện được.");
    throw new ApiError(
      response.status,
      message,
      (error.issues ?? []).map((issue) => ({
        path: issue.path ?? "",
        message: issue.message ?? "",
      })),
    );
  }

  return body as T;
}

export interface PeriodListQuery {
  page: number;
  pageSize: number;
  q?: string;
  /** `from`/`to` keep periods that overlap the window, not periods inside it. */
  from?: string;
  to?: string;
}

export function listPeriods(query: PeriodListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  return request<PageResult<Period>>(`/resource-capacity/periods?${search.toString()}`);
}

export function createPeriod(input: PeriodInput) {
  return request<Period>("/resource-capacity/periods", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePeriod(id: string, input: PeriodPatch) {
  return request<Period>(`/resource-capacity/periods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** The only place available/allocated/remaining hours are calculated. */
export function capacityDetail(periodId: string) {
  return request<CapacityDetail>(`/resource-capacity/periods/${periodId}/summary`);
}

export interface AllocationListQuery {
  periodId?: string;
  employeeId?: string;
  status?: AllocationStatus | "";
  page?: number;
  pageSize?: number;
}

export function listAllocations(query: AllocationListQuery = {}) {
  const search = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 100),
  });
  if (query.periodId) search.set("periodId", query.periodId);
  if (query.employeeId) search.set("employeeId", query.employeeId);
  if (query.status) search.set("status", query.status);
  return request<PageResult<Allocation>>(
    `/resource-capacity/allocations?${search.toString()}`,
  );
}

export function createAllocation(input: AllocationInput) {
  return request<Allocation>("/resource-capacity/allocations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAllocation(id: string, input: AllocationPatch) {
  return request<Allocation>(`/resource-capacity/allocations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Cancelling keeps the row and its history; it only removes it from the sums. */
export function cancelAllocation(id: string, version: number) {
  return request<Allocation>(`/resource-capacity/allocations/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

/** One call answers every feature cell the actor holds; screens read their own. */
export interface PermissionsMe {
  role: PermissionSnapshot["role"];
  isSystemAdmin: boolean;
  canManage: boolean;
  items: { featureKey: string; actions: string[] }[];
}

export function permissionsMe() {
  return request<PermissionsMe>("/permissions/me");
}

export function actionsOf(body: PermissionsMe, featureKey: string): string[] {
  return body.items.find((item) => item.featureKey === featureKey)?.actions ?? [];
}
