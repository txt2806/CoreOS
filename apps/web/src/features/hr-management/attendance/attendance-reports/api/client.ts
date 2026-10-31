import type {
  AttendancePeriod,
  LineInput,
  LinePatch,
  PageResult,
  PeriodInput,
  PeriodLine,
  PeriodPatch,
  PeriodStatus,
  PeriodSummary,
  PermissionsMe,
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
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
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

export interface PeriodQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: PeriodStatus | "";
}

export interface LineQuery {
  periodId: string;
  page: number;
  pageSize: number;
  q?: string;
}

export function listPeriods(query: PeriodQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  return request<PageResult<AttendancePeriod>>(
    `/attendance-reports/periods?${search.toString()}`,
  );
}

export function periodTotal(status: PeriodStatus) {
  const search = new URLSearchParams({ page: "1", pageSize: "1", status });
  return request<PageResult<AttendancePeriod>>(
    `/attendance-reports/periods?${search.toString()}`,
  ).then((result) => result.total);
}

export function createPeriod(input: PeriodInput) {
  return request<AttendancePeriod>("/attendance-reports/periods", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePeriod(id: string, patch: PeriodPatch) {
  return request<AttendancePeriod>(`/attendance-reports/periods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function periodSummary(id: string) {
  return request<PeriodSummary>(`/attendance-reports/periods/${id}/summary`);
}

export function listLines(query: LineQuery) {
  const search = new URLSearchParams({
    periodId: query.periodId,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  return request<PageResult<PeriodLine>>(`/attendance-reports/lines?${search.toString()}`);
}

export function createLine(input: LineInput) {
  return request<PeriodLine>("/attendance-reports/lines", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLine(id: string, patch: LinePatch) {
  return request<PeriodLine>(`/attendance-reports/lines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function session() {
  return request<Session>("/auth/session");
}

export function permissionsMe() {
  return request<PermissionsMe>("/permissions/me");
}

export function actionsOf(body: PermissionsMe, featureKey: string): string[] {
  return body.items.find((item) => item.featureKey === featureKey)?.actions ?? [];
}
