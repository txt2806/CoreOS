/** Mirrors `apps/api/src/features/tenant-system/checklog/dto/checklog.dto.ts`. */
export const AUDIT_RESULTS = ["SUCCESS", "DENIED", "FAILED"] as const;

export type AuditResult = (typeof AUDIT_RESULTS)[number];

export interface AuditEntry {
  id: string;
  featureKey: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  reason: string;
  /** Redacted server-side before storage; never assume a shape. */
  before: unknown;
  after: unknown;
  actorAccountId: string | null;
  actorName: string;
  actorRole: string;
  isSystemAdmin: boolean;
  isOutOfScopeOverride: boolean;
  result: AuditResult;
  createdAt: string;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Facet {
  key: string;
  count: number;
}

export interface AuditFacets {
  features: Facet[];
  actions: Facet[];
}
