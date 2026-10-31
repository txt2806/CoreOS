import type {
  PageResult,
  PermissionSnapshot,
  Project,
  ProjectInput,
  ProjectStatus,
  Sprint,
  SprintBoard,
  SprintInput,
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

export interface ProjectListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: ProjectStatus | "";
}

export function listProjects(query: ProjectListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  return request<PageResult<Project>>(`/projects?${search.toString()}`);
}

/** One cheap probe per status keeps the metric strip truthful without loading rows. */
export function projectTotal(status?: ProjectStatus) {
  const search = new URLSearchParams({ page: "1", pageSize: "1" });
  if (status) search.set("status", status);
  return request<PageResult<Project>>(`/projects?${search.toString()}`).then(
    (result) => result.total,
  );
}

export function getProject(id: string) {
  return request<Project>(`/projects/${id}`);
}

export function createProject(input: ProjectInput) {
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProject(id: string, input: Partial<ProjectInput> & { version: number }) {
  return request<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProject(id: string, version: number) {
  return request<{ id: string }>(`/projects/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ version }),
  });
}

/** Sprints, backlog and commitment in one read; owned by the sprint controller. */
export function projectBoard(projectId: string) {
  return request<SprintBoard>(`/projects/${projectId}/board`);
}

export function createSprint(projectId: string, input: SprintInput) {
  return request<Sprint>(`/projects/${projectId}/sprints`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * `overCapacity` is what the manager accepts explicitly; the API still refuses
 * commitments above capacity + 25%, so the screen never hides that gate.
 */
export function activateSprint(
  projectId: string,
  id: string,
  input: { version: number; overCapacity: boolean },
) {
  return request<Sprint>(`/projects/${projectId}/sprints/${id}/activate`, {
    method: "POST",
    headers: { "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify(input),
  });
}

/** Closing returns the whole board because unfinished rows may change sprint. */
export function closeSprint(
  projectId: string,
  id: string,
  input: { version: number; nextSprintId: string | null },
) {
  return request<SprintBoard>(`/projects/${projectId}/sprints/${id}/close`, {
    method: "POST",
    headers: { "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify(input),
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
