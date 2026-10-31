"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  capacityDetail,
  createPeriod,
  listPeriods,
  permissionsMe,
  type PeriodListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  CapacitySummary,
  PageResult,
  Period,
  PeriodInput,
  PermissionSnapshot,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<Period> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the period list, its filters, the permission snapshot and the capacity
 * numbers. The list endpoint returns raw period inputs only, so each loaded row
 * is completed with its own `/summary` read.
 */
export function useCapacity() {
  const [query, setQuery] = useState<PeriodListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    from: "",
    to: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Period>>(EMPTY);
  const [summaries, setSummaries] = useState<Record<string, CapacitySummary>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
    listPeriods({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách kỳ công suất."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, tick]);

  /**
   * One summary per visible period. A failed read only weakens that row's
   * utilisation cell; it must not turn the whole board into an error.
   */
  useEffect(() => {
    const items = data.items;
    if (items.length === 0) {
      setSummaries({});
      return;
    }
    let cancelled = false;
    setSummariesLoading(true);
    Promise.allSettled(items.map((period) => capacityDetail(period.id)))
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, CapacitySummary> = {};
        for (const result of results) {
          if (result.status === "fulfilled") next[result.value.summary.periodId] = result.value.summary;
        }
        setSummaries(next);
      })
      .finally(() => {
        if (!cancelled) setSummariesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

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
        if (!cancelled) {
          setPermission({ role: "EMPLOYEE", isSystemAdmin: false, actions: [] });
        }
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

  const patchQuery = useCallback((patch: Partial<PeriodListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", from: "", to: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: PeriodInput) => {
      const created = await createPeriod(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo kỳ công suất cho ${created.employeeName}.`,
        hint: "Mở kỳ để phân bổ dự án và xem công suất còn trống.",
      });
      reload();
      return created;
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.from || query.to);

  const result = useMemo(
    () => ({
      data,
      summaries,
      summariesLoading,
      loading,
      error,
      permission,
      feedback,
      filtersActive,
    }),
    [data, summaries, summariesLoading, loading, error, permission, feedback, filtersActive],
  );

  return {
    ...result,
    query,
    term,
    patchQuery,
    clearFilters,
    reload,
    can,
    create,
    setFeedback,
  };
}
