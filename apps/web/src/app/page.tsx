import type { Metadata } from "next";
import { WorkspaceTodayPage } from "@/features/work-management/coordination/workspace-today";

export const metadata: Metadata = {
  title: "Hôm nay",
  description: "Việc đang mở, điểm danh trong ngày, hàng đợi duyệt và thông báo chưa đọc.",
};

export default function Page() {
  return <WorkspaceTodayPage />;
}
