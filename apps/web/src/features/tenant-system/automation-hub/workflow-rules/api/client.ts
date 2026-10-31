import type {
  Rule,
  RuleInput,
  RuleList,
  RulePatch,
  Run,
  RunQuery,
  ToggleInput,
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

export function listRules() {
  return request<RuleList>("/automation/rules");
}

export function createRule(input: RuleInput) {
  return request<Rule>("/automation/rules", { method: "POST", body: JSON.stringify(input) });
}

export function updateRule(id: string, patch: RulePatch) {
  return request<Rule>(`/automation/rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Toggle has its own route and answers 200 with the refreshed rule. */
export function toggleRule(id: string, input: ToggleInput) {
  return request<Rule>(`/automation/rules/${id}/toggle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** DELETE keeps its body empty, so the version travels in the query string. */
export function deleteRule(id: string, version: number) {
  return request<{ id: string }>(
    `/automation/rules/${id}?version=${encodeURIComponent(String(version))}`,
    { method: "DELETE" },
  );
}

export function listRuns(query: RunQuery = {}) {
  const params = new URLSearchParams();
  if (query.ruleId) params.set("ruleId", query.ruleId);
  if (query.outcome) params.set("outcome", query.outcome);
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.toString();
  return request<{ items: Run[] }>(`/automation/runs${suffix ? `?${suffix}` : ""}`);
}
