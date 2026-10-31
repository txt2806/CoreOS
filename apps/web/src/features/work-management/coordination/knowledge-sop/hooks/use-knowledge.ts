"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  createNote,
  deleteNote,
  listNotes,
  noteTotal,
  updateNote,
  type NoteListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE } from "../constants";
import type { KnowledgeNote, NoteInput, NoteStatus, PageResult } from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<KnowledgeNote> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the note page, the status totals and the optimistic edits. Writes are
 * versioned: a 409 means someone else saved first, so the message says so and the
 * list is reloaded instead of pretending the local guess won.
 */
export function useKnowledge() {
  const [query, setQuery] = useState<NoteListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<KnowledgeNote>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [totals, setTotals] = useState<Partial<Record<NoteStatus, number>>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, KnowledgeNote>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
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
    listNotes({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách ghi chú."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, tick]);

  /* The reload after a write carries the real record; drop the guess. */
  useEffect(() => {
    setOptimistic({});
    setRemoved([]);
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      (["Đã xuất bản", "Bản nháp", "Lưu trữ"] as NoteStatus[]).map((status) =>
        noteTotal(status).then((total) => [status, total] as const),
      ),
    )
      .then((pairs) => {
        if (cancelled) return;
        setTotals(Object.fromEntries(pairs) as Partial<Record<NoteStatus, number>>);
      })
      .catch(() => {
        /* The strip shows a dash rather than an invented number. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const patchQuery = useCallback((patch: Partial<NoteListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: NoteInput) => {
      const created = await createNote(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo ${created.code}.`,
        hint:
          created.status === "Bản nháp"
            ? "Bài đang ở trạng thái nháp — xuất bản khi nội dung đã sẵn sàng cho cả ca."
            : "Nội dung đã hiện trong danh sách tra cứu.",
      });
      reload();
      return created;
    },
    [reload],
  );

  const save = useCallback(
    async (note: KnowledgeNote, patch: Partial<NoteInput>) => {
      setPending(note.id);
      try {
        const saved = await updateNote(note.id, { ...patch, version: note.version });
        setOptimistic((current) => ({ ...current, [note.id]: saved }));
        setFeedback({ tone: "success", message: `Đã lưu ${saved.code}.` });
        reload();
        return saved;
      } catch (caught) {
        setOptimistic((current) => {
          const copy = { ...current };
          delete copy[note.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa lưu được thay đổi.",
          hint:
            caught instanceof ApiError && caught.status === 409
              ? "Người khác đã sửa bài này trước. Nội dung mới nhất đang được tải lại."
              : "Nội dung bạn vừa nhập vẫn còn trong biểu mẫu.",
        });
        if (caught instanceof ApiError && caught.status === 409) reload();
        return null;
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  const changeStatus = useCallback(
    async (note: KnowledgeNote, status: NoteStatus) => {
      const previous = note.status;
      setPending(note.id);
      setOptimistic((current) => ({ ...current, [note.id]: { ...note, status } }));
      try {
        const saved = await updateNote(note.id, { status, version: note.version });
        setOptimistic((current) => ({ ...current, [note.id]: saved }));
        setFeedback({
          tone: "success",
          message:
            status === "Đã xuất bản"
              ? `${note.code} đã xuất bản, cả ca tra cứu được ngay.`
              : status === "Lưu trữ"
                ? `${note.code} đã chuyển vào lưu trữ. Nội dung vẫn đọc được.`
                : `${note.code} đã trở về bản nháp để sửa tiếp.`,
        });
        reload();
      } catch (caught) {
        setOptimistic((current) => {
          const copy = { ...current };
          delete copy[note.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa đổi được trạng thái.",
          hint: `Bài vẫn ở trạng thái “${previous}”.`,
        });
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (note: KnowledgeNote) => {
      setPending(note.id);
      setRemoved((current) => [...current, note.id]);
      try {
        await deleteNote(note.id, note.version);
        setFeedback({
          tone: "success",
          message: `Đã xoá ${note.code}.`,
          hint: "Bản ghi đã bị xoá hẳn khỏi phân hệ, không khôi phục được.",
        });
        reload();
      } catch (caught) {
        setRemoved((current) => current.filter((id) => id !== note.id));
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa xoá được bài này.",
          hint: `${note.code} vẫn còn trong danh sách.`,
        });
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status);

  const rows = useMemo(() => {
    const hidden = new Set(removed);
    return data.items
      .filter((note) => !hidden.has(note.id))
      .map((note) => optimistic[note.id] ?? note);
  }, [data.items, optimistic, removed]);

  const total = Math.max(0, data.total - removed.length);

  return {
    data,
    rows,
    total,
    loading,
    error,
    totals,
    feedback,
    pending,
    query,
    term,
    filtersActive,
    patchQuery,
    clearFilters,
    reload,
    create,
    save,
    changeStatus,
    remove,
    setFeedback,
  };
}
