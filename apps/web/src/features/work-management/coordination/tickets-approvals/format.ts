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

export function money(value: number | undefined): string {
  if (typeof value !== "number") return "—";
  return `${value.toLocaleString("vi-VN")} ₫`;
}

/**
 * The API sends `remainingMinutes` at response time; the label keeps that
 * snapshot honest instead of pretending the clock is live.
 */
export function remainingLabel(minutes: number): string {
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  const span = hours ? (rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`) : `${rest} phút`;
  return minutes < 0 ? `Quá hạn ${span}` : `Còn ${span}`;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("vi");
}
