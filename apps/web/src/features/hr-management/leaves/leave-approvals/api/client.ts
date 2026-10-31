import type {
  Decision,
  DecisionInput,
  DecisionResult,
  DecisionStatus,
  LeaveQuota,
  PageResult,
  PermissionsMe,
  PermissionSnapshot,
  QueueItem,
  Session,
} from "../types";

/**
 * Every call goes through the same-origin proxy, so the HttpOnly session cookie
 * travels with the request and no CORS preflight is involved.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly issues: { path: string; message: string }[];

  constructor(status: number, message: string, issues: { path: string; message: string }[] = []) {
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

/**
 * The manager queue. The service returns a bare array (no envelope, no query
 * string), hard-capped at 200 rows ordered by `fromDate asc`.
 */
export function queue() {
  return request<QueueItem[]>("/leaves/workflow/queue");
}

export function decide(requestId: string, input: DecisionInput) {
  return request<DecisionResult>(`/leaves/workflow/queue/${requestId}/decision`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface HistoryQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: DecisionStatus | "";
}

export function history(query: HistoryQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  return request<PageResult<Decision>>(`/leave-approvals?${search.toString()}`);
}

/** One cheap probe per outcome drives the metric strip without loading rows. */
export function historyTotal(status: DecisionStatus) {
  const search = new URLSearchParams({ page: "1", pageSize: "1", status });
  return request<PageResult<Decision>>(`/leave-approvals?${search.toString()}`).then(
    (result) => result.total,
  );
}

export function permissionsMe() {
  return request<PermissionsMe>("/permissions/me");
}

export function actionsOf(body: PermissionsMe, featureKey: string): string[] {
  return body.items.find((item) => item.featureKey === featureKey)?.actions ?? [];
}

export function snapshotOf(body: PermissionsMe, featureKey: string): PermissionSnapshot {
  return {
    role: body.role,
    isSystemAdmin: body.isSystemAdmin,
    actions: actionsOf(body, featureKey),
  };
}

export function session() {
  return request<Session>("/auth/session");
}

/**
 * The annual allowance lives in the work-policy feature. A manager holds that
 * permission, but the sheet still degrades to "không đọc được" rather than
 * inventing a number if the call fails.
 */
export function annualQuota(year: number) {
  const search = new URLSearchParams({
    year: String(year),
    page: "1",
    pageSize: "1",
  });
  return request<PageResult<LeaveQuota>>(`/work-policies/quotas?${search.toString()}`).then(
    (result) => result.items[0] ?? null,
  );
}

/**
 * Approved days already spent by one employee in a window — this is the quota
 * impact of approving the request on screen. The endpoint pages at 100 rows, so
 * a long service history is read in bounded batches.
 */
export async function usedLeaveDays(
  employeeId: string,
  from: string,
  to: string,
): Promise<number> {
  let sum = 0;
  let page = 1;
  for (; page <= 5; page += 1) {
    const search = new URLSearchParams({
      status: "APPROVED",
      employeeId,
      from,
      to,
      page: String(page),
      pageSize: "100",
    });
    const result = await request<PageResult<QueueItem>>(`/leave-requests?${search.toString()}`);
    for (const item of result.items) sum += item.days;
    if (result.items.length === 0 || page * result.pageSize >= result.total) break;
  }
  return sum;
}
