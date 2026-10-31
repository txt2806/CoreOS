import type { NotificationItem, NotificationPage, SessionView } from "../types";

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

export interface NotificationListQuery {
  recipient: string;
  page: number;
  pageSize: number;
  unread?: boolean;
}

export function listNotifications(query: NotificationListQuery) {
  const search = new URLSearchParams({
    recipient: query.recipient,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.unread) search.set("unread", "true");
  return request<NotificationPage>(`/notifications?${search.toString()}`);
}

export function markRead(id: string) {
  return request<NotificationItem>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllRead(recipient: string) {
  return request<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
    body: JSON.stringify({ recipient }),
  });
}

/** The server keeps the row and stamps `deletedAt`; the list simply stops returning it. */
export function removeNotification(id: string) {
  return request<NotificationItem>(`/notifications/${id}`, { method: "DELETE" });
}

export function session() {
  return request<SessionView>("/auth/session");
}

/** Same-origin SSE endpoint; the proxy forwards the stream chunk by chunk. */
export function streamUrl(recipient: string) {
  return `/api/v1/notifications/stream?recipient=${encodeURIComponent(recipient)}`;
}
