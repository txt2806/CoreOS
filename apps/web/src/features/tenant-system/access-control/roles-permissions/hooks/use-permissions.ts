"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  history as historyApi,
  matrix as matrixApi,
  mine as mineApi,
  saveMatrix,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, RESERVED_ACTION } from "../constants";
import type {
  FeatureGroup,
  Matrix,
  MyPermissions,
  PermissionAction,
  PermissionChangeEntry,
  PermissionRole,
  SaveRow,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

export interface DirtyCell {
  featureKey: string;
  role: PermissionRole;
  actions: PermissionAction[];
}

export interface FeatureEntry {
  featureKey: string;
  label: string;
  group: FeatureGroup;
}

/** Diacritic-insensitive so "quyen" also finds "Quyền". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const cellKey = (featureKey: string, role: PermissionRole) => `${featureKey}|${role}`;

/**
 * Owns the matrix, the per-cell draft and the save call. Edits live only in the
 * draft until the explicit save, so a half-finished matrix never leaks out.
 */
export function usePermissions() {
  const [data, setData] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [actor, setActor] = useState<MyPermissions | null>(null);
  const [actorMissing, setActorMissing] = useState(false);
  const [role, setRole] = useState<PermissionRole>("MANAGER");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<FeatureGroup | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [draft, setDraft] = useState<Record<string, DirtyCell>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [historyItems, setHistoryItems] = useState<PermissionChangeEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    matrixApi()
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(caught instanceof ApiError ? caught : new ApiError(0, "Không tải được ma trận quyền."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    mineApi()
      .then((body) => {
        if (cancelled) return;
        setActor(body);
        setActorMissing(false);
      })
      .catch(() => {
        if (!cancelled) {
          setActor(null);
          setActorMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const assignable = useMemo(
    () => (data?.actions ?? []).filter((action) => action !== RESERVED_ACTION),
    [data],
  );

  const rowOf = useCallback(
    (featureKey: string, target: PermissionRole) =>
      data?.items.find((item) => item.featureKey === featureKey && item.role === target) ?? null,
    [data],
  );

  const features = useMemo<FeatureEntry[]>(() => {
    const seen = new Map<string, FeatureEntry>();
    for (const item of data?.items ?? []) {
      if (seen.has(item.featureKey)) continue;
      seen.set(item.featureKey, {
        featureKey: item.featureKey,
        label: item.label,
        group: item.group,
      });
    }
    return [...seen.values()];
  }, [data]);

  const filtered = useMemo(() => {
    const needle = normalize(q.trim());
    return features.filter((feature) => {
      if (group && feature.group !== group) return false;
      if (!needle) return true;
      return normalize(feature.label).includes(needle) || normalize(feature.featureKey).includes(needle);
    });
  }, [features, group, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const actionsFor = useCallback(
    (featureKey: string, target: PermissionRole): PermissionAction[] => {
      const dirty = draft[cellKey(featureKey, target)];
      if (dirty) return dirty.actions;
      return rowOf(featureKey, target)?.actions ?? [];
    },
    [draft, rowOf],
  );

  const toggle = useCallback(
    (featureKey: string, action: PermissionAction) => {
      const original = rowOf(featureKey, role)?.actions ?? [];
      const current = actionsFor(featureKey, role);
      const next = current.includes(action)
        ? current.filter((item) => item !== action)
        : [...current, action];
      // Keep the catalog order so the stored array matches the API normaliser.
      const ordered = assignable.filter((item) => next.includes(item));
      const unchanged =
        ordered.length === original.length && ordered.every((item, index) => item === original[index]);

      setDraft((previous) => {
        const key = cellKey(featureKey, role);
        const copy = { ...previous };
        if (unchanged) delete copy[key];
        else copy[key] = { featureKey, role, actions: ordered };
        return copy;
      });
    },
    [actionsFor, assignable, role, rowOf],
  );

  /** `cellKey` stays private to this hook; the matrix asks through these two. */
  const isDirty = useCallback(
    (featureKey: string, target: PermissionRole) => Boolean(draft[cellKey(featureKey, target)]),
    [draft],
  );

  const isDefault = useCallback(
    (featureKey: string, target: PermissionRole) => rowOf(featureKey, target)?.isDefault ?? true,
    [rowOf],
  );

  const grantCount = useCallback(
    (target: PermissionRole) =>
      features.reduce((total, feature) => total + actionsFor(feature.featureKey, target).length, 0),
    [actionsFor, features],
  );

  const discard = useCallback(() => {
    setDraft({});
    setReason("");
  }, []);

  const save = useCallback(async () => {
    const cells = Object.values(draft);
    if (cells.length === 0) return;
    const items: SaveRow[] = cells.map((cell) => ({
      featureKey: cell.featureKey,
      role: cell.role,
      actions: cell.actions,
      version: rowOf(cell.featureKey, cell.role)?.version ?? 0,
    }));

    setSaving(true);
    try {
      const next = await saveMatrix({ items, reason: reason.trim() || undefined });
      setData(next);
      setDraft({});
      setReason("");
      setFeedback({
        tone: "success",
        message: `Đã lưu ${items.length} ô quyền.`,
        hint: "Mỗi ô vừa đổi đều có một dòng trong lịch sử thay đổi.",
      });
    } catch (caught) {
      setFeedback(
        caught instanceof ApiError
          ? {
              tone: "error",
              message: caught.message,
              hint:
                caught.status === 409
                  ? "Ma trận đã đổi ở nơi khác. Tải lại rồi chỉnh tiếp."
                  : undefined,
            }
          : { tone: "error", message: "Chưa lưu được ma trận quyền." },
      );
    } finally {
      setSaving(false);
    }
  }, [draft, reason, rowOf]);

  const loadHistory = useCallback(async () => {
    setHistoryItems(null);
    setHistoryError(null);
    try {
      const body = await historyApi();
      setHistoryItems(body.items);
    } catch (caught) {
      setHistoryError(caught instanceof ApiError ? caught.message : "Không tải được lịch sử thay đổi.");
    }
  }, []);

  const reload = useCallback(() => {
    setDraft({});
    setTick((value) => value + 1);
  }, []);

  const dirtyCount = Object.keys(draft).length;
  const filtersActive = Boolean(q.trim() || group);
  const canEdit = actor?.canManage ?? false;

  return {
    data,
    loading,
    error,
    actor,
    actorMissing,
    role,
    setRole,
    q,
    setQ: (value: string) => {
      setQ(value);
      setPage(1);
    },
    group,
    setGroup: (value: FeatureGroup | "") => {
      setGroup(value);
      setPage(1);
    },
    page: safePage,
    pageSize,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    total: filtered.length,
    visible,
    assignable,
    actionsFor,
    isDirty,
    isDefault,
    grantCount,
    featureCount: features.length,
    toggle,
    draft,
    dirtyCount,
    reason,
    setReason,
    discard,
    save,
    saving,
    feedback,
    setFeedback,
    filtersActive,
    clearFilters: () => {
      setQ("");
      setGroup("");
      setPage(1);
    },
    canEdit,
    reload,
    historyItems,
    historyError,
    loadHistory,
  };
}
