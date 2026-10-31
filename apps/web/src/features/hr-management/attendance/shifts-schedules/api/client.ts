import type {
  ApplyPatternInput,
  AssignmentInput,
  AssignmentPatch,
  BulkInput,
  BulkResult,
  PageResult,
  PatternInput,
  PatternPatch,
  PermissionsMe,
  ScheduleAssignment,
  SchedulePattern,
  Session,
  ShiftInput,
  ShiftPatch,
  ShiftStatus,
  ShiftTemplate,
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

export interface ScheduleListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: ShiftStatus | "";
  employeeId?: string;
  from?: string;
  to?: string;
}

function toSearch(query: ScheduleListQuery, includeStatus: boolean): string {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (includeStatus && query.status) search.set("status", query.status);
  if (query.employeeId) search.set("employeeId", query.employeeId);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  return search.toString();
}

export function listShifts(query: ScheduleListQuery) {
  return request<PageResult<ShiftTemplate>>(
    `/shifts-schedules/shifts?${toSearch(query, true)}`,
  );
}

export function shiftTotal(status: ShiftStatus) {
  const search = new URLSearchParams({ page: "1", pageSize: "1", status });
  return request<PageResult<ShiftTemplate>>(
    `/shifts-schedules/shifts?${search.toString()}`,
  ).then((result) => result.total);
}

export function createShift(input: ShiftInput) {
  return request<ShiftTemplate>("/shifts-schedules/shifts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateShift(id: string, patch: ShiftPatch) {
  return request<ShiftTemplate>(`/shifts-schedules/shifts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function listPatterns(query: ScheduleListQuery) {
  return request<PageResult<SchedulePattern>>(
    `/shifts-schedules/patterns?${toSearch(query, true)}`,
  );
}

export function patternTotal() {
  return request<PageResult<SchedulePattern>>(
    "/shifts-schedules/patterns?page=1&pageSize=1",
  ).then((result) => result.total);
}

export function createPattern(input: PatternInput) {
  return request<SchedulePattern>("/shifts-schedules/patterns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePattern(id: string, patch: PatternPatch) {
  return request<SchedulePattern>(`/shifts-schedules/patterns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function applyPattern(id: string, input: ApplyPatternInput) {
  return request<BulkResult>(`/shifts-schedules/patterns/${id}/apply`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Assignments carry no status column, so the status filter is left out. */
export function listAssignments(query: ScheduleListQuery) {
  return request<PageResult<ScheduleAssignment>>(
    `/shifts-schedules/assignments?${toSearch(query, false)}`,
  );
}

export function assignmentTotal() {
  return request<PageResult<ScheduleAssignment>>(
    "/shifts-schedules/assignments?page=1&pageSize=1",
  ).then((result) => result.total);
}

export function createAssignment(input: AssignmentInput) {
  return request<ScheduleAssignment>("/shifts-schedules/assignments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function bulkAssign(input: BulkInput) {
  return request<BulkResult>("/shifts-schedules/assignments/bulk", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAssignment(id: string, patch: AssignmentPatch) {
  return request<ScheduleAssignment>(`/shifts-schedules/assignments/${id}`, {
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
