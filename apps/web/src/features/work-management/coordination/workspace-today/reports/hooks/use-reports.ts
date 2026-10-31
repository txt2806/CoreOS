"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  createReport,
  deleteReport,
  listReports,
  permissionsMe,
  reportTotal,
  updateReport,
  type ReportListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  PageResult,
  PermissionSnapshot,
  ReportInput,
  ReportStatus,
  WorkReport,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<WorkReport> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the report list, its filters and the permission snapshot. Publishing is
 * applied optimistically and rolled back from the server answer, so a refused
 * transition never leaves the badge lying.
 */
export function useReports() {
  const [query, setQuery] = useState<ReportListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
    scope: "",
    assignee: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<WorkReport>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [totals, setTotals] = useState<Partial<Record<ReportStatus, number>>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, ReportStatus>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  /* Typing must not fire a request per keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(query.q ?? "");
      setQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listReports({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError ? caught : new ApiError(0, "Không tải được báo cáo."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, tick]);

  /* The reload that follows a publish carries the real status; drop the guess. */
  useEffect(() => setOptimistic({}), [data]);

  useEffect(() => {
    let cancelled = false;
    permissionsMe()
      .then((body) => {
        if (cancelled) return;
        setPermission({
          role: body.role,
          isSystemAdmin: body.isSystemAdmin,
          actions: actionsOf(body, FEATURE_KEY),
        });
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
    Promise.all(
      (["Bản nháp", "Đã phát hành"] as ReportStatus[]).map((status) =>
        reportTotal(status).then((total) => [status, total] as const),
      ),
    )
      .then((pairs) => {
        if (cancelled) return;
        setTotals(Object.fromEntries(pairs) as Partial<Record<ReportStatus, number>>);
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

  const patchQuery = useCallback((patch: Partial<ReportListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", scope: "", assignee: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: ReportInput) => {
      const created = await createReport(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo báo cáo ${created.code}.`,
        hint: created.status === "Bản nháp" ? "Báo cáo đang ở bản nháp, phát hành khi đã đủ số liệu." : undefined,
      });
      reload();
      return created;
    },
    [reload],
  );

  const changeStatus = useCallback(
    async (report: WorkReport, status: ReportStatus) => {
      setPending(report.id);
      setOptimistic((current) => ({ ...current, [report.id]: status }));
      try {
        await updateReport(report.id, { status, version: report.version });
        setFeedback({
          tone: "success",
          message:
            status === "Đã phát hành"
              ? `${report.code} đã được phát hành tới người đọc.`
              : `${report.code} đã trở về bản nháp.`,
        });
        reload();
      } catch (caught) {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[report.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa đổi được trạng thái.",
          hint: "Báo cáo đã trở về trạng thái trước đó.",
        });
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (report: WorkReport) => {
      await deleteReport(report.id, report.version);
      setFeedback({
        tone: "success",
        message: `Đã xoá báo cáo ${report.code}.`,
      });
      reload();
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status || query.scope || query.assignee);

  const result = useMemo(
    () => ({ data, loading, error, permission, totals, feedback, filtersActive }),
    [data, loading, error, permission, totals, feedback, filtersActive],
  );

  return {
    ...result,
    query,
    term,
    optimistic,
    pending,
    patchQuery,
    clearFilters,
    reload,
    can,
    create,
    changeStatus,
    remove,
    setFeedback,
  };
}
