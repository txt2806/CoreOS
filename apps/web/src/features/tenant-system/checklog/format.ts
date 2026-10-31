import { DIFF_PREVIEW_LENGTH } from "./constants";

/** dd/MM/yyyy — the one date shape the product shows. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

export function clockOf(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(value)} ${clockOf(date)}`;
}

/** Audit rows are dense: the table keeps dd/MM + HH:mm, never a long date string. */
export function compactStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const [day, month, year] = formatDate(value).split("/");
  return `${day}/${month}/${year?.slice(2)} ${clockOf(date)}`;
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function flat(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function equals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function show(value: unknown): string {
  if (value === undefined) return "∅";
  if (value === null) return "null";
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

/**
 * Turns the stored `before`/`after` payloads into one scannable line for the table.
 * Values were redacted before storage, so a secret field already reads `[đã ẩn]`.
 */
export function diffPreview(before: unknown, after: unknown): string {
  const left = flat(before);
  const right = flat(after);
  if (!left && !right) return "Không ghi giá trị trước/sau";

  const keys = [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])];
  const parts: string[] = [];
  for (const key of keys) {
    const a = left?.[key];
    const b = right?.[key];
    if (equals(a, b)) continue;
    parts.push(`${key}: ${show(a)} → ${show(b)}`);
  }
  if (parts.length === 0) return "Không có trường thay đổi";

  const text = parts.join(" · ");
  return text.length > DIFF_PREVIEW_LENGTH ? `${text.slice(0, DIFF_PREVIEW_LENGTH)}…` : text;
}

/** Full payload for the detail sheet; JSON keeps the stored shape visible. */
export function prettyValue(value: unknown): string {
  if (value === undefined || value === null) return "Không có dữ liệu";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("vi");
}
