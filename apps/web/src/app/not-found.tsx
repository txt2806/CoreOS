import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  description: "Đường dẫn không tồn tại hoặc bạn không còn quyền truy cập màn hình này.",
};

export default function NotFound() {
  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">404</p>
          <h1>Không tìm thấy trang này</h1>
          <p className="page-lede">
            Đường dẫn có thể đã đổi tên, hoặc tài khoản của bạn không còn quyền mở màn hình
            đó. Không có dữ liệu nào bị mất.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/">
            Về trang hôm nay
          </Link>
          <Link className="btn btn-primary" href="/work-management/tasks">
            Mở công việc
          </Link>
        </div>
      </header>

      <div className="empty-state">
        <span className="empty-title">Bạn có thể thử</span>
        <p className="empty-body">
          Dùng phím tắt Ctrl K để tìm nhanh mọi màn hình, hoặc quay lại trang hôm nay để
          xem việc đang chờ bạn.
        </p>
      </div>
    </div>
  );
}
