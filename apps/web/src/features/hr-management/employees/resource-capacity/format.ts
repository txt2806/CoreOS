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

/** Local calendar day, not UTC: a capacity window is what the user sees on the wall. */
export function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function monthStart(): string {
  return `${today().slice(0, 7)}-01`;
}

export function monthEnd(): string {
  const now = new Date(`${today()}T00:00:00`);
  if (Number.isNaN(now.getTime())) return today();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const offset = last.getTimezoneOffset() * 60_000;
  return new Date(last.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Same rule as the API's `workingDaysBetween`: Monday to Friday inside the
 * window, capped at 366 so a bad input cannot spin the loop.
 */
export function weekdaysBetween(from: string, to: string): number {
  if (!from || !to || from > to) return 0;
  let days = 0;
  for (
    let cursor = new Date(`${from}T00:00:00Z`);
    cursor.toISOString().slice(0, 10) <= to;
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
    if (days > 366) break;
  }
  return days;
}

/** Hours keep at most two decimals; the API already rounds to that. */
export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
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
