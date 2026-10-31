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

/** YYYY-MM → MM/yyyy, the shape Vietnamese payroll sheets use. */
export function formatPeriodKey(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month] = value.split("-");
  return year && month ? `${month}/${year}` : value;
}

/** Local date key, never UTC — a period belongs to the month people worked. */
export function todayIso(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function currentPeriodKey(date = new Date()): string {
  return todayIso(date).slice(0, 7);
}

/** First and last day of the month a period key points at. */
export function monthWindow(periodKey: string): { from: string; to: string } {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return { from: todayIso(), to: todayIso() };
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${periodKey}-01`,
    to: `${periodKey}-${String(last).padStart(2, "0")}`,
  };
}

export function numberLabel(value: number, digits = 1): string {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
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
