import type {
  Decision,
  EntryInput,
  EntryPatch,
  PageResult,
  Period,
  PeriodDetail,
  PeriodStatus,
  PermissionSnapshot,
  ProjectOption,
  TimesheetRules,
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

export interface PeriodListQuery {
  page: number;
  pageSize: number;
  status?: PeriodStatus | "";
  from?: string;
  to?: string;
}

export function listPeriods(query: PeriodListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.status) search.set("status", query.status);
  /* `from`/`to` bound the week, not a single day: the repository compares weekStart/End. */
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  return request<PageResult<Period>>(`/timesheets/periods?${search.toString()}`);
}

export function getRules() {
  return request<TimesheetRules>("/timesheets/rules");
}

/** Opening the same week twice returns the existing period, so the button is safe. */
export function openPeriod(weekStart?: string) {
  return request<PeriodDetail>("/timesheets/periods", {
    method: "POST",
    body: JSON.stringify(weekStart ? { weekStart } : {}),
  });
}

export function getPeriod(id: string) {
  return request<PeriodDetail>(`/timesheets/periods/${id}`);
}

/** Entry creation is the only repeatable write; the key makes a double click harmless. */
export function addEntry(periodId: string, input: EntryInput) {
  return request<PeriodDetail>(`/timesheets/periods/${periodId}/entries`, {
    method: "POST",
    headers: { "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify(input),
  });
}

export function updateEntry(periodId: string, entryId: string, input: EntryPatch) {
  return request<PeriodDetail>(`/timesheets/periods/${periodId}/entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** The version travels in the body because Delete carries no query for the row guard. */
export function removeEntry(periodId: string, entryId: string, version: number) {
  return request<PeriodDetail>(`/timesheets/periods/${periodId}/entries/${entryId}`, {
    method: "DELETE",
    body: JSON.stringify({ version }),
  });
}

export function submitPeriod(id: string) {
  return request<PeriodDetail>(`/timesheets/periods/${id}/submit`, { method: "POST" });
}

export function decidePeriod(id: string, decision: Decision, note: string) {
  return request<PeriodDetail>(`/timesheets/periods/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
}

/** Allowed on APPROVED periods only; the row is appended, the original entry is kept. */
export function adjustEntry(entryId: string, deltaMinutes: number, note: string) {
  return request<PeriodDetail>(`/timesheets/entries/${entryId}/adjustments`, {
    method: "POST",
    body: JSON.stringify({ deltaMinutes, note }),
  });
}

/**
 * `GET /projects` is the only source of project labels and lives behind its own
 * permission. Failing to read it must not break the timesheet, so the caller
 * degrades to a short id instead of an invented name.
 */
export async function listProjectOptions(): Promise<ProjectOption[]> {
  try {
    const result = await request<PageResult<ProjectOption>>(
      "/projects?page=1&pageSize=100",
    );
    return result.items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
    }));
  } catch {
    return [];
  }
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
