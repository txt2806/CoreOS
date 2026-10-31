"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  departmentTotal,
  listDepartments,
  listTeams,
  permissionsMe,
  snapshotOf,
  teamTotal,
  updateDepartment,
  updateTeam,
  type OrgListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import type {
  Department,
  OrgStatus,
  PageResult,
  PermissionSnapshot,
  Team,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY_DEPARTMENTS: PageResult<Department> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const EMPTY_TEAMS: PageResult<Team> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

export interface OrgTotals {
  departments: number;
  activeDepartments: number;
  teams: number;
  activeTeams: number;
}

/**
 * Owns both panes of the organization screen: the department master list and the
 * team list of the selected department. Only status flips are optimistic — they
 * are the two calls a manager repeats most and both roll back on refusal.
 */
export function useOrgStructure() {
  const [deptQuery, setDeptQuery] = useState<OrgListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [deptTerm, setDeptTerm] = useState("");
  const [departments, setDepartments] = useState<PageResult<Department>>(EMPTY_DEPARTMENTS);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptError, setDeptError] = useState<ApiError | null>(null);

  const [teamQuery, setTeamQuery] = useState<OrgListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [teams, setTeams] = useState<PageResult<Team>>(EMPTY_TEAMS);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<ApiError | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [totals, setTotals] = useState<OrgTotals | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  /** Optimistic status overrides for departments and teams, keyed by id. */
  const [optimistic, setOptimistic] = useState<Record<string, OrgStatus>>({});
  const [tick, setTick] = useState(0);

  const deptRequestId = useRef(0);
  const teamRequestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDeptTerm(deptQuery.q ?? "");
      setDeptQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [deptQuery.q]);

  useEffect(() => {
    const id = ++deptRequestId.current;
    setDeptLoading(true);
    setDeptError(null);
    listDepartments({ ...deptQuery, q: deptTerm })
      .then((result) => {
        if (id !== deptRequestId.current) return;
        setDepartments(result);
      })
      .catch((caught: unknown) => {
        if (id !== deptRequestId.current) return;
        setDeptError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách phòng ban."),
        );
      })
      .finally(() => {
        if (id === deptRequestId.current) setDeptLoading(false);
      });
  }, [deptQuery, deptTerm, tick]);

  useEffect(() => {
    const id = ++teamRequestId.current;
    setTeamLoading(true);
    setTeamError(null);
    listTeams(teamQuery)
      .then((result) => {
        if (id !== teamRequestId.current) return;
        setTeams(result);
      })
      .catch((caught: unknown) => {
        if (id !== teamRequestId.current) return;
        setTeamError(
          caught instanceof ApiError ? caught : new ApiError(0, "Không tải được danh sách nhóm."),
        );
      })
      .finally(() => {
        if (id === teamRequestId.current) setTeamLoading(false);
      });
  }, [teamQuery, tick]);

  /* Keep a department selected so the detail pane is never blank for no reason. */
  useEffect(() => {
    if (departments.items.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillThere = departments.items.some((row) => row.id === selectedId);
    if (!stillThere) {
      const first = departments.items[0];
      if (first) setSelectedId(first.id);
    }
  }, [departments.items, selectedId]);

  useEffect(() => {
    setTeamQuery((current) =>
      current.departmentId === (selectedId ?? undefined) && current.page === 1
        ? current
        : { ...current, departmentId: selectedId ?? undefined, page: 1 },
    );
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
    Promise.all([
      departmentTotal(),
      departmentTotal("ACTIVE"),
      teamTotal(),
      teamTotal("ACTIVE"),
    ])
      .then(([deptCount, activeDeptCount, teamCount, activeTeamCount]) => {
        if (cancelled) return;
        setTotals({
          departments: deptCount,
          activeDepartments: activeDeptCount,
          teams: teamCount,
          activeTeams: activeTeamCount,
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

  const patchDeptQuery = useCallback((patch: Partial<OrgListQuery>) => {
    setDeptQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setDeptQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const statusOf = useCallback(
    <T extends { id: string; status: OrgStatus }>(row: T): OrgStatus =>
      optimistic[row.id] ?? row.status,
    [optimistic],
  );

  const flipDepartment = useCallback(
    async (row: Department) => {
      const next: OrgStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      setPendingId(row.id);
      setOptimistic((current) => ({ ...current, [row.id]: next }));
      try {
        await updateDepartment(row.id, { status: next, version: row.version });
        setFeedback({
          tone: "success",
          message:
            next === "ACTIVE"
              ? `Đã kích hoạt phòng ban ${row.name}.`
              : `Đã ngừng hoạt động phòng ban ${row.name}.`,
          hint:
            next === "ACTIVE"
              ? "Phòng ban đã có thể nhận nhóm và nhân sự."
              : "Nhóm và nhân sự thuộc phòng ban cần được xử lý riêng.",
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
          message:
            caught instanceof Error
              ? caught.message
              : "Chưa đổi được trạng thái phòng ban.",
          hint: "Trạng thái đã trở về như trước. Tải lại để xem dữ liệu mới nhất.",
        });
      } finally {
        setPendingId(null);
      }
    },
    [reload],
  );

  const flipTeam = useCallback(
    async (row: Team) => {
      const next: OrgStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      setPendingId(row.id);
      setOptimistic((current) => ({ ...current, [row.id]: next }));
      try {
        await updateTeam(row.id, { status: next, version: row.version });
        setFeedback({
          tone: "success",
          message:
            next === "ACTIVE"
              ? `Đã kích hoạt nhóm ${row.name}.`
              : `Đã ngừng hoạt động nhóm ${row.name}.`,
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
          message: caught instanceof Error ? caught.message : "Chưa đổi được trạng thái nhóm.",
          hint: "Trạng thái đã trở về như trước. Tải lại để xem dữ liệu mới nhất.",
        });
      } finally {
        setPendingId(null);
      }
    },
    [reload],
  );

  const selected = useMemo(
    () => departments.items.find((row) => row.id === selectedId) ?? null,
    [departments.items, selectedId],
  );

  /** ACTIVE rows without a manager break the "at least one MANAGER" rule. */
  const missingManager = useMemo(() => {
    const dept = departments.items.filter(
      (row) => statusOf(row) === "ACTIVE" && !row.managerName.trim(),
    ).length;
    const team = teams.items.filter(
      (row) => statusOf(row) === "ACTIVE" && !row.managerName.trim(),
    ).length;
    return dept + team;
  }, [departments.items, teams.items, statusOf]);

  const filtersActive = Boolean(deptTerm || deptQuery.status);

  return {
    departments,
    deptLoading,
    deptError,
    deptQuery,
    deptTerm,
    teams,
    teamLoading,
    teamError,
    teamQuery,
    selectedId,
    selected,
    permission,
    totals,
    missingManager,
    feedback,
    pendingId,
    optimistic,
    filtersActive,
    can,
    select,
    statusOf,
    patchDeptQuery,
    setTeamQuery,
    clearFilters,
    reload,
    flipDepartment,
    flipTeam,
    setFeedback,
  };
}
