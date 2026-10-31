import type {
  Grade,
  GradeInput,
  GradePatch,
  OrgStatus,
  PageResult,
  PermissionsMe,
  PermissionSnapshot,
  Position,
  PositionInput,
  PositionPatch,
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

export interface GradeListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: OrgStatus | "";
  positionId?: string;
}

export interface PositionListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: OrgStatus | "";
}

function positionSearch(query: PositionListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  return params.toString();
}

function gradeSearch(query: GradeListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  if (query.positionId) params.set("positionId", query.positionId);
  return params.toString();
}

export function listPositions(query: PositionListQuery) {
  return request<PageResult<Position>>(`/org/positions?${positionSearch(query)}`);
}

export function listGrades(query: GradeListQuery) {
  return request<PageResult<Grade>>(`/org/grades?${gradeSearch(query)}`);
}

/** Single-row probes keep the metric strip tied to real totals. */
export function positionTotal(status?: OrgStatus) {
  const params = new URLSearchParams({ page: "1", pageSize: "1" });
  if (status) params.set("status", status);
  return request<PageResult<Position>>(`/org/positions?${params.toString()}`).then(
    (result) => result.total,
  );
}

export function gradeTotal(status?: OrgStatus) {
  const params = new URLSearchParams({ page: "1", pageSize: "1" });
  if (status) params.set("status", status);
  return request<PageResult<Grade>>(`/org/grades?${params.toString()}`).then(
    (result) => result.total,
  );
}

export function createPosition(input: PositionInput) {
  return request<Position>("/org/positions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePosition(id: string, input: PositionPatch) {
  return request<Position>(`/org/positions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createGrade(input: GradeInput) {
  return request<Grade>("/org/grades", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGrade(id: string, input: GradePatch) {
  return request<Grade>(`/org/grades/${id}`, {
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
