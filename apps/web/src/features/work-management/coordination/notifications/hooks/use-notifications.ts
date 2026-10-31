"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  listNotifications,
  markAllRead,
  markRead,
  removeNotification,
  session,
  streamUrl,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, POLL_INTERVAL_MS } from "../constants";
import type { NotificationItem, NotificationPage } from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: NotificationPage = {
  items: [],
  total: 0,
  unread: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * The list is addressed per recipient, so the screen first resolves
 * `GET /auth/session` and uses `actor.employeeId` — the same string other features
 * put in `recipients` when they emit a notification.
 *
 * Live updates come from the SSE stream the controller exposes; when the stream
 * cannot be opened the hook falls back to a slow poll.
 */
export function useNotifications() {
  const [recipient, setRecipient] = useState<string | null>(null);
  const [sessionProblem, setSessionProblem] = useState<ApiError | null>(null);
  const [query, setQuery] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, unread: false });
  const [data, setData] = useState<NotificationPage>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [readMark, setReadMark] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    session()
      .then((body) => {
        if (!cancelled) {
          setRecipient(body.actor.employeeId);
          setSessionProblem(null);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setSessionProblem(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không xác định được người nhận thông báo."),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    if (!recipient) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listNotifications({ ...query, recipient })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách thông báo."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [recipient, query, tick]);

  /* The reload after a write carries the real rows; drop the guesses. */
  useEffect(() => {
    setReadMark({});
    setRemoved([]);
  }, [data]);

  const pull = useCallback(() => {
    if (!recipient) return;
    listNotifications({ ...query, recipient })
      .then((result) => setData(result))
      .catch(() => {
        /* A failed live refresh keeps the last good page on screen. */
      });
  }, [recipient, query]);

  useEffect(() => {
    if (!recipient) return;
    let timer: number | null = null;
    const startPolling = () => {
      if (timer !== null) return;
      timer = window.setInterval(pull, POLL_INTERVAL_MS);
    };

    let source: EventSource | null = null;
    if (typeof EventSource !== "undefined") {
      source = new EventSource(streamUrl(recipient));
      source.addEventListener("open", () => {
        setLive(true);
        if (timer !== null) {
          window.clearInterval(timer);
          timer = null;
        }
      });
      source.addEventListener("notification", pull);
      source.addEventListener("notification_deleted", pull);
      source.addEventListener("error", () => {
        /* The browser retries on its own; polling keeps the count moving meanwhile. */
        setLive(false);
        startPolling();
      });
    } else {
      startPolling();
    }

    return () => {
      source?.close();
      if (timer !== null) window.clearInterval(timer);
    };
  }, [recipient, pull]);

  const readOf = useCallback(
    (item: NotificationItem) => readMark[item.id] ?? item.readAt,
    [readMark],
  );

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const patchQuery = useCallback((patch: Partial<typeof query>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, unread: false, page: 1 }));
  }, []);

  const markReadItem = useCallback(
    async (item: NotificationItem) => {
      if (readOf(item)) return;
      setPending(item.id);
      setReadMark((current) => ({ ...current, [item.id]: new Date().toISOString() }));
      try {
        await markRead(item.id);
        setFeedback({ tone: "success", message: `Đã đánh dấu đã đọc: ${item.title}` });
        reload();
      } catch (caught) {
        setReadMark((current) => {
          const copy = { ...current };
          delete copy[item.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa đánh dấu đọc được.",
          hint: "Thông báo vẫn được tính là chưa đọc.",
        });
      } finally {
        setPending(null);
      }
    },
    [readOf, reload],
  );

  const markAll = useCallback(async () => {
    if (!recipient) return;
    const unreadIds = data.items.filter((item) => !readOf(item)).map((item) => item.id);
    const stamp = new Date().toISOString();
    setPending("all");
    setReadMark((current) => {
      const next = { ...current };
      for (const id of unreadIds) next[id] = stamp;
      return next;
    });
    try {
      const result = await markAllRead(recipient);
      setFeedback({
        tone: result.updated > 0 ? "success" : "info",
        message:
          result.updated > 0
            ? `Đã đánh dấu ${result.updated.toLocaleString("vi-VN")} thông báo là đã đọc.`
            : "Không còn thông báo chưa đọc nào.",
      });
      reload();
    } catch (caught) {
      setReadMark((current) => {
        const next = { ...current };
        for (const id of unreadIds) delete next[id];
        return next;
      });
      setFeedback({
        tone: "error",
        message: caught instanceof Error ? caught.message : "Chưa đánh dấu đọc được.",
        hint: "Danh sách giữ nguyên trạng thái trước đó.",
      });
    } finally {
      setPending(null);
    }
  }, [data.items, readOf, recipient, reload]);

  const remove = useCallback(
    async (item: NotificationItem) => {
      setPending(item.id);
      setRemoved((current) => [...current, item.id]);
      try {
        await removeNotification(item.id);
        setFeedback({
          tone: "success",
          message: "Đã xoá thông báo khỏi danh sách của bạn.",
          hint: "Máy chủ giữ bản ghi để đối soát, giao diện không hiển thị lại.",
        });
        reload();
      } catch (caught) {
        setRemoved((current) => current.filter((id) => id !== item.id));
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa xoá được thông báo.",
          hint: "Thông báo vẫn còn trong danh sách.",
        });
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  const rows = useMemo(() => {
    const gone = new Set(removed);
    return data.items
      .filter((item) => !gone.has(item.id))
      .filter((item) => !(query.unread && readOf(item)))
      .map((item) => {
        const stamp = readMark[item.id];
        return stamp ? { ...item, readAt: stamp } : item;
      });
  }, [data.items, query.unread, readMark, readOf, removed]);

  /* Optimistic reads reduce the server count until the next reload confirms it. */
  const readAhead = data.items.filter(
    (item) => !item.readAt && Boolean(readMark[item.id]) && !removed.includes(item.id),
  ).length;
  const unreadTotal = Math.max(0, data.unread - readAhead);
  const unreadOnPage = rows.filter((item) => !item.readAt).length;

  return {
    data,
    rows,
    loading,
    error: error ?? sessionProblem,
    sessionProblem,
    feedback,
    pending,
    live,
    query,
    readOf,
    unreadTotal,
    unreadOnPage,
    patchQuery,
    clearFilters,
    reload,
    markReadItem,
    markAll,
    remove,
    setFeedback,
  };
}
