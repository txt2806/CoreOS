import type {
  Department,
  DepartmentInput,
  DepartmentPatch,
  OrgStatus,
  PageResult,
  PermissionsMe,
  PermissionSnapshot,
  Team,
  TeamInput,
  TeamPatch,
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

export interface OrgListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: OrgStatus | "";
  departmentId?: string;
}

function search(query: OrgListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  return params.toString();
}

export function listDepartments(query: OrgListQuery) {
  return request<PageResult<Department>>(`/org/departments?${search(query)}`);
}

export function listTeams(query: OrgListQuery) {
  return request<PageResult<Team>>(`/org/teams?${search(query)}`);
}

/** A single-row probe: the metric strip never guesses a count. */
export function departmentTotal(status?: OrgStatus) {
  const params = new URLSearchParams({ page: "1", pageSize: "1" });
  if (status) params.set("status", status);
  return request<PageResult<Department>>(`/org/departments?${params.toString()}`).then(
    (result) => result.total,
  );
}

export function teamTotal(status?: OrgStatus) {
  const params = new URLSearchParams({ page: "1", pageSize: "1" });
  if (status) params.set("status", status);
  return request<PageResult<Team>>(`/org/teams?${params.toString()}`).then(
    (result) => result.total,
  );
}

export function createDepartment(input: DepartmentInput) {
  return request<Department>("/org/departments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDepartment(id: string, input: DepartmentPatch) {
  return request<Department>(`/org/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createTeam(input: TeamInput) {
  return request<Team>("/org/teams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** `departmentId` is omitted by `updateTeamSchema`, so the patch never carries it. */
export function updateTeam(id: string, input: TeamPatch) {
  return request<Team>(`/org/teams/${id}`, {
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
