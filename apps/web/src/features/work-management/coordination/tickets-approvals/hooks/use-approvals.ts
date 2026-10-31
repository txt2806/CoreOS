"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  decide,
  listInbox,
  permissionsMe,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type { InboxEntry, InboxPage, PermissionSnapshot } from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: InboxPage = { items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE };

/**
 * Owns the approval queue. A decision removes its row optimistically and puts
 * it back with a human message when the server refuses — the queue never
 * silently refetches under the user's cursor.
 */
export function useApprovals() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<InboxPage>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [chainTick, setChainTick] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listInbox(page, pageSize)
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được hàng đợi phê duyệt."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [page, pageSize, chainTick]);

  /* The reload after a decision carries the real queue; drop the optimism. */
  useEffect(() => setRemoved([]), [data]);

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
  }, [chainTick]);

  const reload = useCallback(() => setChainTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const items = useMemo(
    () => data.items.filter((entry) => !removed.includes(entry.request.id)),
    [data.items, removed],
  );

  const submit = useCallback(
    async (entry: InboxEntry, decision: "APPROVE" | "REJECT", note: string) => {
      setPending(entry.request.id);
      setRemoved((current) => [...current, entry.request.id]);
      try {
        await decide(entry.request.id, {
          decision,
          note,
          version: entry.request.version,
        });
        setFeedback({
          tone: "success",
          message:
            decision === "APPROVE"
              ? `Đã duyệt ${entry.request.code} tại bước “${entry.step.name}”.`
              : `Đã từ chối ${entry.request.code} kèm lý do.`,
          hint:
            decision === "APPROVE"
              ? "Đề xuất rời hàng đợi của bạn; bước kế tiếp (nếu có) đã được thông báo."
              : "Người gửi nhận được lý do từ chối trong thông báo.",
        });
        reload();
        return true;
      } catch (caught) {
        setRemoved((current) => current.filter((id) => id !== entry.request.id));
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa ghi được quyết định.",
          hint: "Đề xuất vẫn nằm trong hàng đợi. Tải lại để xem trạng thái mới nhất.",
        });
        return false;
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  return {
    data,
    items,
    loading,
    error,
    permission,
    feedback,
    pending,
    page,
    pageSize,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    reload,
    can,
    submit,
    setFeedback,
  };
}
