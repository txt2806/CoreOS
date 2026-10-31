"use client";

import type { WorkReport } from "../types";
import { REPORT_STATUSES } from "../types";
import { lastMonths, monthKey, monthLabel, percent, todayIso } from "../format";
import { SkeletonLines, StatusBadge } from "./primitives";

interface BreakdownProps {
  reports: WorkReport[];
  loading: boolean;
  onFilterScope: (scope: string) => void;
  onFilterAssignee: (assignee: string) => void;
}

interface Bucket {
  key: string;
  label: string;
  count: number;
}

/** Counts loaded rows only — the API exposes list rows, never ad-hoc aggregates. */
function bucketBy(reports: WorkReport[], pick: (report: WorkReport) => string, fallback: string) {
  const map = new Map<string, Bucket>();
  for (const report of reports) {
    const raw = pick(report).trim();
    const key = raw || fallback;
    const found = map.get(key);
    if (found) found.count += 1;
    else map.set(key, { key, label: key, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function MonthlyRhythm({ reports, loading }: { reports: WorkReport[]; loading: boolean }) {
  const anchor =
    [...reports].map((report) => report.date).sort((a, b) => b.localeCompare(a))[0] ?? todayIso();
  const months = lastMonths(anchor, 6);
  const counts = new Map<string, number>();
  for (const report of reports) {
    const key = monthKey(report.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const series = months.map((key) => ({ key, count: counts.get(key) ?? 0 }));
  const peak = Math.max(1, ...series.map((item) => item.count));
  const empty = series.every((item) => item.count === 0);

  return (
    <section className="widget bento-8" aria-labelledby="widget-rhythm">
      <div className="widget-head">
        <div className="stack gap-1">
          <h2 className="widget-title" id="widget-rhythm">
            Nhịp báo cáo theo tháng
          </h2>
          <p className="widget-note">
            Sáu tháng gần nhất tính tới báo cáo mới nhất đang tải
          </p>
        </div>
      </div>
      <div className="widget-body">
        {loading ? (
          <SkeletonLines rows={3} />
        ) : empty ? (
          <div className="empty-state">
            <span className="empty-title">Chưa có dữ liệu kỳ này</span>
            <p className="empty-body">
              Chưa có báo cáo nào trong sáu tháng gần nhất để vẽ nhịp phát hành.
            </p>
          </div>
        ) : (
          <>
            <div className="data-bar">
              {series.map((item) => (
                <span
                  key={item.key}
                  role="img"
                  aria-label={`${monthLabel(item.key)}: ${item.count} báo cáo`}
                  title={`${monthLabel(item.key)}: ${item.count} báo cáo`}
                  style={
                    item.count === 0
                      ? { height: 2 }
                      : { height: `${Math.max(6, Math.round((item.count / peak) * 100))}%` }
                  }
                />
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1 text-center">
              {series.map((item) => (
                <div key={item.key} className="stack gap-0 items-center">
                  <span className="tabular">{item.count.toLocaleString("vi-VN")}</span>
                  <span className="subtle">{item.key.slice(5)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="widget-foot">
        <span>Đếm trên {reports.length.toLocaleString("vi-VN")} báo cáo đang tải</span>
        <span>{monthLabel(months[months.length - 1] ?? "")}</span>
      </div>
    </section>
  );
}

function StatusSplit({ reports, loading }: { reports: WorkReport[]; loading: boolean }) {
  const base = reports.length;
  return (
    <section className="widget bento-4" aria-labelledby="widget-status">
      <div className="widget-head">
        <div className="stack gap-1">
          <h2 className="widget-title" id="widget-status">
            Theo trạng thái
          </h2>
          <p className="widget-note">Tỷ trọng trên toàn bộ báo cáo khớp bộ lọc</p>
        </div>
      </div>
      <div className="widget-body">
        {loading ? (
          <SkeletonLines rows={2} />
        ) : reports.length === 0 ? (
          <p className="muted">Chưa có dữ liệu kỳ này.</p>
        ) : (
          REPORT_STATUSES.map((status) => {
            const count = reports.filter((report) => report.status === status).length;
            const width = percent(count, base);
            return (
              <div key={status} className="stack gap-1">
                <div className="spread items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="tabular">{count.toLocaleString("vi-VN")}</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="widget-foot">
        <span>{base.toLocaleString("vi-VN")} báo cáo</span>
      </div>
    </section>
  );
}

function PeopleSplit({
  reports,
  loading,
  onFilterAssignee,
}: {
  reports: WorkReport[];
  loading: boolean;
  onFilterAssignee: (assignee: string) => void;
}) {
  const buckets = bucketBy(reports, (report) => report.assignee, "Chưa gán người lập").slice(0, 5);
  return (
    <section className="widget bento-6" aria-labelledby="widget-people">
      <div className="widget-head">
        <div className="stack gap-1">
          <h2 className="widget-title" id="widget-people">
            Theo người lập
          </h2>
          <p className="widget-note">Chọn một dòng để lọc danh sách phía dưới</p>
        </div>
      </div>
      <div className="widget-body">
        {loading ? (
          <SkeletonLines rows={3} />
        ) : buckets.length === 0 ? (
          <p className="muted">Chưa có dữ liệu kỳ này.</p>
        ) : (
          buckets.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              className="spread items-center gap-2 text-left"
              onClick={() => onFilterAssignee(bucket.key)}
              aria-label={`Lọc báo cáo của ${bucket.label}`}
            >
              <span className="truncate">{bucket.label}</span>
              <span className="row items-center gap-2">
                <span className="muted tabular">
                  {percent(bucket.count, reports.length)}%
                </span>
                <span className="tabular">{bucket.count.toLocaleString("vi-VN")}</span>
              </span>
            </button>
          ))
        )}
      </div>
      <div className="widget-foot">
        <span>Đếm trên {reports.length.toLocaleString("vi-VN")} báo cáo đang tải</span>
      </div>
    </section>
  );
}

function ScopeSplit({
  reports,
  loading,
  onFilterScope,
}: {
  reports: WorkReport[];
  loading: boolean;
  onFilterScope: (scope: string) => void;
}) {
  const buckets = bucketBy(reports, (report) => report.scope, "Chưa gắn phạm vi").slice(0, 5);
  return (
    <section className="widget bento-6" aria-labelledby="widget-scope">
      <div className="widget-head">
        <div className="stack gap-1">
          <h2 className="widget-title" id="widget-scope">
            Theo phạm vi
          </h2>
          <p className="widget-note">Chọn một dòng để lọc danh sách phía dưới</p>
        </div>
      </div>
      <div className="widget-body">
        {loading ? (
          <SkeletonLines rows={3} />
        ) : buckets.length === 0 ? (
          <p className="muted">Chưa có dữ liệu kỳ này.</p>
        ) : (
          buckets.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              className="spread items-center gap-2 text-left"
              onClick={() => onFilterScope(bucket.key)}
              aria-label={`Lọc báo cáo thuộc phạm vi ${bucket.label}`}
            >
              <span className="truncate">{bucket.label}</span>
              <span className="row items-center gap-2">
                <span className="muted tabular">
                  {percent(bucket.count, reports.length)}%
                </span>
                <span className="tabular">{bucket.count.toLocaleString("vi-VN")}</span>
              </span>
            </button>
          ))
        )}
      </div>
      <div className="widget-foot">
        <span>Đếm trên {reports.length.toLocaleString("vi-VN")} báo cáo đang tải</span>
      </div>
    </section>
  );
}

/**
 * Four breakdown widgets. They all read the same page of list rows: the API has
 * no summary endpoint (the `workspaceSummarySchema` in the DTO is unused), so
 * every figure here is an honest count of what is loaded.
 */
export function ReportBreakdowns({
  reports,
  loading,
  onFilterScope,
  onFilterAssignee,
}: BreakdownProps) {
  return (
    <div className="bento">
      <MonthlyRhythm reports={reports} loading={loading} />
      <StatusSplit reports={reports} loading={loading} />
      <PeopleSplit reports={reports} loading={loading} onFilterAssignee={onFilterAssignee} />
      <ScopeSplit reports={reports} loading={loading} onFilterScope={onFilterScope} />
    </div>
  );
}
