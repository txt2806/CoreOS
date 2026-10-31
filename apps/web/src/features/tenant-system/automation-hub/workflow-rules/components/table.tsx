"use client";

import { FIELD_LABELS, OPERATOR_LABELS } from "../constants";
import { describeSpec, formatDateTime } from "../format";
import type { Rule, RuleField, Operator } from "../types";
import type { RuleSort } from "../hooks/use-rules";
import { EnabledBadge, TriggerBadge } from "./primitives";

function conditionText(field: RuleField, operator: Operator, value: string): string {
  const head = `${FIELD_LABELS[field]} ${OPERATOR_LABELS[operator]}`;
  return operator === "exists" ? head : `${head} ${value}`;
}

export function RuleTable({
  rows,
  pendingId,
  sort,
  onSort,
  onEdit,
  onToggle,
  onRuns,
  onDelete,
}: {
  rows: Rule[];
  pendingId: string | null;
  sort: RuleSort;
  onSort: (sort: RuleSort) => void;
  onEdit: (rule: Rule) => void;
  onToggle: (rule: Rule) => void;
  onRuns: (rule: Rule) => void;
  onDelete: (rule: Rule) => void;
}) {
  const header = (label: string, key: RuleSort, active: "ascending" | "descending") => (
    <th
      scope="col"
      aria-sort={sort === key ? active : "none"}
      style={{ whiteSpace: "nowrap" }}
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onSort(sort === key ? "order" : key)}
        style={{ paddingInline: 0 }}
      >
        {label}
        {sort === key ? <span aria-hidden="true">{active === "ascending" ? " ↑" : " ↓"}</span> : null}
      </button>
    </th>
  );

  return (
    <table className="data-table">
      <caption className="sr-only">
        Danh sách quy tắc tự động theo thứ tự chạy. Mỗi dòng có thao tác bật tắt, xem lượt chạy, sửa
        và xoá.
      </caption>
      <thead>
        <tr>
          {header("Quy tắc", "name", "ascending")}
          <th scope="col">Thời điểm</th>
          <th scope="col">Điều kiện</th>
          <th scope="col">Hành động</th>
          <th scope="col">Trạng thái</th>
          {header("Lần chạy gần nhất", "lastRun", "descending")}
          <th scope="col">
            <span className="sr-only">Thao tác</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((rule) => {
          const pending = pendingId === rule.id;
          const first = rule.condition[0];
          return (
            <tr key={rule.id}>
              <td>
                <div className="stack gap-0.5" style={{ minWidth: 220 }}>
                  <span className="cell-title">{rule.name}</span>
                  <span className="muted truncate" style={{ maxWidth: 320 }}>
                    {rule.description || "Không có mô tả"}
                  </span>
                </div>
              </td>
              <td>
                <TriggerBadge trigger={rule.trigger} />
              </td>
              <td>
                {rule.condition.length === 0 ? (
                  <span className="muted">Mọi công việc</span>
                ) : (
                  <div className="stack gap-0.5">
                    <span className="tabular">
                      {rule.condition.length.toLocaleString("vi-VN")} điều kiện
                    </span>
                    <span className="muted truncate" style={{ maxWidth: 260 }}>
                      {first ? conditionText(first.field, first.operator, first.value) : null}
                    </span>
                  </div>
                )}
              </td>
              <td>
                <div className="stack gap-0.5">
                  <span className="tabular">
                    {rule.actions.length.toLocaleString("vi-VN")} hành động
                  </span>
                  <span className="muted truncate" style={{ maxWidth: 260 }}>
                    {rule.actions.map((action) => describeSpec(action)).join(" · ")}
                  </span>
                </div>
              </td>
              <td>
                <EnabledBadge enabled={rule.enabled} />
              </td>
              <td>
                <div className="stack gap-0.5">
                  <span className="tabular">
                    {rule.lastRunAt ? formatDateTime(rule.lastRunAt) : "Chưa chạy lần nào"}
                  </span>
                  <span className="muted tabular">
                    Tổng {rule.runCount.toLocaleString("vi-VN")} lượt
                  </span>
                </div>
              </td>
              <td>
                <div className="row items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onToggle(rule)}
                    disabled={pending}
                    aria-busy={pending}
                    aria-label={`${rule.enabled ? "Tắt" : "Bật"} quy tắc ${rule.name}`}
                  >
                    {pending ? "Đang lưu…" : rule.enabled ? "Tắt" : "Bật"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onRuns(rule)}
                    aria-label={`Xem lượt chạy của quy tắc ${rule.name}`}
                  >
                    Lượt chạy
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onEdit(rule)}
                    aria-label={`Sửa quy tắc ${rule.name}`}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onDelete(rule)}
                    aria-label={`Xoá quy tắc ${rule.name}`}
                  >
                    Xoá
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
