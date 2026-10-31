"use client";

import { formatDate, formatHours, formatPercent } from "../format";
import type { Period } from "../types";
import type { CapacityRow } from "./table";
import { CapacityBar } from "./primitives";

/**
 * Card view of the same loaded page: one widget per period, with the server's
 * utilisation as the headline. Nothing is aggregated across periods here.
 */
export function CapacityBoard({
  rows,
  onOpen,
}: {
  rows: CapacityRow[];
  onOpen: (period: Period) => void;
}) {
  return (
    <div className="bento" style={{ padding: "var(--space-4)" }}>
      {rows.map(({ period, summary }) => (
        <article key={period.id} className="widget bento-4 stack gap-3">
          <div className="widget-head">
            <div className="stack gap-1">
              <h3 className="widget-title truncate">{period.employeeName}</h3>
              <span className="muted mono truncate">{period.employeeId}</span>
            </div>
            <span className="muted tabular">
              {formatDate(period.fromDate)} – {formatDate(period.toDate)}
            </span>
          </div>

          <div className="widget-body stack gap-2">
            {summary ? (
              <>
                <div className="spread items-center gap-2">
                  <span className="metric-value tabular">{formatPercent(summary.utilization)}</span>
                  <span className="muted">
                    {formatHours(summary.allocatedHours)} /{" "}
                    {formatHours(summary.availableHours)} giờ
                  </span>
                </div>
                <CapacityBar
                  utilization={summary.utilization}
                  over={summary.overCapacity}
                  label={`Công suất của ${period.employeeName}`}
                />
                <span className="muted">
                  Còn trống {formatHours(summary.remainingHours)} giờ ·{" "}
                  {period.workingDays.toLocaleString("vi-VN")} ngày công
                </span>
              </>
            ) : (
              /* The summary read failed or is still in flight; the card stays honest. */
              <span className="muted">Chưa đọc được công suất của kỳ này.</span>
            )}
          </div>

          <div className="widget-foot">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onOpen(period)}
            >
              Mở kỳ công suất
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
