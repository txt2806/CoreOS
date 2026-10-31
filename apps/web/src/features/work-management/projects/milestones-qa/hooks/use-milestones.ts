"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  createMilestone,
  listMilestones,
  permissionsMe,
  updateMilestone,
  type MilestoneListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  Milestone,
  MilestoneInput,
  PageResult,
  PermissionSnapshot,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<Milestone> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the milestone list, its filters and the permission snapshot. Mutations
 * resolve to the server answer; nothing is assumed to have succeeded.
 */
export function useMilestones() {
  const [query, setQuery] = useState<MilestoneListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Milestone>>(EMPTY);
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
    listMilestones({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách mốc."),
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

  const patchQuery = useCallback((patch: Partial<MilestoneListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: MilestoneInput) => {
      const created = await createMilestone(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo mốc “${created.name}”.`,
        hint: "Mở chi tiết để gắn công việc và thêm tiêu chí kiểm tra.",
      });
      reload();
      return created;
    },
    [reload],
  );

  const patch = useCallback(
    async (id: string, input: Partial<MilestoneInput> & { version: number }) => {
      const updated = await updateMilestone(id, input);
      setFeedback({
        tone: "success",
        message: `Đã lưu thay đổi cho mốc “${updated.name}”.`,
      });
      reload();
      return updated;
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status);

  const result = useMemo(
    () => ({ data, loading, error, permission, feedback, filtersActive }),
    [data, loading, error, permission, feedback, filtersActive],
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
    patch,
    setFeedback,
  };
}
