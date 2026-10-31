/** dd/MM/yyyy — the one date shape the whole product shows. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
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

export function formatClock(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "—";
}

/** Local date key, never UTC — a shift belongs to the day the person works. */
export function todayIso(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateKey;
  return todayIso(new Date(year, month - 1, day + days));
}

/** Inclusive day count, used to warn before a bulk write crosses the API cap. */
export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** 1 = Monday … 7 = Sunday, matching the API's slot numbering. */
export function weekdayNumber(dateKey: string): number {
  const parsed = Date.parse(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed)) return 0;
  return ((new Date(parsed).getUTCDay() + 6) % 7) + 1;
}

export function weekdayLabel(dateKey: string): string {
  const names = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];
  const index = weekdayNumber(dateKey) - 1;
  return names[index] ?? "";
}

/** `hours` arrives as a decimal from the server; keep one fraction digit. */
export function hoursLabel(hours: number): string {
  return `${hours.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} giờ`;
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
