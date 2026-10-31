import type {
  PageResult,
  PermissionSnapshot,
  ReportInput,
  ReportStatus,
  WorkReport,
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

export interface ReportListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: ReportStatus | "";
  scope?: string;
  assignee?: string;
}

export function listReports(query: ReportListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  if (query.scope?.trim()) search.set("scope", query.scope.trim());
  if (query.assignee?.trim()) search.set("assignee", query.assignee.trim());
  return request<PageResult<WorkReport>>(`/reports?${search.toString()}`);
}

/** A one-row probe per status keeps the strip truthful without loading rows. */
export function reportTotal(status: ReportStatus) {
  const search = new URLSearchParams({ page: "1", pageSize: "1", status });
  return request<PageResult<WorkReport>>(`/reports?${search.toString()}`).then(
    (result) => result.total,
  );
}

export function createReport(input: ReportInput) {
  return request<WorkReport>("/reports", { method: "POST", body: JSON.stringify(input) });
}

export function updateReport(id: string, input: Partial<ReportInput> & { version: number }) {
  return request<WorkReport>(`/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteReport(id: string, version: number) {
  return request<{ id: string }>(`/reports/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ version }),
  });
}

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
