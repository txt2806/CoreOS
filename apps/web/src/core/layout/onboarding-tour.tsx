"use client";

import { useEffect, useState } from "react";
import { IconChevronRight, IconClose } from "../../icons";

const STEPS = [
  {
    title: "Danh mục theo khu vực",
    body: "Thanh bên trái giữ 5 khu vực. Bảng chức năng thứ hai chỉ hiện mục của khu vực bạn đang mở và luôn thu gọn được.",
  },
  {
    title: "Tìm nhanh bằng Ctrl K",
    body: "Bấm Ctrl/⌘ K ở bất kỳ màn hình nào để nhảy thẳng tới chức năng cần dùng.",
  },
  {
    title: "Hành động phụ thuộc quyền",
    body: "Nút tạo, sửa, duyệt chỉ xuất hiện khi vai trò và phạm vi bản ghi của bạn cho phép. Không có nút nào giả lập thành công.",
  },
];

/**
 * Three-step first-run guide. It is dismissible, keyboard operable and remembers
 * the dismissal per surface, so it never interrupts a returning session.
 */
export function OnboardingTour({ storageKey }: { storageKey: string }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(storageKey) !== "done");
    } catch {
      setVisible(false);
    }
  }, [storageKey]);

  const finish = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(storageKey, "done");
    } catch {
      /* Session-only dismissal is acceptable. */
    }
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!visible) return null;
  const current = STEPS[step];
  if (!current) return null;

  return (
    <section className="tour" aria-label="Hướng dẫn bắt đầu">
      <div className="spread items-start gap-3">
        <div className="stack gap-1">
          <span className="eyebrow">
            Bước {step + 1}/{STEPS.length}
          </span>
          <strong>{current.title}</strong>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={finish}
          aria-label="Đóng hướng dẫn"
        >
          <IconClose size={16} />
        </button>
      </div>
      <p className="muted">{current.body}</p>
      <div className="row items-center gap-2">
        {step > 0 ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setStep((value) => Math.max(value - 1, 0))}
          >
            Quay lại
          </button>
        ) : null}
        {step + 1 < STEPS.length ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setStep((value) => value + 1)}
          >
            Tiếp <IconChevronRight size={14} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={finish}>
            Bắt đầu làm việc
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={finish}>
          Bỏ qua
        </button>
      </div>
    </section>
  );
}
