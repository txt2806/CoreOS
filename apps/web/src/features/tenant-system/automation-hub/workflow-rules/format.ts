import type { ActionSpec, AppliedAction, RunOutcome } from "./types";

/** dd/MM/yyyy — the one date shape the whole product shows. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

/** dd/MM/yyyy HH:mm for run timestamps. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

export function plural(count: number, unit: string): string {
  return `${count.toLocaleString("vi-VN")} ${unit}`;
}

/** One line per action, as the rule form and the list both describe it. */
export function describeSpec(spec: ActionSpec): string {
  switch (spec.kind) {
    case "assign":
      return `giao cho ${spec.assignee || "…"}`;
    case "status":
      return `chuyển trạng thái sang ${spec.status || "…"}`;
    case "comment":
      return "thêm bình luận";
    case "notify":
      return `báo cho ${spec.recipients || "…"}`;
  }
}

/** Same wording for the compiled action a run stored. */
export function describeApplied(action: AppliedAction): string {
  switch (action.kind) {
    case "assign":
      return `giao cho ${action.assignee}`;
    case "status":
      return `chuyển trạng thái sang ${action.status}`;
    case "comment":
      return "thêm bình luận";
    case "notify":
      return `báo cho ${action.recipients.join(", ") || "—"}`;
  }
}

export function outcomeTone(outcome: RunOutcome): string {
  switch (outcome) {
    case "APPLIED":
      return "badge-success";
    case "SKIPPED":
      return "badge-warning";
    case "FAILED":
      return "badge-danger";
    case "SIMULATED":
      return "badge-info";
  }
}
