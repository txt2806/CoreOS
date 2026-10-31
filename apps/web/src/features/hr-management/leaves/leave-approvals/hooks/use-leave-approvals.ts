"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  annualQuota,
  decide as sendDecision,
  history,
  historyTotal,
  permissionsMe,
  queue,
  session as loadSession,
  snapshotOf,
  usedLeaveDays,
  type HistoryQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  Decision,
  DecisionStatus,
  PageResult,
  PermissionSnapshot,
  QueueItem,
  Session,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

export interface QuotaContext {
  year: number;
  daysPerYear: number;
}

export type Tab = "queue" | "history";

const EMPTY_HISTORY: PageResult<Decision> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const YEAR = new Date().getFullYear();

/**
 * Owns the approval queue, the decision history and the permission snapshot.
 * A decision is applied optimistically by removing the row; the row returns if
 * the server refuses, and the feedback line explains what happened.
 */
export function useLeaveApprovals() {
  const [tab, setTab] = useState<Tab>("queue");
  const [queueRows, setQueueRows] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<ApiError | null>(null);

  const [query, setQuery] = useState<HistoryQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [historyData, setHistoryData] = useState<PageResult<Decision>>(EMPTY_HISTORY);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<ApiError | null>(null);

  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [actor, setActor] = useState<Session["actor"] | null>(null);
  const [quota, setQuota] = useState<QuotaContext | null>(null);
  const [quotaProblem, setQuotaProblem] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ approved: number; rejected: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  /** Optimistic removals from the queue: id → the status the manager chose. */
  const [settled, setSettled] = useState<Record<string, DecisionStatus>>({});
  const [tick, setTick] = useState(0);

  const queueRequestId = useRef(0);
  const historyRequestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(query.q ?? "");
      setQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    const id = ++queueRequestId.current;
    setQueueLoading(true);
    setQueueError(null);
    queue()
      .then((rows) => {
        if (id !== queueRequestId.current) return;
        setQueueRows(rows);
      })
      .catch((caught: unknown) => {
        if (id !== queueRequestId.current) return;
        setQueueError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được hàng đợi duyệt nghỉ phép."),
        );
      })
      .finally(() => {
        if (id === queueRequestId.current) setQueueLoading(false);
      });
  }, [tick]);

  useEffect(() => {
    const id = ++historyRequestId.current;
    setHistoryLoading(true);
    setHistoryError(null);
    history({ ...query, q: term })
      .then((result) => {
        if (id !== historyRequestId.current) return;
        setHistoryData(result);
      })
      .catch((caught: unknown) => {
        if (id !== historyRequestId.current) return;
        setHistoryError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được lịch sử quyết định."),
        );
      })
      .finally(() => {
        if (id === historyRequestId.current) setHistoryLoading(false);
      });
  }, [query, term, tick]);

  useEffect(() => {
    let cancelled = false;
    permissionsMe()
      .then((body) => {
        if (!cancelled) setPermission(snapshotOf(body, FEATURE_KEY));
      })
      .catch(() => {
        if (!cancelled) setPermission({ role: "EMPLOYEE", isSystemAdmin: false, actions: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((body) => {
        if (!cancelled) setActor(body.actor);
      })
      .catch(() => {
        /* The header only greets the actor; the screen works without it. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    annualQuota(YEAR)
      .then((result) => {
        if (cancelled) return;
        setQuota(result ? { year: result.year, daysPerYear: result.daysPerYear } : null);
        setQuotaProblem(
          result
            ? null
            : "Chưa cấu hình hạn mức phép năm cho năm nay trong Chính sách làm việc.",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setQuota(null);
        setQuotaProblem("Không đọc được hạn mức phép năm nên chỉ hiển thị số ngày của đơn.");
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([historyTotal("APPROVED"), historyTotal("REJECTED")])
      .then(([approved, rejected]) => {
        if (!cancelled) setCounts({ approved, rejected });
      })
      .catch(() => {
        /* The strip hides itself rather than showing invented numbers. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const patchQuery = useCallback((patch: Partial<HistoryQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const decide = useCallback(
    async (item: QueueItem, status: DecisionStatus, note: string): Promise<boolean> => {
      setPendingId(item.id);
      setSettled((current) => ({ ...current, [item.id]: status }));
      try {
        const result = await sendDecision(item.id, { status, note });
        setFeedback({
          tone: "success",
          message:
            status === "APPROVED"
              ? `Đã duyệt ${result.request.days.toLocaleString("vi-VN")} ngày nghỉ của ${result.request.employeeName}.`
              : `Đã từ chối đơn của ${result.request.employeeName} và lưu lý do.`,
          hint:
            status === "APPROVED"
              ? "Số ngày này được tính vào hạn mức phép năm của nhân sự."
              : "Nếu đơn bị từ chối sau ngày nghỉ, khoảng nghỉ đó được tính là nghỉ không phép.",
        });
        reload();
        return true;
      } catch (caught) {
        setSettled((current) => {
          const next = { ...current };
          delete next[item.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message:
            caught instanceof Error ? caught.message : "Chưa ghi được quyết định cho đơn này.",
          hint: "Đơn đã được trả lại hàng đợi. Tải lại để xem dữ liệu mới nhất.",
        });
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [reload],
  );

  /** Quota impact: approved days already spent by the applicant this year. */
  const usedDaysOf = useCallback(async (employeeId: string) => {
    if (!employeeId.trim()) return null;
    try {
      return await usedLeaveDays(employeeId.trim(), `${YEAR}-01-01`, `${YEAR}-12-31`);
    } catch {
      return null;
    }
  }, []);

  const visibleQueue = useMemo(
    () => queueRows.filter((row) => !settled[row.id]),
    [queueRows, settled],
  );

  const filtersActive = Boolean(term || query.status);

  return {
    tab,
    setTab,
    queue: visibleQueue,
    queueTotal: queueRows.length,
    queueLoading,
    queueError,
    history: historyData,
    historyLoading,
    historyError,
    query,
    term,
    filtersActive,
    permission,
    actor,
    quota,
    quotaProblem,
    counts,
    feedback,
    pendingId,
    settled,
    year: YEAR,
    can,
    patchQuery,
    clearFilters,
    reload,
    decide,
    usedDaysOf,
    setFeedback,
  };
}
