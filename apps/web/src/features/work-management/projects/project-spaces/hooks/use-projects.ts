"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  createProject,
  deleteProject,
  listProjects,
  permissionsMe,
  projectTotal,
  updateProject,
  type ProjectListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type { PageResult, PermissionSnapshot, Project, ProjectInput } from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<Project> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the project list, its filters and the permission snapshot. Mutations
 * resolve to the server answer; nothing is assumed to have succeeded.
 */
export function useProjects() {
  const [query, setQuery] = useState<ProjectListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Project>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
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
    listProjects({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách dự án."),
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      projectTotal("Lên kế hoạch"),
      projectTotal("Đang triển khai"),
      projectTotal("Tạm dừng"),
      projectTotal("Hoàn thành"),
    ])
      .then(([planned, running, paused, done]) => {
        if (cancelled) return;
        setTotals({
          "Lên kế hoạch": planned,
          "Đang triển khai": running,
          "Tạm dừng": paused,
          "Hoàn thành": done,
        });
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

  const patchQuery = useCallback((patch: Partial<ProjectListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: ProjectInput) => {
      const created = await createProject(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo dự án ${created.code}.`,
        hint: `Trạng thái ban đầu là “${created.status}”. Mở chi tiết để thêm sprint.`,
      });
      reload();
      return created;
    },
    [reload],
  );

  const patch = useCallback(
    async (id: string, input: Partial<ProjectInput> & { version: number }) => {
      const updated = await updateProject(id, input);
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
    async (project: Project) => {
      await deleteProject(project.id, project.version);
      setFeedback({
        tone: "success",
        message: `Đã xoá dự án ${project.code}.`,
        hint: "Sprint và backlog của dự án không còn hiển thị trong danh sách.",
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
    patchQuery,
    clearFilters,
    reload,
    can,
    create,
    patch,
    remove,
    setFeedback,
  };
}
