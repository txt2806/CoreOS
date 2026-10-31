import { EXCERPT_LENGTH } from "./constants";
import type { NoteFields } from "./types";

/** dd/MM/yyyy — the one date shape the product shows. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(value)} ${clockOf(date)}`;
}

export function clockOf(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/** Today in the local timezone, shaped for `<input type="date">` (yyyy-MM-dd). */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The reading surface shows a plain-text excerpt; the body stays text so nothing
 * is rendered as HTML (the specification forbids injecting markup).
 */
export function excerpt(fields: NoteFields, length = EXCERPT_LENGTH): string {
  const body = (fields.content ?? "").replace(/\s+/g, " ").trim();
  if (!body) return "Chưa có nội dung";
  return body.length > length ? `${body.slice(0, length)}…` : body;
}

export function tagList(fields: NoteFields): string[] {
  return (fields.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("vi");
}

/** Splits the stored body into paragraphs so long SOP text stays readable. */
export function paragraphs(content: string | undefined): string[] {
  return (content ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}
