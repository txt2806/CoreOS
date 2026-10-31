import type { Metadata } from "next";
import { NotificationsPage } from "@/features/work-management/coordination/notifications";

export const metadata: Metadata = {
  title: "Thông báo · OneOps",
  description:
    "Hộp thông báo của bạn: việc cần xử lý từ công việc, bình luận, tin nhắn, cuộc họp và đề xuất.",
};

export default function Page() {
  return <NotificationsPage />;
}
