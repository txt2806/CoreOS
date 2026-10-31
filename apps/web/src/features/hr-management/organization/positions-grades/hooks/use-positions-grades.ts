"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  gradeTotal,
  listGrades,
  listPositions,
  permissionsMe,
  positionTotal,
  snapshotOf,
  updateGrade,
  updatePosition,
  type GradeListQuery,
  type PositionListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  Grade,
  OrgStatus,
  PageResult,
  PermissionSnapshot,
  Position,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

export interface GradeTotals {
  positions: number;
  activePositions: number;
  grades: number;
  activeGrades: number;
}

/** `shared` shows the grades that carry no `positionId`. */
export type GradeScope = "position" | "shared";

const EMPTY_POSITIONS: PageResult<Position> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const EMPTY_GRADES: PageResult<Grade> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the job-title list and the grade list of the selected title. Only status
 * flips are optimistic; the two lists themselves always come from the server.
 */
export function usePositionsGrades() {
  const [positionQuery, setPositionQuery] = useState<PositionListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [positionTerm, setPositionTerm] = useState("");
  const [positions, setPositions] = useState<PageResult<Position>>(EMPTY_POSITIONS);
  const [positionLoading, setPositionLoading] = useState(true);
  const [positionError, setPositionError] = useState<ApiError | null>(null);

  const [gradeQuery, setGradeQuery] = useState<GradeListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
  });
  const [grades, setGrades] = useState<PageResult<Grade>>(EMPTY_GRADES);
  const [gradeLoading, setGradeLoading] = useState(true);
  const [gradeError, setGradeError] = useState<ApiError | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scope, setScope] = useState<GradeScope>("position");
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [totals, setTotals] = useState<GradeTotals | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, OrgStatus>>({});
  const [tick, setTick] = useState(0);

  const positionRequestId = useRef(0);
  const gradeRequestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPositionTerm(positionQuery.q ?? "");
      setPositionQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [positionQuery.q]);

  useEffect(() => {
    const id = ++positionRequestId.current;
    setPositionLoading(true);
    setPositionError(null);
    listPositions({ ...positionQuery, q: positionTerm })
      .then((result) => {
        if (id !== positionRequestId.current) return;
        setPositions(result);
      })
      .catch((caught: unknown) => {
        if (id !== positionRequestId.current) return;
        setPositionError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách chức danh."),
        );
      })
      .finally(() => {
        if (id === positionRequestId.current) setPositionLoading(false);
      });
  }, [positionQuery, positionTerm, tick]);

  /* A shared grade has no positionId, and the API cannot filter "is null", so the
     shared scope reads a full page and keeps the untied rows. */
  useEffect(() => {
    const id = ++gradeRequestId.current;
    setGradeLoading(true);
    setGradeError(null);
    const effective: GradeListQuery =
      scope === "position" && selectedId
        ? { ...gradeQuery, positionId: selectedId }
        : { ...gradeQuery, positionId: undefined };
    listGrades(effective)
      .then((result) => {
        if (id !== gradeRequestId.current) return;
        setGrades(result);
      })
      .catch((caught: unknown) => {
        if (id !== gradeRequestId.current) return;
        setGradeError(
          caught instanceof ApiError ? caught : new ApiError(0, "Không tải được danh sách cấp bậc."),
        );
      })
      .finally(() => {
        if (id === gradeRequestId.current) setGradeLoading(false);
      });
  }, [gradeQuery, selectedId, scope, tick]);

  useEffect(() => {
    if (positions.items.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillThere = positions.items.some((row) => row.id === selectedId);
    if (!stillThere) {
      const first = positions.items[0];
      if (first) setSelectedId(first.id);
    }
  }, [positions.items, selectedId]);

  /* Moving to another title resets the grade page, not the scope. */
  useEffect(() => {
    setGradeQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
  }, [selectedId]);

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
    Promise.all([positionTotal(), positionTotal("ACTIVE"), gradeTotal(), gradeTotal("ACTIVE")])
      .then(([positionCount, activePositionCount, gradeCount, activeGradeCount]) => {
        if (cancelled) return;
        setTotals({
          positions: positionCount,
          activePositions: activePositionCount,
          grades: gradeCount,
          activeGrades: activeGradeCount,
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

  const patchPositionQuery = useCallback((patch: Partial<PositionListQuery>) => {
    setPositionQuery((current) => ({ ...current, ...patch }));
  }, []);

  const patchGradeQuery = useCallback((patch: Partial<GradeListQuery>) => {
    setGradeQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setPositionQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setScope("position");
  }, []);

  const statusOf = useCallback(
    <T extends { id: string; status: OrgStatus }>(row: T): OrgStatus =>
      optimistic[row.id] ?? row.status,
    [optimistic],
  );

  const flipPosition = useCallback(
    async (row: Position) => {
      const next: OrgStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      setPendingId(row.id);
      setOptimistic((current) => ({ ...current, [row.id]: next }));
      try {
        await updatePosition(row.id, { status: next, version: row.version });
        setFeedback({
          tone: "success",
          message:
            next === "ACTIVE"
              ? `Đã áp dụng chức danh ${row.name}.`
              : `Đã ngừng áp dụng chức danh ${row.name}.`,
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
          message: caught instanceof Error ? caught.message : "Chưa đổi được trạng thái chức danh.",
          hint: "Trạng thái đã trở về như trước. Tải lại để xem dữ liệu mới nhất.",
        });
      } finally {
        setPendingId(null);
      }
    },
    [reload],
  );

  const flipGrade = useCallback(
    async (row: Grade) => {
      const next: OrgStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      setPendingId(row.id);
      setOptimistic((current) => ({ ...current, [row.id]: next }));
      try {
        await updateGrade(row.id, { status: next, version: row.version });
        setFeedback({
          tone: "success",
          message:
            next === "ACTIVE"
              ? `Đã áp dụng cấp bậc ${row.name}.`
              : `Đã ngừng áp dụng cấp bậc ${row.name}.`,
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
          message: caught instanceof Error ? caught.message : "Chưa đổi được trạng thái cấp bậc.",
          hint: "Trạng thái đã trở về như trước. Tải lại để xem dữ liệu mới nhất.",
        });
      } finally {
        setPendingId(null);
      }
    },
    [reload],
  );

  const selected = useMemo(
    () => positions.items.find((row) => row.id === selectedId) ?? null,
    [positions.items, selectedId],
  );

  /** The shared scope is filtered here because the API has no "positionId is null". */
  const visibleGrades = useMemo(
    () => (scope === "shared" ? grades.items.filter((row) => !row.positionId) : grades.items),
    [grades.items, scope],
  );

  /** Ranks ascend inside a title, so the ladder reads top-down. */
  const orderedGrades = useMemo(
    () => [...visibleGrades].sort((left, right) => left.rank - right.rank),
    [visibleGrades],
  );

  const filtersActive = Boolean(positionTerm || positionQuery.status);

  return {
    positions,
    positionLoading,
    positionError,
    positionQuery,
    positionTerm,
    grades,
    gradeLoading,
    gradeError,
    gradeQuery,
    orderedGrades,
    scope,
    setScope,
    selectedId,
    selected,
    permission,
    totals,
    feedback,
    pendingId,
    optimistic,
    filtersActive,
    can,
    select,
    statusOf,
    patchPositionQuery,
    patchGradeQuery,
    clearFilters,
    reload,
    flipPosition,
    flipGrade,
    setFeedback,
  };
}
