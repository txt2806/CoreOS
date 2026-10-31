import { SOON_WINDOW_DAYS } from "./constants";

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

export type DeadlineTone = "overdue" | "soon" | "normal";

/** Urgency is measured from today, not from row order. */
export function targetTone(date: string, status: string): DeadlineTone {
  if (status === "COMPLETED" || status === "CANCELLED") return "normal";
  const days = daysLeft(date);
  if (days === null) return "normal";
  if (days < 0) return "overdue";
  if (days <= SOON_WINDOW_DAYS) return "soon";
  return "normal";
}

export function daysLeft(date: string): number | null {
  const limit = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(limit.getTime())) return null;
  const now = new Date(`${today()}T00:00:00`);
  return Math.round((limit.getTime() - now.getTime()) / 86_400_000);
}

/** Percentage of linked work that is done; `null` when nothing is linked yet. */
export function donePercent(itemCount: number, completedCount: number): number | null {
  if (itemCount <= 0) return null;
  return Math.round((completedCount / itemCount) * 100);
}

/** Escapes a cell so a comma inside a milestone name cannot break the CSV columns. */
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
