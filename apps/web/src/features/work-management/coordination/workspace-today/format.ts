/** dd/MM/yyyy — one date shape for the whole product. */
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

/** Local date key, never UTC — a check-in belongs to the day the person worked. */
export function todayIso(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** HH:mm in the browser's timezone. */
export function nowClock(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function weekdayLabel(date = new Date()): string {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Minutes between two HH:mm clock values, crossing midnight safely. */
export function minutesBetween(from: string, to: string): number | null {
  const [fromH, fromM] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);
  if (fromH === undefined || fromM === undefined || toH === undefined || toM === undefined)
    return null;
  if ([fromH, fromM, toH, toM].some((part) => Number.isNaN(part))) return null;
  const start = fromH * 60 + fromM;
  const end = toH * 60 + toM;
  return end >= start ? end - start : end + 24 * 60 - start;
}

export function durationLabel(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} phút`;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}
