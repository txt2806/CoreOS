/**
 * Mirrors `apps/api/src/features/tenant-system/automation-hub/workflow-rules/dto/workflow-rules.dto.ts`.
 * `actionSchema` (input) keeps `notify.recipients` as a comma separated string,
 * while `appliedActionSchema` (what a run stored) already split it into a list —
 * that asymmetry is the server's, not ours.
 */
export type Trigger = "created" | "updated";

/** `WORKFLOW_FIELDS` from `core/events/workflow-events.ts`. */
export type RuleField =
  | "status"
  | "assignee"
  | "reviewer"
  | "scope"
  | "code"
  | "name"
  | "date";

export type Operator =
  | "is"
  | "isNot"
  | "in"
  | "notIn"
  | "contains"
  | "exists"
  | "changedTo";

export interface Condition {
  field: RuleField;
  operator: Operator;
  value: string;
}

export type ActionSpec =
  | { kind: "assign"; assignee: string }
  | { kind: "status"; status: string }
  | { kind: "comment"; body: string }
  | { kind: "notify"; recipients: string; title: string; body: string };

export type ActionKind = ActionSpec["kind"];

export interface Rule {
  id: string;
  name: string;
  description: string;
  trigger: Trigger;
  condition: Condition[];
  actions: ActionSpec[];
  enabled: boolean;
  stopOnMatch: boolean;
  position: number;
  lockSeconds: number;
  note: string;
  runCount: number;
  lastRunAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleList {
  items: Rule[];
  applied: number;
  skipped: number;
}

export interface RuleInput {
  name: string;
  description: string;
  trigger: Trigger;
  condition: Condition[];
  actions: ActionSpec[];
  enabled: boolean;
  stopOnMatch: boolean;
  position: number;
  lockSeconds: number;
  note: string;
}

/** `rulePatch` is `ruleInput.partial()` plus the mandatory version. */
export interface RulePatch extends Partial<RuleInput> {
  version: number;
}

export type ToggleInput = { enabled: boolean; version: number };

export type RunOutcome = "APPLIED" | "SKIPPED" | "FAILED" | "SIMULATED";

export type AppliedAction =
  | { kind: "assign"; assignee: string }
  | { kind: "status"; status: string }
  | { kind: "comment"; body: string }
  | { kind: "notify"; recipients: string[]; title: string; body: string };

export interface Run {
  id: string;
  ruleId: string;
  ruleName: string;
  entityId: string;
  code: string;
  trigger: Trigger;
  outcome: RunOutcome;
  reason: string;
  actions: AppliedAction[];
  createdAt: string;
}

export interface RunQuery {
  ruleId?: string;
  outcome?: "APPLIED" | "SKIPPED" | "FAILED";
  limit?: number;
}
