import { SESSION_MULTI_DAY, SESSION_SINGLE_DAY } from "./constants";
import type { LeaveRequest } from "./types";

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

/** Whole days between two keys, used only to flag a late submission. */
export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Working days in a window, mirroring `weekdaysBetween` in the service so the
 * form can preview the day count the server will store.
 */
export function workingDays(from: string, to: string): number {
  if (!from || !to || from > to) return 0;
  let days = 0;
  const cursor = new Date(`${from}T00:00:00.000Z`);
  if (Number.isNaN(cursor.getTime())) return 0;
  for (; cursor.toISOString().slice(0, 10) <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
    if (days > 366) break;
  }
  return days;
}

export function sessionOf(request: Pick<LeaveRequest, "fromDate" | "toDate">): string {
  return request.fromDate === request.toDate ? SESSION_SINGLE_DAY : SESSION_MULTI_DAY;
}

export function plural(count: number, unit = "đơn"): string {
  return `${count.toLocaleString("vi-VN")} ${unit}`;
}

export function number(value: number): string {
  return value.toLocaleString("vi-VN");
}

/** Escapes a cell so a comma inside a reason cannot break the CSV columns. */
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
