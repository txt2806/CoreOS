import { BODY_EXCERPT } from "./constants";

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

/**
 * Recency matters more than the exact minute in a notification list, so the
 * newest entries read as “12 phút trước” and older ones fall back to the date.
 */
export function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(value);
}

export function excerpt(body: string, length = BODY_EXCERPT): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return "Không có nội dung kèm theo";
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

/** The API stores an internal path for `link`; reject anything that is not one. */
export function safeLink(link: string): string | null {
  return link.startsWith("/") ? link : null;
}
