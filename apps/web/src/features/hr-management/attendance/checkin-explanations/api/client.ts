import type {
  DecisionInput,
  Explanation,
  ExplanationInput,
  ExplanationPatch,
  ExplanationStatus,
  ExplanationType,
  PageResult,
  PermissionsMe,
  Session,
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

export interface ExplanationListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: ExplanationStatus | "";
  type?: ExplanationType | "";
  employeeId?: string;
  from?: string;
  to?: string;
}

export function listExplanations(query: ExplanationListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  if (query.type) search.set("type", query.type);
  if (query.employeeId) search.set("employeeId", query.employeeId);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  return request<PageResult<Explanation>>(`/checkin-explanations?${search.toString()}`);
}

/** One cheap probe per status keeps the strip truthful without loading rows. */
export function explanationTotal(status: ExplanationStatus) {
  const search = new URLSearchParams({ page: "1", pageSize: "1", status });
  return request<PageResult<Explanation>>(`/checkin-explanations?${search.toString()}`).then(
    (result) => result.total,
  );
}

export function createExplanation(input: ExplanationInput) {
  return request<Explanation>("/checkin-explanations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateExplanation(id: string, patch: ExplanationPatch) {
  return request<Explanation>(`/checkin-explanations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function decideExplanation(id: string, input: DecisionInput) {
  return request<Explanation>(`/checkin-explanations/${id}/decision`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelExplanation(id: string, version: number) {
  return request<Explanation>(`/checkin-explanations/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

/** The signed-in actor is the only trustworthy source of “my” employee id. */
export function session() {
  return request<Session>("/auth/session");
}

export function permissionsMe() {
  return request<PermissionsMe>("/permissions/me");
}

export function actionsOf(body: PermissionsMe, featureKey: string): string[] {
  return body.items.find((item) => item.featureKey === featureKey)?.actions ?? [];
}
