import { WEEKDAYS } from "./constants";

/** dd/MM/yyyy — the one date shape the whole product shows. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

/** dd/MM/yyyy HH:mm for audit timestamps. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

/** "08:30 – 18:00" for the KPI strip. */
export function span(start: string, end: string): string {
  return `${start} – ${end}`;
}

/**
 * Working days always render in ISO order and collapse a full week, because
 * "T2, T3, T4, T5, T6, T7, CN" is unreadable in a table cell.
 */
export function weekdaySummary(days: number[]): string {
  const sorted = WEEKDAYS.filter((day) => days.includes(day.value));
  if (sorted.length === WEEKDAYS.length) return "Cả tuần";
  if (sorted.length === 0) return "Chưa chọn ngày";
  return sorted.map((day) => day.short).join(", ");
}

/** Minutes between two `HH:mm` values; negative when the shift crosses midnight. */
export function shiftMinutes(start: string, end: string): number {
  const toMinutes = (clock: string) => {
    const [hours, minutes] = clock.split(":").map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
  };
  return toMinutes(end) - toMinutes(start);
}
