import type {
  AccessChangeEntry,
  Account,
  AccountListQuery,
  ChangeAccessInput,
  CreateAccountInput,
  PageResult,
  ResetPasswordInput,
  SessionResult,
  UpdateAccountInput,
} from "../types";

/**
 * Same-origin proxy in front of NestJS, so the HttpOnly session cookie travels
 * with the request and no token ever touches JavaScript.
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

function queryString(query: AccountListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  return params.toString();
}

export function listAccounts(query: AccountListQuery) {
  return request<PageResult<Account>>(`/accounts?${queryString(query)}`);
}

/** Counting probe: `pageSize=1` keeps the payload tiny, only `total` is read. */
export function accountTotal(filter: Partial<AccountListQuery>) {
  return listAccounts({ page: 1, pageSize: 1, q: "", role: "", status: "", ...filter }).then(
    (page) => page.total,
  );
}

export function getAccount(id: string) {
  return request<Account>(`/accounts/${id}`);
}

export function accountHistory(id: string) {
  return request<{ items: AccessChangeEntry[] }>(`/accounts/${id}/history`);
}

export function createAccount(input: CreateAccountInput) {
  return request<Account>("/accounts", { method: "POST", body: JSON.stringify(input) });
}

export function updateAccount(id: string, input: UpdateAccountInput) {
  return request<Account>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function changeAccess(id: string, input: ChangeAccessInput) {
  return request<Account>(`/accounts/${id}/access`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resetPassword(id: string, input: ResetPasswordInput) {
  return request<Account>(`/accounts/${id}/password`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * The access endpoints require an `actorName` in the body; the API prefers the
 * session actor, but the field is required by the schema, so the signed-in
 * display name is read from the session instead of asking the user again.
 */
export function currentSession() {
  return request<SessionResult>("/auth/session");
}
