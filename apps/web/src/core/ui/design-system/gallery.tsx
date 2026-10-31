"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckGlyph, CloseGlyph, PlusGlyph, SearchGlyph } from "./glyphs";

const SURFACES = [
  { name: "--canvas", note: "Nền sương màu" },
  { name: "--surface", note: "Bề mặt dữ liệu đục" },
  { name: "--glass", note: "Rail, panel, topbar" },
  { name: "--action", note: "Hành động chính" },
  { name: "--foreground", note: "Chữ chính" },
  { name: "--line", note: "Đường phân cách" },
];

const STATUSES = [
  { tone: "badge badge-success", label: "Hoàn thành" },
  { tone: "badge badge-warning", label: "Chờ duyệt" },
  { tone: "badge badge-danger", label: "Quá hạn" },
  { tone: "badge badge-info", label: "Đang làm" },
  { tone: "badge badge-accent", label: "Việc mới" },
  { tone: "badge", label: "Tạm hoãn" },
];

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="surface" aria-labelledby={id}>
      <div className="surface-head">
        <div className="stack gap-1">
          <h2 className="surface-title" id={id}>
            {title}
          </h2>
          <span className="muted">{note}</span>
        </div>
      </div>
      <div className="surface-body stack gap-4">{children}</div>
    </section>
  );
}

export function DesignGallery({ version }: { version: string }) {
  const [overlay, setOverlay] = useState<"dialog" | "sheet" | null>(null);

  /* Esc closes the overlay and returns focus to the trigger by way of the browser. */
  useEffect(() => {
    if (!overlay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOverlay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  return (
    <>
      <div className="metric-strip">
        <div className="metric">
          <span className="metric-label">Phiên bản</span>
          <span className="metric-value tabular">{version}</span>
          <span className="metric-note">Sinh từ tokens/source.json</span>
        </div>
        <div className="metric">
          <span className="metric-label">Giao diện</span>
          <span className="metric-value">2</span>
          <span className="metric-note">Sáng và tối, cùng một lớp thành phần</span>
        </div>
        <div className="metric">
          <span className="metric-label">Mật độ</span>
          <span className="metric-value">2</span>
          <span className="metric-note">Thoáng và gọn, đổi bằng data-density</span>
        </div>
        <div className="metric">
          <span className="metric-label">Chuyển động</span>
          <span className="metric-value tabular">≤ 240ms</span>
          <span className="metric-note">Tắt hoàn toàn khi prefers-reduced-motion</span>
        </div>
      </div>

      <Section
        id="gallery-surfaces"
        title="Bề mặt và sương màu"
        note="Sương neon nằm trên body; mọi bề mặt chứa dữ liệu đều đục để giữ tương phản."
      >
        <div className="row wrap gap-3">
          {SURFACES.map((item) => (
            <div key={item.name} className="stack gap-1" style={{ minWidth: 132 }}>
              <span
                aria-hidden="true"
                style={{
                  height: 44,
                  background: `var(${item.name})`,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                }}
              />
              <span className="mono">{item.name}</span>
              <span className="muted">{item.note}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="gallery-buttons"
        title="Nút"
        note="Một hành động chính cho mỗi vùng. Nút phụ dùng viền trong, không dùng bóng."
      >
        <div className="row wrap items-center gap-3">
          <button type="button" className="btn btn-primary">
            <PlusGlyph aria-hidden="true" width={16} height={16} />
            Tạo mới
          </button>
          <button type="button" className="btn btn-ghost">
            <SearchGlyph aria-hidden="true" width={16} height={16} />
            Tìm kiếm
          </button>
          <button type="button" className="btn btn-danger">
            <CloseGlyph aria-hidden="true" width={16} height={16} />
            Huỷ
          </button>
          <button type="button" className="btn btn-ghost btn-sm">
            Cỡ nhỏ
          </button>
          <button type="button" className="btn btn-icon" aria-label="Đánh dấu đã xong">
            <CheckGlyph aria-hidden="true" width={16} height={16} />
          </button>
          <button type="button" className="btn btn-primary" disabled>
            Không khả dụng
          </button>
          <button type="button" className="btn btn-primary" aria-busy="true" disabled>
            Đang lưu…
          </button>
        </div>
      </Section>

      <Section
        id="gallery-status"
        title="Trạng thái"
        note="Trạng thái luôn là chấm màu kèm chữ — không bao giờ chỉ dùng màu."
      >
        <div className="row wrap items-center gap-3">
          {STATUSES.map((item) => (
            <span key={item.label} className={item.tone}>
              <span className="dot" />
              {item.label}
            </span>
          ))}
        </div>
        <div className="row wrap items-center gap-4">
          <span className="deadline">Hạn 12/11/2026</span>
          <span className="deadline deadline-warning">Hạn 05/11/2026</span>
          <span className="deadline deadline-danger">Hạn 28/10/2026</span>
          <span className="badge badge-warning">Vượt hạn mức phép</span>
        </div>
      </Section>

      <Section
        id="gallery-form"
        title="Biểu mẫu"
        note="Nhãn luôn hiện, lỗi nằm ngay dưới trường và được nối bằng aria-describedby."
      >
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="gallery-name">
              Tên công việc <span className="field-required">*</span>
            </label>
            <input id="gallery-name" className="input" defaultValue="Rà soát hợp đồng Q4" />
            <span className="field-hint">Tối đa 150 ký tự.</span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="gallery-priority">
              Ưu tiên
            </label>
            <select id="gallery-priority" className="select" defaultValue="HIGH">
              <option value="URGENT">Khẩn cấp</option>
              <option value="HIGH">Cao</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="LOW">Thấp</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="gallery-deadline">
              Hạn xử lý
            </label>
            <input
              id="gallery-deadline"
              className="input"
              type="date"
              defaultValue="2026-11-12"
              aria-describedby="gallery-deadline-error"
              aria-invalid="true"
            />
            <span className="field-error" id="gallery-deadline-error">
              Hạn không được trước ngày bắt đầu.
            </span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="gallery-note">
              Ghi chú
            </label>
            <textarea id="gallery-note" className="textarea" rows={3} defaultValue="" />
          </div>
        </div>
        <label className="checkbox">
          <input type="checkbox" defaultChecked />
          Gửi thông báo cho người kiểm tra
        </label>
      </Section>

      <Section
        id="gallery-alerts"
        title="Thông báo"
        note="Thông báo nêu việc đã xảy ra và bước tiếp theo, không chỉ báo lỗi."
      >
        <div className="alert alert-success" role="status">
          <span>Đã lưu thay đổi và ghi vào nhật ký kiểm toán.</span>
        </div>
        <div className="alert alert-warning" role="status">
          <span>Bạn đang dùng 18/20 ngày phép năm. Đơn vượt hạn mức sẽ bị trừ lương.</span>
        </div>
        <div className="alert alert-danger" role="alert">
          <span>
            Không nộp được đơn: phiên đăng nhập đã hết hạn. Đăng nhập lại để gửi tiếp, nội
            dung đơn vẫn được giữ.
          </span>
        </div>
      </Section>

      <Section
        id="gallery-table"
        title="Bảng dữ liệu"
        note="Số và ngày căn theo chữ số đều; cột có thể sắp xếp mang aria-sort."
      >
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">Ví dụ bảng dữ liệu</caption>
            <thead>
              <tr>
                <th scope="col">Mã</th>
                <th scope="col">Công việc</th>
                <th scope="col" aria-sort="ascending">
                  Hạn
                </th>
                <th scope="col">Tiến độ</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">CV-1042</td>
                <td className="cell-title">Chuẩn hoá quy trình chấm công ca đêm</td>
                <td className="deadline deadline-warning">05/11/2026</td>
                <td>
                  <div className="progress" style={{ width: 120 }}>
                    <span style={{ width: "62%" }} />
                  </div>
                </td>
                <td>
                  <span className="badge badge-info">
                    <span className="dot" />
                    Đang làm
                  </span>
                </td>
              </tr>
              <tr>
                <td className="mono">CV-1043</td>
                <td className="cell-title">Đối chiếu bảng công tháng 10</td>
                <td className="deadline">12/11/2026</td>
                <td>
                  <div className="progress" style={{ width: 120 }}>
                    <span style={{ width: "100%" }} />
                  </div>
                </td>
                <td>
                  <span className="badge badge-success">
                    <span className="dot" />
                    Hoàn thành
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="gallery-widgets"
        title="Lưới bento và widget"
        note="Mười hai cột, khoảng trống đều; mỗi widget tự nêu trạng thái tải, lỗi và rỗng."
      >
        <div className="bento">
          <article className="widget bento-8">
            <div className="widget-head">
              <div className="stack gap-1">
                <h3 className="widget-title">Việc của tôi</h3>
                <span className="widget-note">3 việc đang mở · 1 quá hạn</span>
              </div>
            </div>
            <div className="widget-body">
              <ul className="list">
                <li>
                  <div className="list-row">
                    <div className="list-main">
                      <strong>Đối chiếu bảng công tháng 10</strong>
                      <span className="list-meta">CV-1043 · Hạn 12/11/2026</span>
                    </div>
                    <span className="badge badge-info">
                      <span className="dot" />
                      Đang làm
                    </span>
                  </div>
                </li>
                <li>
                  <div className="list-row">
                    <div className="list-main">
                      <strong>Chốt lịch sprint 24</strong>
                      <span className="list-meta">CV-1044 · Hạn 28/10/2026</span>
                    </div>
                    <span className="badge badge-danger">
                      <span className="dot" />
                      Quá hạn
                    </span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="widget-foot">
              <span>Cập nhật trong 2 giây gần nhất</span>
              <span className="link">Xem tất cả</span>
            </div>
          </article>

          <article className="widget bento-4">
            <div className="widget-head">
              <div className="stack gap-1">
                <h3 className="widget-title">Điểm danh hôm nay</h3>
                <span className="widget-note">Ghi giờ vào và giờ ra</span>
              </div>
            </div>
            <div className="widget-body">
              <div className="stack gap-1">
                <span className="hero-priority-value tabular">08:02</span>
                <span className="muted">Giờ vào · Đúng giờ</span>
              </div>
            </div>
            <div className="widget-foot">
              <span>Bây giờ 17:24</span>
              <button type="button" className="btn btn-primary btn-sm">
                Chấm công ra
              </button>
            </div>
          </article>
        </div>
      </Section>

      <Section
        id="gallery-overlay"
        title="Lớp phủ"
        note="Hộp thoại cho quyết định ngắn, tấm trượt cho hồ sơ dài. Esc luôn đóng được."
      >
        <div className="row wrap gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => setOverlay("dialog")}>
            Mở hộp thoại xác nhận
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setOverlay("sheet")}>
            Mở tấm hồ sơ
          </button>
        </div>
      </Section>

      <Section
        id="gallery-feedback"
        title="Tải và dòng thời gian"
        note="Khung xương giữ đúng kích thước dòng để không nhảy bố cục khi dữ liệu về."
      >
        <div className="stack gap-2" aria-busy="true">
          <span className="skeleton skeleton-line" style={{ width: "72%" }} />
          <span className="skeleton skeleton-line" style={{ width: "88%" }} />
          <span className="skeleton skeleton-line" style={{ width: "54%" }} />
        </div>
        <ol className="timeline">
          <li>
            <strong>Chuyển sang Đang làm</strong>
            <span className="list-meta">Nguyễn An · 08:12 01/11/2026</span>
          </li>
          <li>
            <strong>Giao cho Trần Bình</strong>
            <span className="list-meta">Lê Chi · 16:40 31/10/2026</span>
          </li>
        </ol>
      </Section>

      {overlay === "dialog" ? (
        <div className="overlay" role="presentation" onClick={() => setOverlay(null)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-head">
              <h2 className="dialog-title" id="gallery-dialog-title">
                Xoá công việc?
              </h2>
            </div>
            <div className="dialog-body">
              <p>
                Công việc đã phát sinh bình luận và lịch sử nên không thể xoá cứng. Hãy
                chuyển sang trạng thái Đã hủy để giữ dấu vết.
              </p>
            </div>
            <div className="dialog-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOverlay(null)}
                autoFocus
              >
                Giữ lại
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setOverlay(null)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {overlay === "sheet" ? (
        <div className="overlay" role="presentation" onClick={() => setOverlay(null)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div className="stack gap-1">
                <h2 className="dialog-title" id="gallery-sheet-title">
                  CV-1043 · Đối chiếu bảng công tháng 10
                </h2>
                <span className="muted mono">work-management/work/tasks</span>
              </div>
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Đóng hồ sơ"
                onClick={() => setOverlay(null)}
              >
                <CloseGlyph aria-hidden="true" width={16} height={16} />
              </button>
            </div>
            <div className="sheet-body">
              <dl className="stack gap-0">
                <div className="spread gap-3 py-1">
                  <dt className="muted">Người phụ trách</dt>
                  <dd>Trần Bình</dd>
                </div>
                <div className="spread gap-3 py-1">
                  <dt className="muted">Người kiểm tra</dt>
                  <dd>Lê Chi</dd>
                </div>
                <div className="spread gap-3 py-1">
                  <dt className="muted">Hạn</dt>
                  <dd className="tabular">12/11/2026</dd>
                </div>
              </dl>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOverlay(null)}>
                Đóng
              </button>
              <button type="button" className="btn btn-primary">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
