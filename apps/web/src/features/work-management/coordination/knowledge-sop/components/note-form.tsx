"use client";

import { useId, useState } from "react";
import { CATEGORY_LIMIT, CONTENT_LIMIT, TAGS_LIMIT } from "../constants";
import { NOTE_STATUSES } from "../types";
import type { KnowledgeNote, NoteInput, NoteStatus } from "../types";
import { paragraphs, todayIso } from "../format";
import { Field, Modal, Select, TextInput } from "./primitives";

interface NoteFormProps {
  /** `null` opens the form in create mode. */
  note: KnowledgeNote | null;
  onCreate: (input: NoteInput) => Promise<unknown>;
  onUpdate: (note: KnowledgeNote, patch: Partial<NoteInput>) => Promise<KnowledgeNote | null>;
  onClose: () => void;
}

interface Draft {
  code: string;
  name: string;
  date: string;
  status: NoteStatus;
  category: string;
  tags: string;
  content: string;
  assignee: string;
  note: string;
  scope: string;
}

const EMPTY_DRAFT: Draft = {
  code: "",
  name: "",
  date: todayIso(),
  status: "Bản nháp",
  category: "",
  tags: "",
  content: "",
  assignee: "",
  note: "",
  scope: "",
};

function draftOf(note: KnowledgeNote | null): Draft {
  if (!note) return { ...EMPTY_DRAFT, date: todayIso() };
  return {
    code: note.code,
    name: note.name,
    date: note.date,
    status: note.status,
    category: note.fields.category ?? "",
    tags: note.fields.tags ?? "",
    content: note.fields.content ?? "",
    assignee: note.assignee,
    note: note.note,
    scope: note.scope,
  };
}

function sameDraft(left: Draft, right: Draft): boolean {
  return (Object.keys(left) as (keyof Draft)[]).every((key) => left[key] === right[key]);
}

/**
 * One form for both modes. The body stays plain text: the specification forbids
 * rendering stored HTML, so the preview only splits paragraphs.
 */
export function NoteForm({ note, onCreate, onUpdate, onClose }: NoteFormProps) {
  const initial = draftOf(note);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [askDiscard, setAskDiscard] = useState(false);
  const bodyId = useId();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const dirty = !sameDraft(draft, initial);
  const overContent = draft.content.length > CONTENT_LIMIT;

  const requestClose = () => {
    if (dirty) {
      setAskDiscard(true);
      return;
    }
    onClose();
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!draft.code.trim()) next.code = "Nhập mã bài, ví dụ SOP-014.";
    if (!draft.name.trim()) next.name = "Nhập tên bài để người khác tra được.";
    if (!draft.date) next.date = "Chọn ngày áp dụng.";
    if (!draft.content.trim()) next.content = "Nhập nội dung hướng dẫn.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setTab("write");
      return;
    }

    const input: NoteInput = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      scope: draft.scope.trim(),
      status: draft.status,
      date: draft.date,
      assignee: draft.assignee.trim(),
      note: draft.note.trim(),
      fields: {
        ...(draft.category.trim() ? { category: draft.category.trim() } : {}),
        ...(draft.tags.trim() ? { tags: draft.tags.trim() } : {}),
        content: draft.content,
      },
    };

    setBusy(true);
    setProblem(null);
    try {
      if (note) {
        const saved = await onUpdate(note, input);
        /* A conflict leaves the form open so the typed text is not lost. */
        if (saved) onClose();
      } else {
        await onCreate(input);
        onClose();
      }
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa lưu được bài này.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={note ? `Sửa ${note.code}` : "Viết bài mới"}
      onClose={requestClose}
      wide
      footer={
        <>
          {askDiscard ? (
            <>
              <span className="muted" style={{ marginRight: "auto" }}>
                Có thay đổi chưa lưu.
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => setAskDiscard(false)}>
                Ở lại
              </button>
              <button type="button" className="btn btn-danger" onClick={onClose}>
                Vẫn đóng
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={requestClose}>
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submit}
                disabled={busy || overContent}
                aria-busy={busy ? "true" : undefined}
              >
                {busy ? "Đang lưu…" : note ? "Lưu thay đổi" : "Tạo bài"}
              </button>
            </>
          )}
        </>
      }
    >
      {problem ? (
        <div className="alert alert-danger" role="alert">
          {problem}
        </div>
      ) : null}

      <div className="field-grid">
        <Field label="Mã bài" htmlFor="note-code" required error={errors.code}>
          <TextInput
            id="note-code"
            value={draft.code}
            invalid={Boolean(errors.code)}
            maxLength={100}
            autoComplete="off"
            placeholder="SOP-014"
            onChange={(event) => set("code", event.target.value)}
          />
        </Field>
        <Field label="Ngày áp dụng" htmlFor="note-date" required error={errors.date}>
          <TextInput
            id="note-date"
            type="date"
            value={draft.date}
            invalid={Boolean(errors.date)}
            onChange={(event) => set("date", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Tên bài" htmlFor="note-name" required error={errors.name}>
        <TextInput
          id="note-name"
          value={draft.name}
          invalid={Boolean(errors.name)}
          maxLength={500}
          autoComplete="off"
          placeholder="Quy trình đóng ca kho lạnh"
          onChange={(event) => set("name", event.target.value)}
        />
      </Field>

      <div className="field-grid">
        <Field label="Nhóm nội dung" htmlFor="note-category" hint="Không bắt buộc">
          <TextInput
            id="note-category"
            value={draft.category}
            maxLength={CATEGORY_LIMIT}
            autoComplete="off"
            placeholder="Vận hành kho"
            onChange={(event) => set("category", event.target.value)}
          />
        </Field>
        <Field label="Nhãn" htmlFor="note-tags" hint="Cách nhau bằng dấu phẩy">
          <TextInput
            id="note-tags"
            value={draft.tags}
            maxLength={TAGS_LIMIT}
            autoComplete="off"
            placeholder="kho lạnh, đóng ca"
            onChange={(event) => set("tags", event.target.value)}
          />
        </Field>
      </div>

      <div className="tabs" role="tablist" aria-label="Chế độ soạn thảo">
        <button
          type="button"
          className="tab"
          role="tab"
          aria-selected={tab === "write" ? "true" : "false"}
          aria-controls={`${bodyId}-write`}
          id={`${bodyId}-tab-write`}
          onClick={() => setTab("write")}
        >
          Soạn thảo
        </button>
        <button
          type="button"
          className="tab"
          role="tab"
          aria-selected={tab === "preview" ? "true" : "false"}
          aria-controls={`${bodyId}-preview`}
          id={`${bodyId}-tab-preview`}
          onClick={() => setTab("preview")}
        >
          Xem trước
        </button>
      </div>

      <div
        id={`${bodyId}-write`}
        role="tabpanel"
        aria-labelledby={`${bodyId}-tab-write`}
        hidden={tab !== "write"}
        className="stack gap-2"
        style={{ paddingTop: "var(--space-3)" }}
      >
        <Field
          label="Nội dung"
          htmlFor={`${bodyId}-content`}
          required
          error={errors.content}
          hint={`Ngăn cách đoạn bằng một dòng trống · ${draft.content.length.toLocaleString("vi-VN")}/${CONTENT_LIMIT.toLocaleString("vi-VN")} ký tự`}
        >
          <textarea
            id={`${bodyId}-content`}
            className="textarea"
            rows={12}
            value={draft.content}
            maxLength={CONTENT_LIMIT}
            aria-invalid={errors.content ? "true" : undefined}
            onChange={(event) => set("content", event.target.value)}
          />
        </Field>
      </div>

      <div
        id={`${bodyId}-preview`}
        role="tabpanel"
        aria-labelledby={`${bodyId}-tab-preview`}
        hidden={tab !== "preview"}
        className="surface-body stack gap-3"
        style={{ paddingTop: "var(--space-3)" }}
      >
        {draft.content.trim() ? (
          paragraphs(draft.content).map((block, index) => (
            <p key={index} style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {block}
            </p>
          ))
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Chưa có nội dung để xem trước.
          </p>
        )}
      </div>

      <div className="field-grid">
        <Field label="Người phụ trách" htmlFor="note-assignee" hint="Không bắt buộc">
          <TextInput
            id="note-assignee"
            value={draft.assignee}
            maxLength={150}
            autoComplete="off"
            placeholder="Nguyễn An"
            onChange={(event) => set("assignee", event.target.value)}
          />
        </Field>
        <Field label="Phạm vi" htmlFor="note-scope" hint="Không bắt buộc">
          <TextInput
            id="note-scope"
            value={draft.scope}
            maxLength={250}
            autoComplete="off"
            placeholder="Kho Hà Nội"
            onChange={(event) => set("scope", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Trạng thái" htmlFor="note-status">
        <Select
          id="note-status"
          value={draft.status}
          onChange={(event) => set("status", event.target.value as NoteStatus)}
        >
          {NOTE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Ghi chú nội bộ" htmlFor="note-internal" hint="Không hiện trong phần đọc công khai">
        <textarea
          id="note-internal"
          className="textarea"
          rows={2}
          value={draft.note}
          maxLength={2000}
          onChange={(event) => set("note", event.target.value)}
        />
      </Field>
    </Modal>
  );
}
