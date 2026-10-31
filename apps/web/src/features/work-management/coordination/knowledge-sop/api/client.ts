import type { KnowledgeNote, NoteInput, NoteStatus, PageResult } from "../types";

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

export interface NoteListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: NoteStatus | "";
}

export function listNotes(query: NoteListQuery) {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q?.trim()) search.set("q", query.q.trim());
  if (query.status) search.set("status", query.status);
  return request<PageResult<KnowledgeNote>>(`/notes?${search.toString()}`);
}

export function noteTotal(status: NoteStatus) {
  const search = new URLSearchParams({ page: "1", pageSize: "1", status });
  return request<PageResult<KnowledgeNote>>(`/notes?${search.toString()}`).then(
    (result) => result.total,
  );
}

export function getNote(id: string) {
  return request<KnowledgeNote>(`/notes/${id}`);
}

export function createNote(input: NoteInput) {
  return request<KnowledgeNote>("/notes", { method: "POST", body: JSON.stringify(input) });
}

/** `version` guards against overwriting someone else's edit (server answers 409). */
export function updateNote(id: string, input: Partial<NoteInput> & { version: number }) {
  return request<KnowledgeNote>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** The delete route reads `version` from the body, not the query string. */
export function deleteNote(id: string, version: number) {
  return request<{ id: string }>(`/notes/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ version }),
  });
}
