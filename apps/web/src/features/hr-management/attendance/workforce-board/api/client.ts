import type {
  PageResult,
  PermissionsMe,
  Presence,
  PresenceInput,
  PresencePatch,
  PresenceStatus,
  PresenceSummary,
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

export interface PresenceListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: PresenceStatus | "";
  workDate: string;
}

export function listPresence(query: PresenceListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    workDate: query.workDate,
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  return request<PageResult<Presence>>(`/workforce-board?${search.toString()}`);
}

/** Counts for the chosen date only; the endpoint ignores paging entirely. */
export function presenceSummary(workDate: string) {
  const search = new URLSearchParams({ workDate });
  return request<PresenceSummary>(`/workforce-board/summary?${search.toString()}`);
}

export function createPresence(input: PresenceInput) {
  return request<Presence>("/workforce-board", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePresence(id: string, patch: PresencePatch) {
  return request<Presence>(`/workforce-board/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function session() {
  return request<{ actor: { employeeId: string; displayName: string; username: string } }>(
    "/auth/session",
  );
}

export function permissionsMe() {
  return request<PermissionsMe>("/permissions/me");
}

export function actionsOf(body: PermissionsMe, featureKey: string): string[] {
  return body.items.find((item) => item.featureKey === featureKey)?.actions ?? [];
}
