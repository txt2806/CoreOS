import type { Metadata } from "next";
import Link from "next/link";
import { DesignGallery } from "@/core/ui/design-system/gallery";
import tokenData from "@/core/ui/design-system/schema/token-data.json";

export const metadata: Metadata = {
  title: "Hệ thống thiết kế",
  description: "Thư viện thành phần OneOps: bề mặt, nút, trạng thái, biểu mẫu, bảng và lớp phủ.",
};

export default function Page() {
  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Thư viện</p>
          <h1>Hệ thống thiết kế OneOps</h1>
          <p className="page-lede">
            Mọi phân hệ dùng chung một lớp thành phần trong globals.css. Trang này là hợp
            đồng sống: thấy gì ở đây là thứ đang chạy trong sản phẩm.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/design-tokens">
            Bộ token
          </Link>
        </div>
      </header>

      <DesignGallery version={tokenData.version} />

      <p className="page-footnote">
        Thành phần dùng token từ tokens/source.json và tự đổi theo data-theme và
        data-density. Không phân hệ nào được tự viết CSS riêng.
      </p>
    </div>
  );
}
