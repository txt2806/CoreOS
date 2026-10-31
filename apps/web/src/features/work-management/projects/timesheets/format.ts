/** dd/MM/yyyy — the one date shape the whole product shows. */
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
  return `${formatDate(value)} ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** Local calendar day, not UTC: a timesheet week is what the employee sees on the wall. */
export function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return date;
  base.setDate(base.getDate() + days);
  const offset = base.getTimezoneOffset() * 60_000;
  return new Date(base.getTime() - offset).toISOString().slice(0, 10);
}

/** ISO weeks start on Monday, which is also what the API's `mondayOf` returns. */
export function mondayOf(date: string): string {
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return date;
  const weekday = (base.getDay() + 6) % 7;
  return addDays(date, -weekday);
}

export function weekRange(weekStart: string): string {
  return `${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`;
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function weekdayOf(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return WEEKDAYS[parsed.getDay()] ?? "—";
}

/** Weekdays of a period, in order, so the detail sheet can show all seven at once. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** "7g30" reads faster than "7,5 giờ" on a timesheet; a full hour stays "8g". */
export function formatMinutes(minutes: number): string {
  const safe = Number.isFinite(minutes) ? Math.trunc(minutes) : 0;
  const sign = safe < 0 ? "-" : "";
  const absolute = Math.abs(safe);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  if (!hours) return `${sign}${rest}p`;
  return rest ? `${sign}${hours}g${String(rest).padStart(2, "0")}` : `${sign}${hours}g`;
}

export function formatHours(minutes: number): string {
  return (minutes / 60).toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function count(value: number, unit = "kỳ"): string {
  return `${value.toLocaleString("vi-VN")} ${unit}`;
}

/** Escapes a cell so a comma inside a note cannot break the CSV columns. */
function csvCell(value: string): string {
  const clean = value.replaceAll('"', '""');
  return /[",\n]/.test(clean) ? `"${clean}"` : clean;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
