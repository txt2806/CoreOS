"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  actionsOf,
  getRules,
  listPeriods,
  listProjectOptions,
  openPeriod,
  permissionsMe,
  type PeriodListQuery,
} from "../api/client";
import {
  DAY_LIMIT_MINUTES,
  DAY_THRESHOLD_MINUTES,
  DEFAULT_PAGE_SIZE,
  FEATURE_KEY,
  MINUTE_STEP,
  WEEK_THRESHOLD_MINUTES,
} from "../constants";
import type {
  PageResult,
  Period,
  PermissionSnapshot,
  ProjectOption,
  TimesheetRules,
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

/** Local copy of the server rules; replaced by `/timesheets/rules` as soon as it answers. */
const FALLBACK_RULES: TimesheetRules = {
  statuses: ["OPEN", "SUBMITTED", "APPROVED", "REJECTED"],
  minuteStep: MINUTE_STEP,
  dayLimitMinutes: DAY_LIMIT_MINUTES,
  dayThresholdMinutes: DAY_THRESHOLD_MINUTES,
  weekThresholdMinutes: WEEK_THRESHOLD_MINUTES,
};

/**
 * Owns the period list, its server filters and the permission snapshot. The
 * search box is deliberately client-side: the period query has no `q` field.
 */
export function useTimesheets() {
  const [query, setQuery] = useState<PeriodListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    status: "",
    from: "",
    to: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Period>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [rules, setRules] = useState<TimesheetRules>(FALLBACK_RULES);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPeriods(query)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách kỳ timesheet."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, tick]);

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

  /* Rules and project labels are decoration around the list; a failure only narrows the UI. */
  useEffect(() => {
    let cancelled = false;
    getRules()
      .then((body) => {
        if (!cancelled) setRules(body);
      })
      .catch(() => undefined);
    listProjectOptions().then((items) => {
      if (!cancelled) setProjects(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const isManager = Boolean(
    permission && (permission.role === "MANAGER" || permission.isSystemAdmin),
  );

  const patchQuery = useCallback((patch: Partial<PeriodListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setTerm("");
    setQuery((current) => ({ ...current, status: "", from: "", to: "", page: 1 }));
  }, []);

  const openWeek = useCallback(
    async (weekStart?: string) => {
      const detail = await openPeriod(weekStart);
      setFeedback({
        tone: "success",
        message: `Đã mở kỳ tuần ${detail.weekStart.slice(8, 10)}/${detail.weekStart.slice(5, 7)}/${detail.weekStart.slice(0, 4)}.`,
        hint: "Kỳ đang mở cho phép thêm và sửa dòng thời gian.",
      });
      reload();
      return detail;
    },
    [reload],
  );

  const projectName = useCallback(
    (id: string | null) => {
      if (!id) return "";
      return projects.find((item) => item.id === id)?.name ?? `Dự án ${id.slice(0, 8)}…`;
    },
    [projects],
  );

  const filtersActive = Boolean(query.status || query.from || query.to || term);

  const result = useMemo(
    () => ({ data, loading, error, permission, rules, projects, feedback, filtersActive, isManager }),
    [
      data,
      loading,
      error,
      permission,
      rules,
      projects,
      feedback,
      filtersActive,
      isManager,
    ],
  );

  return {
    ...result,
    query,
    term,
    setTerm,
    patchQuery,
    clearFilters,
    reload,
    can,
    openWeek,
    projectName,
    setFeedback,
  };
}
