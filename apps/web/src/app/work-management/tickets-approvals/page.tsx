import type { Metadata } from "next";
import { TicketsApprovalsPage } from "@/features/work-management/coordination/tickets-approvals";

export const metadata: Metadata = {
  title: "Đề xuất & phê duyệt · OneOps",
  description: "Hàng đợi bước phê duyệt đang chờ bạn quyết định, kèm hạn xử lý.",
};

export default function Page() {
  return <TicketsApprovalsPage />;
}
