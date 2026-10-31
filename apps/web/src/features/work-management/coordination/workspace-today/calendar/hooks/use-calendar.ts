"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  createEvent,
  deleteEvent,
  eventTotal,
  listEvents,
  permissionsMe,
  updateEvent,
  type EventListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  CalendarEvent,
  EventInput,
  EventStatus,
  PageResult,
  PermissionSnapshot,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<CalendarEvent> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the event list, the filters and the permission snapshot. Status changes
 * are applied optimistically and rolled back from the server answer.
 */
export function useCalendar() {
  const [query, setQuery] = useState<EventListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<CalendarEvent>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [totals, setTotals] = useState<Partial<Record<EventStatus, number>>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, EventStatus>>({});
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
    listEvents({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được lịch làm việc."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, tick]);

  /* The reload that follows a change carries the real status; drop the guess. */
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
      (["Đã lên lịch", "Đang diễn ra", "Hoàn thành", "Đã hủy"] as EventStatus[]).map(
        (status) => eventTotal(status).then((total) => [status, total] as const),
      ),
    )
      .then((pairs) => {
        if (cancelled) return;
        setTotals(Object.fromEntries(pairs) as Partial<Record<EventStatus, number>>);
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

  const patchQuery = useCallback((patch: Partial<EventListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: EventInput) => {
      const created = await createEvent(input);
      setFeedback({
        tone: "success",
        message: `Đã thêm sự kiện ${created.code} vào ${created.date}.`,
      });
      reload();
      return created;
    },
    [reload],
  );

  const changeStatus = useCallback(
    async (event: CalendarEvent, status: EventStatus) => {
      setPending(event.id);
      setOptimistic((current) => ({ ...current, [event.id]: status }));
      try {
        await updateEvent(event.id, { status, version: event.version });
        setFeedback({ tone: "success", message: `${event.code} đã chuyển sang “${status}”.` });
        reload();
      } catch (caught) {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[event.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa đổi được trạng thái.",
          hint: "Sự kiện đã trở về trạng thái trước đó.",
        });
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (event: CalendarEvent) => {
      await deleteEvent(event.id, event.version);
      setFeedback({
        tone: "success",
        message: `Đã xoá sự kiện ${event.code}.`,
        hint: "Sự kiện không còn xuất hiện trong lưới tháng.",
      });
      reload();
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status);

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
