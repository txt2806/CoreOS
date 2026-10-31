"use client";

import { useEffect, useState } from "react";
import { ApiError, listProjectOptions } from "../api/client";
import type { MilestoneInput, ProjectRef } from "../types";
import { MilestoneForm } from "./milestone-form";
import { Modal, SearchGlyph } from "./primitives";

interface CreateMilestoneDialogProps {
  onCreate: (input: MilestoneInput) => Promise<unknown>;
  onClose: () => void;
}

/**
 * The milestone DTO carries a `projectId` UUID but no project name, and a feature
 * may not import the project-spaces module. Options come from the real
 * `GET /projects`; when the actor cannot read projects the dialog says so instead
 * of letting the user type a raw UUID.
 */
export function CreateMilestoneDialog({ onCreate, onClose }: CreateMilestoneDialogProps) {
  const [term, setTerm] = useState("");
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      listProjectOptions(term)
        .then((page) => {
          if (cancelled) return;
          setProjects(page.items);
          setError(null);
        })
        .catch((caught: unknown) => {
          if (cancelled) return;
          setProjects([]);
          setError(
            caught instanceof ApiError && caught.status === 403
              ? "Bạn không có quyền xem danh sách dự án, nên chưa chọn được dự án cho mốc. Yêu cầu quản trị cấp quyền xem Không gian dự án."
              : caught instanceof Error
                ? caught.message
                : "Không tải được danh sách dự án.",
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term]);

  return (
    <Modal title="Tạo mốc" onClose={onClose} wide>
      <div className="stack gap-3" style={{ marginBottom: "var(--space-4)" }}>
        <div className="search">
          <SearchGlyph />
          <input
            id="milestone-project-search"
            className="input"
            type="search"
            value={term}
            autoComplete="off"
            placeholder="Tìm dự án theo mã hoặc tên…"
            aria-label="Tìm dự án để gắn mốc"
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>
        <span className="muted" role="status" aria-live="polite">
          {loading
            ? "Đang tải danh sách dự án…"
            : error
              ? ""
              : `${projects.length.toLocaleString("vi-VN")} dự án khớp từ khoá`}
        </span>
      </div>
      <MilestoneForm
        projects={projects}
        projectsError={error}
        submitLabel="Tạo mốc"
        onCancel={onClose}
        onSubmit={async (values) => {
          await onCreate(values);
          onClose();
        }}
      />
    </Modal>
  );
}
