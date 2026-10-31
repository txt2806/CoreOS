import type {
  Attendance,
  InboxEntry,
  Notice,
  PageResult,
  PermissionsMe,
  Session,
  TodayTask,
} from "../types";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      credentials: "same-origin",
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new Error("Mất kết nối tới máy chủ. Kiểm tra đường truyền rồi thử lại.");
  }

  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : "Yêu cầu không thực hiện được.";
    throw new Error(message);
  }
  return body as T;
}

export function session() {
  return request<Session>("/auth/session");
}

export function permissionsMe() {
  return request<PermissionsMe>("/permissions/me");
}

export function attendanceOf(employeeId: string, workDate: string) {
  const search = new URLSearchParams({
    employeeId,
    from: workDate,
    to: workDate,
    page: "1",
    pageSize: "1",
  });
  return request<PageResult<Attendance>>(`/daily-checkin?${search.toString()}`);
}

export function checkIn(input: {
  employeeId: string;
  employeeName: string;
  workDate: string;
  checkIn: string;
}) {
  return request<Attendance>("/daily-checkin", {
    method: "POST",
    body: JSON.stringify({ ...input, source: "WEB", note: "" }),
  });
}

export function checkOut(id: string, version: number, time: string) {
  return request<Attendance>(`/daily-checkin/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ checkOut: time, version }),
  });
}

/** The record uses a free-text assignee, so the dashboard passes the display name. */
export function myTasks(assignee: string, pageSize = 20) {
  const search = new URLSearchParams({ assignee, page: "1", pageSize: String(pageSize) });
  return request<PageResult<TodayTask>>(`/tasks?${search.toString()}`);
}

export function unreadNotices(recipient: string, pageSize = 4) {
  const search = new URLSearchParams({
    recipient,
    unread: "true",
    page: "1",
    pageSize: String(pageSize),
  });
  return request<PageResult<Notice>>(`/notifications?${search.toString()}`);
}

export function approvalsInbox(pageSize = 3) {
  const search = new URLSearchParams({ page: "1", pageSize: String(pageSize) });
  return request<PageResult<InboxEntry>>(`/requests/inbox?${search.toString()}`);
}
