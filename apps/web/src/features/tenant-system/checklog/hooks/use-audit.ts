"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, auditFacets, listAudit, type AuditListQuery } from "../api/client";
import { DEFAULT_PAGE_SIZE } from "../constants";
import type { AuditEntry, AuditFacets, AuditPage } from "../types";

export type SortKey = "createdAt" | "actorName" | "result";
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const EMPTY: AuditPage = { items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE };

const RESULT_RANK: Record<string, number> = { DENIED: 1, FAILED: 2, SUCCESS: 3 };

/**
 * The list endpoint orders by `createdAt desc` only, so the column sort is applied
 * to the rows this page holds and is labelled as such in the UI.
 */
function sortEntries(rows: AuditEntry[], sort: SortState): AuditEntry[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const value = (row: AuditEntry): number | string => {
    if (sort.key === "result") return RESULT_RANK[row.result] ?? 9;
    if (sort.key === "actorName") return row.actorName.toLocaleLowerCase("vi");
    return row.createdAt;
  };
  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") return factor * (a - b);
    return factor * String(a).localeCompare(String(b), "vi");
  });
}

/** Read-only audit query: filters mirror the controller's `listQuery` one to one. */
export function useAudit() {
  const [query, setQuery] = useState<AuditListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    feature: "",
    action: "",
    actor: "",
    result: "",
    override: false,
    from: "",
    to: "",
  });
  const [term, setTerm] = useState("");
  const [actorTerm, setActorTerm] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "createdAt", dir: "desc" });
  const [data, setData] = useState<AuditPage>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [facets, setFacets] = useState<AuditFacets | null>(null);
  const [facetsError, setFacetsError] = useState(false);
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
    const timer = window.setTimeout(() => {
      setActorTerm(query.actor ?? "");
      setQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query.actor]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listAudit({ ...query, q: term, actor: actorTerm })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được nhật ký hệ thống."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, actorTerm, tick]);

  useEffect(() => {
    let cancelled = false;
    setFacetsError(false);
    auditFacets()
      .then((body) => {
        if (!cancelled) setFacets(body);
      })
      .catch(() => {
        /* The table still works without the facet lists. */
        if (!cancelled) setFacetsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const patchQuery = useCallback((patch: Partial<AuditListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "createdAt" ? "desc" : "asc" },
    );
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({
      ...current,
      q: "",
      actor: "",
      feature: "",
      action: "",
      result: "",
      override: false,
      from: "",
      to: "",
      page: 1,
    }));
  }, []);

  const rows = useMemo(() => sortEntries(data.items, sort), [data.items, sort]);

  const rangeInvalid = Boolean(query.from && query.to && query.from > query.to);
  const filtersActive = Boolean(
    term ||
      actorTerm ||
      query.feature ||
      query.action ||
      query.result ||
      query.override ||
      query.from ||
      query.to,
  );

  return {
    data,
    rows,
    loading,
    error,
    facets,
    facetsError,
    sort,
    query,
    term,
    actorTerm,
    rangeInvalid,
    filtersActive,
    patchQuery,
    toggleSort,
    clearFilters,
    reload,
  };
}
