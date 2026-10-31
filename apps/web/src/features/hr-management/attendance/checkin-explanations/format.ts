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

/** Local date key, never UTC — a correction belongs to the day the person worked. */
export function todayIso(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function weekdayLabel(date = new Date()): string {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * BR-ATT gives the employee three *working* days to file a correction, so the
 * deadline is counted in weekdays rather than calendar days.
 */
export function deadlineFor(workDate: string, workdays: number): string | null {
  const [year, month, day] = workDate.slice(0, 10).split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  let counted = 0;
  while (counted < workdays) {
    date.setDate(date.getDate() + 1);
    if (!isWeekend(date)) counted += 1;
  }
  return todayIso(date);
}

/** A pending request filed after its deadline is flagged for the reviewer. */
export function isPastDeadline(workDate: string, workdays: number, today = todayIso()): boolean {
  const limit = deadlineFor(workDate, workdays);
  return limit !== null && today > limit;
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
