"use client";

import { useCallback, useState } from "react";
import type { Rule, RuleInput } from "../types";
import { AlertGlyph, Modal } from "./primitives";
import { RuleForm } from "./rule-form";

export function RuleDialog({
  mode,
  rule,
  busy,
  serverError,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  rule?: Rule;
  busy: boolean;
  serverError: string | null;
  onSubmit: (input: RuleInput) => void;
  onClose: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const formId = mode === "create" ? "rule-create-form" : `rule-edit-${rule?.id ?? "form"}`;

  // Closing a half-finished rule silently would lose a long condition list.
  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) setConfirming(true);
    else onClose();
  }, [busy, dirty, onClose]);

  return (
    <Modal
      wide
      title={
        mode === "create" ? "Tạo quy tắc tự động" : `Chỉnh sửa “${rule?.name ?? "quy tắc"}”`
      }
      onClose={requestClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={busy}>
            Huỷ
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? "Đang lưu…" : mode === "create" ? "Tạo quy tắc" : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <div className="stack gap-3">
        {confirming ? (
          <div className="alert alert-warning" role="alert" aria-live="assertive">
            <AlertGlyph />
            <span>Bạn có thay đổi chưa lưu. Đóng hộp thoại sẽ bỏ toàn bộ thay đổi này.</span>
            <div className="row gap-2" style={{ marginLeft: "auto" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirming(false)}
              >
                Tiếp tục sửa
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={onClose}>
                Bỏ thay đổi
              </button>
            </div>
          </div>
        ) : null}

        <RuleForm
          formId={formId}
          initial={rule}
          serverError={serverError}
          onSubmit={onSubmit}
          onDirtyChange={setDirty}
        />
      </div>
    </Modal>
  );
}
