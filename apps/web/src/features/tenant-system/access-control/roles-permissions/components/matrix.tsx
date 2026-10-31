"use client";

import { ACTION_LABELS, ROLE_LABELS } from "../constants";
import type { PermissionAction, PermissionRole } from "../types";

export interface MatrixRow {
  featureKey: string;
  label: string;
}

/**
 * Checkbox grid: one row per feature, one column per assignable action.
 * Native checkboxes keep the whole grid tabbable and Space-toggleable without
 * a roving-tabindex implementation.
 */
export function PermissionMatrix({
  rows,
  role,
  assignable,
  actionsFor,
  isDirty,
  isDefault,
  editable,
  onToggle,
}: {
  rows: MatrixRow[];
  role: PermissionRole;
  assignable: PermissionAction[];
  actionsFor: (featureKey: string, role: PermissionRole) => PermissionAction[];
  isDirty: (featureKey: string, role: PermissionRole) => boolean;
  isDefault: (featureKey: string, role: PermissionRole) => boolean;
  editable: boolean;
  onToggle: (featureKey: string, action: PermissionAction) => void;
}) {
  return (
    <table className="data-table">
      <caption className="sr-only">
        Ma trận quyền của vai trò {ROLE_LABELS[role]}. Mỗi dòng là một chức năng, mỗi cột là một hành
        động.
      </caption>
      <thead>
        <tr>
          <th scope="col" style={{ minWidth: 240 }}>
            Chức năng
          </th>
          {assignable.map((action) => (
            <th
              key={action}
              scope="col"
              style={{ width: 88, textAlign: "center", whiteSpace: "nowrap" }}
            >
              {ACTION_LABELS[action]}
            </th>
          ))}
          <th scope="col" style={{ width: 132 }}>
            Trạng thái
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const granted = actionsFor(row.featureKey, role);
          const dirty = isDirty(row.featureKey, role);
          const fallback = isDefault(row.featureKey, role);

          return (
            <tr key={row.featureKey}>
              <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "var(--space-2) var(--space-4)" }}>
                <div className="stack gap-0.5" style={{ minWidth: 0 }}>
                  <span className="cell-title">{row.label}</span>
                  <span className="mono subtle truncate" style={{ fontSize: "var(--type-micro-size)" }}>
                    {row.featureKey}
                  </span>
                </div>
              </th>
              {assignable.map((action) => {
                const checked = granted.includes(action);
                return (
                  <td key={action} style={{ textAlign: "center" }}>
                    <label className="checkbox" style={{ justifyContent: "center", width: "100%" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!editable}
                        onChange={() => onToggle(row.featureKey, action)}
                        // The thead is hidden below the table breakpoint, so the
                        // action name has to travel with the control itself.
                        aria-label={`${ACTION_LABELS[action]} — ${row.label}, vai trò ${ROLE_LABELS[role]}`}
                      />
                    </label>
                  </td>
                );
              })}
              <td>
                {dirty ? (
                  <span className="badge badge-warning">
                    <span className="dot" aria-hidden="true" />
                    Chưa lưu
                  </span>
                ) : fallback ? (
                  <span className="badge">
                    <span className="dot" aria-hidden="true" />
                    Mặc định
                  </span>
                ) : (
                  <span className="badge badge-accent">
                    <span className="dot" aria-hidden="true" />
                    Đã chỉnh
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
