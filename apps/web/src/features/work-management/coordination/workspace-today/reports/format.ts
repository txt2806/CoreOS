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

export function share(value: number, total: number): string {
  if (!total) return "chưa có dữ liệu";
  return `${Math.round((value / total) * 100)}% trên tổng`;
}

export function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

/** “tháng 11/2026” for the month buckets of the release rhythm. */
export function monthKey(value: string): string {
  return value.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  if (!year || !month) return "—";
  return `tháng ${month}/${year}`;
}

/**
 * The six months ending at the newest report date, so the rhythm widget never
 * invents buckets beyond the data the actor can see.
 */
export function lastMonths(anchor: string, count = 6): string[] {
  const [yearRaw, monthRaw] = anchor.slice(0, 7).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1) return [];
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    keys.push(
      `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, "0")}`,
    );
  }
  return keys;
}
