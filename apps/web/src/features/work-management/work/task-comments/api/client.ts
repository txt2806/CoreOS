import type { CommentPage, TaskComment } from "../types";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : "Không tải được trao đổi của công việc.";
    throw new Error(message);
  }
  return body as T;
}

export function listComments(taskId: string, pageSize = 50) {
  const search = new URLSearchParams({ taskId, page: "1", pageSize: String(pageSize) });
  return request<CommentPage>(`/task-comments?${search.toString()}`);
}

export function addComment(taskId: string, body: string) {
  return request<TaskComment>("/task-comments", {
    method: "POST",
    body: JSON.stringify({ taskId, body, mentions: [], attachments: [] }),
  });
}
