import type { Metadata } from "next";
import { AttendanceReportsPage } from "@/features/hr-management/attendance/attendance-reports";

export const metadata: Metadata = {
  title: "Bảng công & báo cáo kỳ · OneOps",
  description:
    "Tổng hợp ngày công, nghỉ có lương, nghỉ không lương và giờ làm thêm của từng nhân sự trong mỗi kỳ công.",
};

export default function Page() {
  return <AttendanceReportsPage />;
}
