import type { Metadata } from "next";
import { LeaveApprovalsPage } from "@/features/hr-management/leaves/leave-approvals";

export const metadata: Metadata = {
  title: "Duyệt nghỉ phép · OneOps",
  description:
    "Hàng đợi đơn nghỉ phép chờ quản lý quyết định, kèm ảnh hưởng hạn mức phép năm và lịch sử duyệt.",
};

export default function Page() {
  return <LeaveApprovalsPage />;
}
