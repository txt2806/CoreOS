"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  createPresence,
  listPresence,
  permissionsMe,
  presenceSummary,
  session,
  updatePresence,
  type PresenceListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY, STATUS_LABEL } from "../constants";
import { todayIso } from "../format";
import type {
  PageResult,
  PermissionSnapshot,
  Presence,
  PresenceInput,
  PresenceStatus,
  PresenceSummary,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<Presence> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

function reason(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

/**
 * The board is one date at a time. Status edits are applied optimistically and
 * rolled back on refusal so a card never sits under the wrong column.
 */
export function useWorkforceBoard() {
  const [workDate, setWorkDate] = useState(todayIso());
  const [query, setQuery] = useState<PresenceListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
    workDate: todayIso(),
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Presence>>(EMPTY);
  const [summary, setSummary] = useState<PresenceSummary | null>(null);
  const [summaryIssue, setSummaryIssue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, PresenceStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.q ?? ""), 350);
    return () => window.clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    setQuery((current) => ({ ...current, workDate, page: 1 }));
  }, [workDate]);

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
        /* Without the session the “me” shortcut stays hidden; declaring for anyone still works. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listPresence({ ...query, q: term })
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được bảng hiện diện."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, tick]);

  useEffect(() => {
    let cancelled = false;
    presenceSummary(workDate)
      .then((result) => {
        if (cancelled) return;
        setSummary(result);
        setSummaryIssue(null);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setSummaryIssue(reason(caught, "Không tải được số liệu tổng hợp."));
      });
    return () => {
      cancelled = true;
    };
  }, [workDate, tick]);

  /* The reload that follows an edit carries the real status; drop the guess. */
  useEffect(() => setOptimistic({}), [data]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const patchQuery = useCallback((patch: Partial<PresenceListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const changeStatus = useCallback(
    async (presence: Presence, status: PresenceStatus) => {
      if (presence.status === status) return false;
      setOptimistic((current) => ({ ...current, [presence.id]: status }));
      setSavingId(presence.id);
      try {
        await updatePresence(presence.id, { status, version: presence.version });
        setFeedback({
          tone: "success",
          message: `${presence.employeeName} đã chuyển sang “${STATUS_LABEL[status]}”.`,
        });
        reload();
        return true;
      } catch (caught) {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[presence.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message: reason(caught, "Chưa đổi được trạng thái hiện diện."),
          hint: "Trạng thái đã trở về giá trị trước đó. Tải lại để thấy bản mới nhất.",
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [reload],
  );

  const declare = useCallback(
    async (input: PresenceInput) => {
      const created = await createPresence(input);
      setFeedback({
        tone: "success",
        message: `Đã khai báo trạng thái cho ${created.employeeName} ngày ${created.workDate}.`,
      });
      reload();
      return created;
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status);

  const result = useMemo(
    () => ({
      workDate,
      data,
      summary,
      summaryIssue,
      loading,
      error,
      permission,
      me,
      optimistic,
      savingId,
      feedback,
      filtersActive,
    }),
    [
      workDate,
      data,
      summary,
      summaryIssue,
      loading,
      error,
      permission,
      me,
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
    setWorkDate,
    patchQuery,
    clearFilters,
    reload,
    can,
    changeStatus,
    declare,
    setFeedback,
  };
}
