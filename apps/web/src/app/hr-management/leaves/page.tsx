import type { Metadata } from "next";
import { LeaveRequestsPage } from "@/features/hr-management/leaves/leave-requests";

export const metadata: Metadata = {
  title: "Đơn nghỉ phép · OneOps",
  description:
    "Gửi đơn nghỉ phép, đối chiếu hạn mức phép năm và theo dõi trạng thái duyệt của từng đơn.",
};

export default function Page() {
  return <LeaveRequestsPage />;
}
