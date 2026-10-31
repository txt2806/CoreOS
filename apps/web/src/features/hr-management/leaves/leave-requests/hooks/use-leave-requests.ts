"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  annualQuota,
  cancelLeave,
  createLeave,
  leaveTotal,
  listLeaves,
  permissionsMe,
  session as loadSession,
  snapshotOf,
  updateLeave,
  usedLeaveDays,
  type LeaveListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  LeaveInput,
  LeavePatch,
  LeaveRequest,
  LeaveStatus,
  PageResult,
  PermissionSnapshot,
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

const EMPTY: PageResult<LeaveRequest> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const YEAR = new Date().getFullYear();

/**
 * Owns the list, the filter state, the permission snapshot and the quota context
 * for the leave screen. Nothing is optimistically assumed to have succeeded
 * except the cancel action, which rolls back on failure.
 */
export function useLeaveRequests() {
  const [query, setQuery] = useState<LeaveListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
    leaveType: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<LeaveRequest>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [actor, setActor] = useState<Session["actor"] | null>(null);
  const [quota, setQuota] = useState<QuotaContext | null>(null);
  const [quotaProblem, setQuotaProblem] = useState<string | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, LeaveStatus>>({});
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
    listLeaves({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách đơn nghỉ phép."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
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
        /* Without the actor the form asks for the employee code by hand. */
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
          result ? null : "Chưa cấu hình hạn mức phép năm cho năm nay trong Chính sách làm việc.",
        );
      })
      .catch(() => {
        if (cancelled) return;
        setQuota(null);
        setQuotaProblem(
          "Không đọc được hạn mức phép năm (cần quyền xem Chính sách làm việc).",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      leaveTotal("PENDING"),
      leaveTotal("APPROVED"),
      leaveTotal("REJECTED"),
      leaveTotal("CANCELLED"),
    ])
      .then(([pending, approved, rejected, cancelledCount]) => {
        if (cancelled) return;
        setTotals({ pending, approved, rejected, cancelled: cancelledCount });
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

  const patchQuery = useCallback((patch: Partial<LeaveListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", leaveType: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: LeaveInput) => {
      const created = await createLeave(input);
      setFeedback({
        tone: "success",
        message: `Đã gửi đơn nghỉ ${created.days.toLocaleString("vi-VN")} ngày cho ${created.employeeName}.`,
        hint: "Đơn đang chờ quản lý duyệt. Bạn có thể hủy khi đơn còn ở trạng thái chờ.",
      });
      reload();
      return created;
    },
    [reload],
  );

  const patch = useCallback(
    async (request: LeaveRequest, input: Omit<LeavePatch, "version">) => {
      const updated = await updateLeave(request.id, { ...input, version: request.version });
      setFeedback({ tone: "success", message: "Đã lưu thay đổi cho đơn nghỉ phép." });
      reload();
      return updated;
    },
    [reload],
  );

  const cancel = useCallback(
    async (request: LeaveRequest) => {
      setPendingCancel(request.id);
      setOptimistic((current) => ({ ...current, [request.id]: "CANCELLED" }));
      try {
        await cancelLeave(request.id, request.version);
        setFeedback({
          tone: "success",
          message: `Đã hủy đơn nghỉ của ${request.employeeName}.`,
          hint: "Ngày nghỉ đã hủy không còn được tính vào hạn mức phép năm.",
        });
        reload();
      } catch (caught) {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[request.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa hủy được đơn nghỉ phép.",
          hint: "Đơn đã trở về trạng thái trước đó. Tải lại để xem dữ liệu mới nhất.",
        });
      } finally {
        setPendingCancel(null);
      }
    },
    [reload],
  );

  /** The form asks for one employee's spent days; the server scopes it for employees. */
  const usedDaysOf = useCallback(async (employeeId: string) => {
    if (!employeeId.trim()) return null;
    try {
      return await usedLeaveDays(
        employeeId.trim(),
        `${YEAR}-01-01`,
        `${YEAR}-12-31`,
      );
    } catch {
      return null;
    }
  }, []);

  const filtersActive = Boolean(term || query.status || query.leaveType);

  const result = useMemo(
    () => ({
      data,
      loading,
      error,
      permission,
      actor,
      quota,
      quotaProblem,
      totals,
      feedback,
      filtersActive,
      pendingCancel,
      optimistic,
    }),
    [
      data,
      loading,
      error,
      permission,
      actor,
      quota,
      quotaProblem,
      totals,
      feedback,
      filtersActive,
      pendingCancel,
      optimistic,
    ],
  );

  return {
    ...result,
    query,
    term,
    year: YEAR,
    patchQuery,
    clearFilters,
    reload,
    can,
    create,
    patch,
    cancel,
    usedDaysOf,
    setFeedback,
  };
}
