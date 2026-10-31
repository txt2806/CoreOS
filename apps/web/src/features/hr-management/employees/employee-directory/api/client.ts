import type {
  Employee,
  EmployeeInput,
  EmployeePatch,
  EmployeeStatus,
  PageResult,
  PermissionsMe,
  PermissionSnapshot,
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

export interface EmployeeListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: EmployeeStatus | "";
  /** Exact match, not a substring — the repository compares equality. */
  departmentName?: string;
  jobTitle?: string;
}

export function listEmployees(query: EmployeeListQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  if (query.departmentName?.trim()) params.set("departmentName", query.departmentName.trim());
  if (query.jobTitle?.trim()) params.set("jobTitle", query.jobTitle.trim());
  return request<PageResult<Employee>>(`/employees?${params.toString()}`);
}

/** A single-row probe so the metric strip never guesses a count. */
export function employeeTotal(status?: EmployeeStatus) {
  const params = new URLSearchParams({ page: "1", pageSize: "1" });
  if (status) params.set("status", status);
  return request<PageResult<Employee>>(`/employees?${params.toString()}`).then(
    (result) => result.total,
  );
}

export function createEmployee(input: EmployeeInput) {
  return request<Employee>("/employees", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEmployee(id: string, input: EmployeePatch) {
  return request<Employee>(`/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
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
