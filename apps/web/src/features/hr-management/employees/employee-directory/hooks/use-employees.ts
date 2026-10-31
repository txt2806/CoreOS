"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  employeeTotal,
  listEmployees,
  permissionsMe,
  session as loadSession,
  snapshotOf,
  updateEmployee,
  type EmployeeListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  Employee,
  EmployeeStatus,
  PageResult,
  PermissionSnapshot,
  Session,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

export interface EmployeeTotals {
  all: number;
  active: number;
}

const EMPTY: PageResult<Employee> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the directory page: filters, rows, the signed-in actor and the permission
 * snapshot. A status flip is the only optimistic write; it rolls back on refusal.
 */
export function useEmployees() {
  const [query, setQuery] = useState<EmployeeListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
    departmentName: "",
  });
  const [term, setTerm] = useState("");
  const [department, setDepartment] = useState("");
  const [data, setData] = useState<PageResult<Employee>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [actor, setActor] = useState<Session["actor"] | null>(null);
  const [totals, setTotals] = useState<EmployeeTotals | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, EmployeeStatus>>({});
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  /* Typing must not fire a request per keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(query.q ?? "");
      setDepartment(query.departmentName ?? "");
      setQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query.q, query.departmentName]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listEmployees({ ...query, q: term, departmentName: department })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError ? caught : new ApiError(0, "Không tải được danh bạ nhân sự."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, department, tick]);

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
        /* Without the actor the profile sheet simply shows no role badge. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([employeeTotal(), employeeTotal("ACTIVE")])
      .then(([all, active]) => {
        if (!cancelled) setTotals({ all, active });
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

  const patchQuery = useCallback((patch: Partial<EmployeeListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({
      ...current,
      q: "",
      status: "",
      departmentName: "",
      jobTitle: "",
      page: 1,
    }));
  }, []);

  const statusOf = useCallback(
    (row: Employee): EmployeeStatus => optimistic[row.id] ?? row.status,
    [optimistic],
  );

  const toggleStatus = useCallback(
    async (row: Employee) => {
      const next: EmployeeStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      setPendingId(row.id);
      setOptimistic((current) => ({ ...current, [row.id]: next }));
      try {
        await updateEmployee(row.id, { status: next, version: row.version });
        setFeedback({
          tone: "success",
          message:
            next === "ACTIVE"
              ? `Đã đánh dấu ${row.fullName} đang làm việc.`
              : `Đã đánh dấu ${row.fullName} đã nghỉ.`,
          hint:
            next === "ACTIVE"
              ? "Hồ sơ vẫn giữ nguyên nhóm và chức danh hiện tại."
              : "Hồ sơ vẫn tra cứu được nhưng không còn trong danh sách đang làm việc.",
        });
        reload();
      } catch (caught) {
        setOptimistic((current) => {
          const copy = { ...current };
          delete copy[row.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message:
            caught instanceof Error ? caught.message : "Chưa đổi được trạng thái nhân sự.",
          hint: "Trạng thái đã trở về như trước. Tải lại để xem dữ liệu mới nhất.",
        });
      } finally {
        setPendingId(null);
      }
    },
    [reload],
  );

  const filtersActive = Boolean(term || department || query.status || query.jobTitle);

  return {
    data,
    loading,
    error,
    query,
    term,
    department,
    permission,
    actor,
    totals,
    feedback,
    pendingId,
    optimistic,
    filtersActive,
    can,
    statusOf,
    patchQuery,
    clearFilters,
    reload,
    toggleStatus,
    setFeedback,
  };
}
