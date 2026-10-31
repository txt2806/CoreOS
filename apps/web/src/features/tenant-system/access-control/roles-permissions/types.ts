/**
 * Mirrors `apps/api/src/features/tenant-system/access-control/roles-permissions/dto/roles-permissions.dto.ts`.
 * `manage` exists in `actions` but is never storable — only a system
 * administrator holds it, so the matrix shows the assignable columns only.
 */
export type PermissionRole = "EMPLOYEE" | "MANAGER";
export type PermissionAction = "view" | "create" | "update" | "delete" | "approve" | "manage";
export type FeatureGroup = "tenant-system" | "work-management" | "hr-management" | "crm";

export interface PermissionRow {
  featureKey: string;
  group: FeatureGroup;
  label: string;
  role: PermissionRole;
  actions: PermissionAction[];
  version: number;
  isDefault: boolean;
}

export interface Matrix {
  items: PermissionRow[];
  actions: PermissionAction[];
  roles: PermissionRole[];
}

export interface MyPermissions {
  role: PermissionRole;
  isSystemAdmin: boolean;
  canManage: boolean;
  items: { featureKey: string; actions: PermissionAction[] }[];
}

export interface SaveRow {
  featureKey: string;
  role: PermissionRole;
  actions: PermissionAction[];
  /** 0 means "still on the built-in default"; every later write must match. */
  version: number;
}

export interface SaveMatrixInput {
  items: SaveRow[];
  reason?: string;
}

export interface PermissionChangeEntry {
  id: string;
  featureKey: string;
  role: PermissionRole;
  fromActions: PermissionAction[];
  toActions: PermissionAction[];
  actorName: string;
  reason: string;
  createdAt: string;
}
