import type {
  Matrix,
  MyPermissions,
  PermissionChangeEntry,
  SaveMatrixInput,
} from "../types";

/** Same-origin proxy in front of NestJS; the HttpOnly cookie carries the session. */
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

/** Full matrix: one row per feature and role, in catalog order. */
export function matrix() {
  return request<Matrix>("/permissions");
}

/** Session-only probe: who am I and may I edit the matrix at all. */
export function mine() {
  return request<MyPermissions>("/permissions/me");
}

export function history() {
  return request<{ items: PermissionChangeEntry[] }>("/permissions/history");
}

/** Returns the recomputed matrix, so the form never keeps a guessed state. */
export function saveMatrix(input: SaveMatrixInput) {
  return request<Matrix>("/permissions", { method: "PUT", body: JSON.stringify(input) });
}
