"use client";

import { useState } from "react";
import { CONVERSATION_STATUSES } from "../types";
import type { ConversationInput, ConversationStatus } from "../types";
import { todayIso } from "../format";
import { Field, Modal, Select, TextInput } from "./primitives";

interface CreateConversationDialogProps {
  onCreate: (input: ConversationInput) => Promise<unknown>;
  onClose: () => void;
}

interface Draft {
  code: string;
  name: string;
  channel: string;
  participants: string;
  date: string;
  status: ConversationStatus;
  note: string;
}

/** A new conversation starts with an empty comment list; the first message opens it. */
export function CreateConversationDialog({ onCreate, onClose }: CreateConversationDialogProps) {
  const [draft, setDraft] = useState<Draft>({
    code: "",
    name: "",
    channel: "",
    participants: "",
    date: todayIso(),
    status: "Đang mở",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!draft.code.trim()) next.code = "Nhập mã cuộc trao đổi, ví dụ CHAT-012.";
    if (!draft.name.trim()) next.name = "Nhập tên cuộc trao đổi.";
    if (!draft.date) next.date = "Chọn ngày bắt đầu.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setProblem(null);
    try {
      await onCreate({
        code: draft.code.trim(),
        name: draft.name.trim(),
        scope: "",
        status: draft.status,
        date: draft.date,
        assignee: "",
        note: draft.note.trim(),
        fields: {
          ...(draft.channel.trim() ? { channel: draft.channel.trim() } : {}),
          ...(draft.participants.trim() ? { participants: draft.participants.trim() } : {}),
          comments: [],
        },
      });
      onClose();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa mở được cuộc trao đổi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Mở cuộc trao đổi"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : "Mở cuộc trao đổi"}
          </button>
        </>
      }
    >
      {problem ? (
        <div className="alert alert-danger" role="alert">
          {problem}
        </div>
      ) : null}

      <div className="field-grid">
        <Field label="Mã cuộc trao đổi" htmlFor="chat-code" required error={errors.code}>
          <TextInput
            id="chat-code"
            value={draft.code}
            invalid={Boolean(errors.code)}
            maxLength={100}
            autoComplete="off"
            placeholder="CHAT-012"
            onChange={(event) => set("code", event.target.value)}
          />
        </Field>
        <Field label="Ngày bắt đầu" htmlFor="chat-date" required error={errors.date}>
          <TextInput
            id="chat-date"
            type="date"
            value={draft.date}
            invalid={Boolean(errors.date)}
            onChange={(event) => set("date", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Tên cuộc trao đổi" htmlFor="chat-name" required error={errors.name}>
        <TextInput
          id="chat-name"
          value={draft.name}
          invalid={Boolean(errors.name)}
          maxLength={500}
          autoComplete="off"
          placeholder="Điều phối giao hàng tuần 45"
          onChange={(event) => set("name", event.target.value)}
        />
      </Field>

      <div className="field-grid">
        <Field label="Kênh" htmlFor="chat-channel" hint="Không bắt buộc">
          <TextInput
            id="chat-channel"
            value={draft.channel}
            maxLength={1000}
            autoComplete="off"
            placeholder="vận hành"
            onChange={(event) => set("channel", event.target.value)}
          />
        </Field>
        <Field label="Người tham gia" htmlFor="chat-participants" hint="Cách nhau bằng dấu phẩy">
          <TextInput
            id="chat-participants"
            value={draft.participants}
            maxLength={1000}
            autoComplete="off"
            placeholder="Nguyễn An, Trần Bình"
            onChange={(event) => set("participants", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Trạng thái" htmlFor="chat-status">
        <Select
          id="chat-status"
          value={draft.status}
          onChange={(event) => set("status", event.target.value as ConversationStatus)}
        >
          {CONVERSATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Ghi chú" htmlFor="chat-note" hint="Tối đa 2.000 ký tự">
        <textarea
          id="chat-note"
          className="textarea"
          value={draft.note}
          maxLength={2000}
          rows={2}
          onChange={(event) => set("note", event.target.value)}
        />
      </Field>
    </Modal>
  );
}
