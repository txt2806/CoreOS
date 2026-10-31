"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createRule as createApi,
  deleteRule as deleteApi,
  listRules,
  toggleRule as toggleApi,
  updateRule as updateApi,
} from "../api/client";
import { DEFAULT_PAGE_SIZE } from "../constants";
import type { Rule, RuleInput, RuleList, RulePatch, Trigger } from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

export type EnabledFilter = "all" | "enabled" | "disabled";

/** `order` is the server's execution order and stays the default. */
export type RuleSort = "order" | "name" | "lastRun";

/** Diacritic-insensitive so "chuyen" also finds "Chuyển". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const byOrder = (left: Rule, right: Rule) =>
  left.position - right.position || left.createdAt.localeCompare(right.createdAt);

export function useRules() {
  const [data, setData] = useState<RuleList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [q, setQ] = useState("");
  const [trigger, setTrigger] = useState<Trigger | "">("");
  const [statusFilter, setStatusFilter] = useState<EnabledFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<RuleSort>("order");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRules()
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof ApiError
              ? caught
              : new ApiError(0, "Không tải được danh sách quy tắc tự động."),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const items = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const needle = normalize(q.trim());
    return items.filter((rule) => {
      if (trigger && rule.trigger !== trigger) return false;
      if (statusFilter === "enabled" && !rule.enabled) return false;
      if (statusFilter === "disabled" && rule.enabled) return false;
      if (!needle) return true;
      return normalize(rule.name).includes(needle) || normalize(rule.description).includes(needle);
    });
  }, [items, q, statusFilter, trigger]);

  const ordered = useMemo(() => {
    if (sort === "order") return filtered;
    const copy = [...filtered];
    if (sort === "name") return copy.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    return copy.sort((a, b) => (b.lastRunAt ?? "").localeCompare(a.lastRunAt ?? ""));
  }, [filtered, sort]);

  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = useMemo(
    () => ordered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [ordered, safePage, pageSize],
  );

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const replace = useCallback((saved: Rule) => {
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items
              .map((item) => (item.id === saved.id ? saved : item))
              .sort(byOrder),
          }
        : current,
    );
  }, []);

  /**
   * Optimistic with rollback: the switch flips immediately, and if the server
   * disagrees (409 after someone else edited, 403 after a grant was removed) the
   * row snaps back and says why instead of refetching behind the operator's back.
   */
  const toggle = useCallback(
    async (rule: Rule) => {
      const next = !rule.enabled;
      setPendingId(rule.id);
      setFeedback(null);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === rule.id ? { ...item, enabled: next } : item,
              ),
            }
          : current,
      );

      try {
        const saved = await toggleApi(rule.id, { enabled: next, version: rule.version });
        replace(saved);
        setFeedback({
          tone: "success",
          message: next ? `Đã bật “${saved.name}”.` : `Đã tắt “${saved.name}”.`,
          hint: next
            ? "Quy tắc chạy ở sự kiện công việc kế tiếp."
            : "Sự kiện đang xử lý vẫn chạy nốt; các lần sau thì không.",
        });
      } catch (caught) {
        setData((current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === rule.id ? { ...item, enabled: rule.enabled } : item,
                ),
              }
            : current,
        );
        setFeedback({
          tone: "error",
          message:
            caught instanceof ApiError
              ? caught.message
              : "Chưa đổi được trạng thái quy tắc. Đã trả lại như cũ.",
          hint:
            caught instanceof ApiError && caught.status === 409
              ? "Quy tắc đã đổi ở nơi khác. Tải lại để lấy bản mới nhất."
              : undefined,
        });
      } finally {
        setPendingId(null);
      }
    },
    [replace],
  );

  const create = useCallback(
    async (input: RuleInput) => {
      const saved = await createApi(input);
      setData((current) =>
        current
          ? { ...current, items: [...current.items, saved].sort(byOrder) }
          : { items: [saved], applied: 0, skipped: 0 },
      );
      setFeedback({
        tone: "success",
        message: `Đã tạo quy tắc “${saved.name}”.`,
        hint: saved.enabled
          ? "Quy tắc đang bật và sẽ chạy ở sự kiện kế tiếp."
          : "Quy tắc đang tắt; bật khi đã sẵn sàng.",
      });
      return saved;
    },
    [],
  );

  const update = useCallback(
    async (id: string, patch: RulePatch) => {
      const saved = await updateApi(id, patch);
      replace(saved);
      setFeedback({
        tone: "success",
        message: `Đã lưu thay đổi cho “${saved.name}”.`,
        hint: "Phiên bản đã tăng, người khác đang mở bản cũ sẽ bị máy chủ từ chối khi lưu.",
      });
      return saved;
    },
    [replace],
  );

  const remove = useCallback(async (rule: Rule) => {
    await deleteApi(rule.id, rule.version);
    setData((current) =>
      current ? { ...current, items: current.items.filter((item) => item.id !== rule.id) } : current,
    );
    setFeedback({
      tone: "success",
      message: `Đã xoá quy tắc “${rule.name}”.`,
      hint: "Các lượt chạy đã ghi vẫn còn trong nhật ký để đối chiếu.",
    });
  }, []);

  const enabledCount = items.filter((rule) => rule.enabled).length;
  const filtersActive = Boolean(q.trim() || trigger || statusFilter !== "all");

  return {
    data,
    loading,
    error,
    q,
    setQ: (value: string) => {
      setQ(value);
      setPage(1);
    },
    trigger,
    setTrigger: (value: Trigger | "") => {
      setTrigger(value);
      setPage(1);
    },
    statusFilter,
    setStatusFilter: (value: EnabledFilter) => {
      setStatusFilter(value);
      setPage(1);
    },
    page: safePage,
    pageSize,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    sort,
    setSort: (value: RuleSort) => {
      setSort(value);
      setPage(1);
    },
    total: ordered.length,
    visible,
    loadingTotal: items.length,
    enabledCount,
    disabledCount: items.length - enabledCount,
    applied: data?.applied ?? 0,
    skipped: data?.skipped ?? 0,
    pendingId,
    feedback,
    setFeedback,
    filtersActive,
    clearFilters: () => {
      setQ("");
      setTrigger("");
      setStatusFilter("all");
      setPage(1);
    },
    toggle,
    create,
    update,
    remove,
    reload,
  };
}
