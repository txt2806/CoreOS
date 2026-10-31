"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  createTask,
  deleteTask,
  listTasks,
  permissionsMe,
  taskTotal,
  updateTask,
  type TaskListQuery,
} from "../api/client";
import { COMMENTS_KEY, DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type { PageResult, PermissionSnapshot, Task, TaskInput } from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<Task> = { items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE };

/**
 * Owns the list, the filter state and the permission snapshot for the tasks
 * screen. Mutations resolve to the server answer; nothing is optimistically
 * assumed to have succeeded.
 */
export function useTasks() {
  const [query, setQuery] = useState<TaskListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Task>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [canComment, setCanComment] = useState(false);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  /* Typing must not fire a request per keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(query.q ?? "");
      setQuery((current) =>
        current.page === 1 ? current : { ...current, page: 1 },
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listTasks({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách công việc."),
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
        setCanComment(actionsOf(body, COMMENTS_KEY).includes("view"));
      })
      .catch(() => {
        if (!cancelled) {
          setPermission({ role: "EMPLOYEE", isSystemAdmin: false, actions: [] });
          setCanComment(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      taskTotal("Cần làm"),
      taskTotal("Đang làm"),
      taskTotal("Chờ kiểm tra"),
      taskTotal("Hoàn thành"),
    ])
      .then(([todo, doing, review, done]) => {
        if (cancelled) return;
        setTotals({ todo, doing, review, done });
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

  const patchQuery = useCallback((patch: Partial<TaskListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: TaskInput) => {
      const created = await createTask(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo công việc ${created.code}.`,
        hint: `Trạng thái ban đầu là “${created.status}”. Trạng thái chỉ đổi qua luồng công việc.`,
      });
      reload();
      return created;
    },
    [reload],
  );

  const patch = useCallback(
    async (id: string, input: Partial<TaskInput> & { version: number }) => {
      const updated = await updateTask(id, input);
      setFeedback({
        tone: "success",
        message: `Đã lưu thay đổi cho ${updated.code}.`,
      });
      reload();
      return updated;
    },
    [reload],
  );

  const remove = useCallback(
    async (task: Task) => {
      await deleteTask(task.id, task.version);
      setFeedback({
        tone: "success",
        message: `Đã xoá ${task.code}.`,
        hint: "Bản ghi đã được gỡ khỏi danh sách làm việc.",
      });
      reload();
    },
    [reload],
  );

  const bulkRemove = useCallback(
    async (tasks: Task[]) => {
      const failed: string[] = [];
      for (const task of tasks) {
        try {
          await deleteTask(task.id, task.version);
        } catch {
          failed.push(task.code);
        }
      }
      const done = tasks.length - failed.length;
      setFeedback(
        failed.length === 0
          ? {
              tone: "success",
              message: `Đã xoá ${done} công việc đã chọn.`,
            }
          : {
              tone: "warning",
              message: `Đã xoá ${done}/${tasks.length} công việc.`,
              hint: `Chưa xoá được: ${failed.join(", ")}. Tải lại rồi thử tiếp.`,
            },
      );
      reload();
      return failed;
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status);

  const result = useMemo(
    () => ({
      data,
      loading,
      error,
      permission,
      canComment,
      totals,
      feedback,
      filtersActive,
    }),
    [data, loading, error, permission, canComment, totals, feedback, filtersActive],
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
    remove,
    bulkRemove,
    setFeedback,
  };
}
