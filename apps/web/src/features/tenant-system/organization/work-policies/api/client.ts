import type {
  Holiday,
  HolidayInput,
  HolidayPatch,
  ListQuery,
  Network,
  NetworkInput,
  NetworkPatch,
  PageResult,
  Policy,
  PolicyPatch,
  Quota,
  QuotaInput,
  QuotaPatch,
} from "../types";

/** Same-origin proxy in front of NestJS; the HttpOnly cookie carries the session. */
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

/** `listQuery` is `.strict()`, so empty values must never be sent. */
function qs(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.year) params.set("year", String(query.year));
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

export function readPolicy() {
  return request<Policy>("/work-policies");
}

export function savePolicy(patch: PolicyPatch) {
  return request<Policy>("/work-policies", { method: "PUT", body: JSON.stringify(patch) });
}

export function listHolidays(query: ListQuery = {}) {
  return request<PageResult<Holiday>>(`/work-policies/holidays${qs(query)}`);
}

export function createHoliday(input: HolidayInput) {
  return request<Holiday>("/work-policies/holidays", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateHoliday(id: string, patch: HolidayPatch) {
  return request<Holiday>(`/work-policies/holidays/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function listNetworks(query: ListQuery = {}) {
  return request<PageResult<Network>>(`/work-policies/networks${qs(query)}`);
}

export function createNetwork(input: NetworkInput) {
  return request<Network>("/work-policies/networks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateNetwork(id: string, patch: NetworkPatch) {
  return request<Network>(`/work-policies/networks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function listQuotas(query: ListQuery = {}) {
  return request<PageResult<Quota>>(`/work-policies/quotas${qs(query)}`);
}

export function createQuota(input: QuotaInput) {
  return request<Quota>("/work-policies/quotas", { method: "POST", body: JSON.stringify(input) });
}

export function updateQuota(id: string, patch: QuotaPatch) {
  return request<Quota>(`/work-policies/quotas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
