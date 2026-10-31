"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  cancelExplanation,
  createExplanation,
  decideExplanation,
  explanationTotal,
  listExplanations,
  permissionsMe,
  session,
  updateExplanation,
  type ExplanationListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY, STATUS_LABEL } from "../constants";
import type {
  DecisionInput,
  Explanation,
  ExplanationInput,
  ExplanationPatch,
  ExplanationStatus,
  PageResult,
  PermissionSnapshot,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<Explanation> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/** Statuses whose count the strip reports; CANCELLED is filtered, not promoted. */
const STRIP_STATUSES: ExplanationStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function reason(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useExplanations() {
  const [query, setQuery] = useState<ExplanationListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
    type: "",
    from: "",
    to: "",
  });
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("all");
  const [data, setData] = useState<PageResult<Explanation>>(EMPTY);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, ExplanationStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.q ?? ""), 350);
    return () => window.clearTimeout(timer);
  }, [query.q]);

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
    session()
      .then((body) => {
        if (!cancelled) {
          setMe({
            id: body.actor.employeeId,
            name: body.actor.displayName || body.actor.username,
          });
        }
      })
      .catch(() => {
        /* Without a session the “mine” switch stays hidden; the list still loads. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /** Employees may only see their own requests, so the server filter is forced. */
  const employeeFilter = scope === "mine" && me ? me.id : query.employeeId ?? "";

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listExplanations({ ...query, q: term, employeeId: employeeFilter })
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách giải trình."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, employeeFilter, tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(STRIP_STATUSES.map((status) => explanationTotal(status).catch(() => null)))
      .then((values) => {
        if (cancelled) return;
        const next: Record<string, number> = {};
        STRIP_STATUSES.forEach((status, index) => {
          const value = values[index];
          if (typeof value === "number") next[status] = value;
        });
        setTotals(next);
      })
      .catch(() => {
        /* The strip degrades to zeros rather than blocking the list. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /* The reload that follows a decision carries the real status; drop the guess. */
  useEffect(() => setOptimistic({}), [data]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const patchQuery = useCallback((patch: Partial<ExplanationListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", type: "", from: "", to: "", page: 1 }));
  }, []);

  const submit = useCallback(
    async (input: ExplanationInput) => {
      const created = await createExplanation(input);
      setFeedback({
        tone: "success",
        message: `Đã gửi giải trình cho ngày ${created.workDate}.`,
        hint: "Quản lý sẽ thấy đơn ở trạng thái chờ duyệt.",
      });
      reload();
      return created;
    },
    [reload],
  );

  const patch = useCallback(
    async (record: Explanation, change: Omit<ExplanationPatch, "version">) => {
      const updated = await updateExplanation(record.id, { ...change, version: record.version });
      setFeedback({
        tone: "success",
        message: `Đã cập nhật nội dung giải trình ngày ${updated.workDate}.`,
      });
      reload();
      return updated;
    },
    [reload],
  );

  const decide = useCallback(
    async (record: Explanation, input: Omit<DecisionInput, "version">) => {
      const before = record.status;
      setOptimistic((current) => ({ ...current, [record.id]: input.status }));
      setSavingId(record.id);
      try {
        await decideExplanation(record.id, { ...input, version: record.version });
        setFeedback({
          tone: input.status === "APPROVED" ? "success" : "warning",
          message: `${record.employeeName}: đơn ngày ${record.workDate} đã ${
            input.status === "APPROVED" ? "được duyệt" : "bị từ chối"
          }.`,
          hint:
            input.status === "REJECTED"
              ? "Lý do từ chối đã được gửi cho nhân sự."
              : undefined,
        });
        reload();
        return true;
      } catch (caught) {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[record.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message: reason(caught, "Chưa xử lý được đơn giải trình."),
          hint: `Trạng thái đã trở về “${STATUS_LABEL[before]}”. Tải lại để thấy bản mới nhất.`,
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [reload],
  );

  const cancel = useCallback(
    async (record: Explanation) => {
      const before = record.status;
      setOptimistic((current) => ({ ...current, [record.id]: "CANCELLED" }));
      setSavingId(record.id);
      try {
        await cancelExplanation(record.id, record.version);
        setFeedback({
          tone: "info",
          message: `Đã huỷ đơn giải trình ngày ${record.workDate}.`,
          hint: "Đơn đã huỷ không còn chờ duyệt; gửi lại đơn mới nếu vẫn cần điều chỉnh.",
        });
        reload();
        return true;
      } catch (caught) {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[record.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message: reason(caught, "Chưa huỷ được đơn giải trình."),
          hint: `Trạng thái đã trở về “${STATUS_LABEL[before]}”.`,
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status || query.type || query.from || query.to);

  const result = useMemo(
    () => ({
      data,
      totals,
      loading,
      error,
      permission,
      me,
      scope,
      optimistic,
      savingId,
      feedback,
      filtersActive,
    }),
    [
      data,
      totals,
      loading,
      error,
      permission,
      me,
      scope,
      optimistic,
      savingId,
      feedback,
      filtersActive,
    ],
  );

  return {
    ...result,
    query,
    term,
    setScope,
    patchQuery,
    clearFilters,
    reload,
    can,
    submit,
    patch,
    decide,
    cancel,
    setFeedback,
  };
}
