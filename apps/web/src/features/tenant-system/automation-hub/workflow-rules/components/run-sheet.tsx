"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ApiError, listRuns } from "../api/client";
import { OUTCOME_LABELS, RUN_LIMIT, TRIGGER_LABELS } from "../constants";
import { describeApplied, formatDateTime } from "../format";
import type { Rule, Run } from "../types";
import { CloseGlyph, OutcomeBadge } from "./primitives";

type OutcomeFilter = "" | "APPLIED" | "SKIPPED" | "FAILED";

const FILTERS: readonly { value: OutcomeFilter; label: string }[] = [
  { value: "", label: "Tất cả kết quả" },
  { value: "APPLIED", label: OUTCOME_LABELS.APPLIED },
  { value: "SKIPPED", label: OUTCOME_LABELS.SKIPPED },
  { value: "FAILED", label: OUTCOME_LABELS.FAILED },
];

/**
 * `GET /automation/runs` is the only run history the API exposes: a flat list,
 * newest first, capped by `limit`. There is no per-run detail route, so a run
 * shows everything it carries in one row.
 */
export function RunSheet({ rule, onClose }: { rule: Rule; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<OutcomeFilter>("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    listRuns({ ruleId: rule.id, limit: RUN_LIMIT, ...(outcome ? { outcome } : {}) })
      .then((body) => {
        if (!cancelled) setItems(body.items);
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof ApiError ? caught.message : "Không tải được lượt chạy của quy tắc.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [outcome, rule.id, tick]);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="page-eyebrow mono">Lượt chạy</span>
            <h2 className="page-heading" id={titleId}>
              {rule.name}
            </h2>
            <span className="muted">
              {TRIGGER_LABELS[rule.trigger]} · tổng {rule.runCount.toLocaleString("vi-VN")} lượt ·
              gần nhất {formatDateTime(rule.lastRunAt)}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-icon"
            aria-label="Đóng lượt chạy"
            onClick={onClose}
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          <div className="row wrap items-center gap-2">
            <label className="muted" htmlFor="run-outcome">
              Kết quả
            </label>
            <select
              id="run-outcome"
              className="select"
              value={outcome}
              onChange={(event) =>
                setOutcome(FILTERS.find((item) => item.value === event.target.value)?.value ?? "")
              }
              style={{ width: 180 }}
            >
              {FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="muted tabular">
              {items === null ? "Đang tải…" : `${items.length}/${RUN_LIMIT} lượt gần nhất`}
            </span>
          </div>

          {error ? (
            <div className="alert alert-danger" role="alert">
              <span>{error}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>
                Thử lại
              </button>
            </div>
          ) : null}

          {items === null && !error ? (
            <div className="stack gap-3" aria-busy="true" aria-live="polite">
              <span className="sr-only">Đang tải lượt chạy…</span>
              {[0, 1, 2].map((row) => (
                <div key={row} className="skeleton skeleton-row" aria-hidden="true" />
              ))}
            </div>
          ) : null}

          {items !== null && items.length === 0 ? (
            <div className="empty-state">
              <span className="empty-title">Chưa có lượt chạy nào</span>
              <p className="empty-body">
                {rule.enabled
                  ? "Quy tắc sẽ ghi lượt chạy đầu tiên khi có công việc thoả điều kiện ở thời điểm đã chọn."
                  : "Quy tắc đang tắt nên không ghi lượt chạy nào. Bật quy tắc để bắt đầu theo dõi."}
              </p>
            </div>
          ) : null}

          {items !== null && items.length > 0 ? (
            <ol className="timeline">
              {items.map((run) => (
                <li key={run.id} className="stack gap-1">
                  <div className="row wrap items-center gap-2">
                    <OutcomeBadge outcome={run.outcome} />
                    <span className="mono">{run.code}</span>
                    <span className="muted tabular">{formatDateTime(run.createdAt)}</span>
                  </div>
                  <span className="muted">{run.reason}</span>
                  {run.actions.length > 0 ? (
                    <span className="list-main">
                      {run.actions.map((action) => describeApplied(action)).join(" · ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <div className="sheet-foot">
          <span className="muted">Máy chủ chỉ trả các lượt mới nhất, không phân trang.</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>
    </>
  );
}
