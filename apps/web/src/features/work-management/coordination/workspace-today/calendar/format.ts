import { WEEKDAYS } from "./constants";

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

export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Parsed at local midnight so weekday maths never drifts across time zones. */
export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function isoOf(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Long form for the agenda heading: “Thứ Hai, 03/11/2026”. */
export function weekdayLong(iso: string): string {
  const date = toDate(iso);
  if (Number.isNaN(date.getTime())) return formatDate(iso);
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export interface MonthCell {
  iso: string;
  day: number;
  weekday: string;
  isToday: boolean;
}

/**
 * Monday-first grid for one month. Leading blanks are returned as `null` so the
 * caller keeps a real seven-column table without inventing days from the
 * neighbouring months.
 */
export function monthCells(year: number, month: number): (MonthCell | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = todayIso();
  const cells: (MonthCell | null)[] = Array.from({ length: lead }, () => null);

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      iso,
      day,
      weekday: WEEKDAYS[(date.getUTCDay() + 6) % 7] ?? "",
      isToday: iso === today,
    });
  }

  /* The header always shows whole weeks, so the last row gets quiet padding. */
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

/** Agenda order: all-day items first, then by start time. */
export function byTime(
  left: { fields: { startTime?: string } },
  right: { fields: { startTime?: string } },
): number {
  const a = left.fields.startTime ?? "";
  const b = right.fields.startTime ?? "";
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}

export function minutesUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return Math.round((target - Date.now()) / 60_000);
}

export function durationLabel(minutes: number): string {
  if (minutes <= 0) return "0 phút";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} phút`;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}
