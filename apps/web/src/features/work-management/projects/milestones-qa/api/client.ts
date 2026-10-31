import type {
  AcceptanceInput,
  AcceptanceItem,
  AcceptanceQueue,
  AcceptanceResult,
  Milestone,
  MilestoneDetail,
  MilestoneInput,
  MilestoneStatus,
  PageResult,
  PermissionSnapshot,
  ProjectRef,
  QaOutcome,
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

export interface MilestoneListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: MilestoneStatus | "";
}

export function listMilestones(query: MilestoneListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  return request<PageResult<Milestone>>(`/milestones?${search.toString()}`);
}

export function getMilestone(id: string) {
  return request<MilestoneDetail>(`/milestones/${id}`);
}

export function createMilestone(input: MilestoneInput) {
  return request<Milestone>("/milestones", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMilestone(id: string, input: Partial<MilestoneInput> & { version: number }) {
  return request<Milestone>(`/milestones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function linkTasks(id: string, taskIds: string[]) {
  return request<MilestoneDetail>(`/milestones/${id}/items`, {
    method: "POST",
    body: JSON.stringify({ taskIds }),
  });
}

export function unlinkTask(id: string, taskId: string) {
  return request<MilestoneDetail>(`/milestones/${id}/items/${taskId}`, {
    method: "DELETE",
  });
}

/**
 * Criteria are only addressable per task: `GET /acceptance` requires `taskId`
 * (strict query), so a workspace-wide QA list cannot be built from this API.
 */
export function acceptanceOf(taskId: string) {
  return request<AcceptanceQueue>(`/acceptance?taskId=${encodeURIComponent(taskId)}`);
}

export function createAcceptance(input: AcceptanceInput) {
  return request<AcceptanceItem>("/acceptance", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function recordResult(
  itemId: string,
  input: { outcome: QaOutcome; note: string },
) {
  // Evidence stays empty: the UI has no evidence upload yet, and the API defaults to [].
  return request<AcceptanceResult>(`/acceptance/${itemId}/results`, {
    method: "POST",
    body: JSON.stringify({ outcome: input.outcome, note: input.note.trim(), evidence: [] }),
  });
}

export function resultsOf(itemId: string) {
  return request<{ items: AcceptanceResult[] }>(`/acceptance/${itemId}/results`);
}

/**
 * The milestone DTO needs a `projectId` UUID, and a feature may not import
 * another feature. Reading the real `/projects` endpoint is the only honest way
 * to offer a picker; if the actor lacks “view” there, the dialog says so.
 */
export function listProjectOptions(term: string) {
  const search = new URLSearchParams({ page: "1", pageSize: "100" });
  if (term.trim()) search.set("q", term.trim());
  return request<PageResult<ProjectRef>>(`/projects?${search.toString()}`);
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
