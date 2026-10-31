import type { Metadata } from "next";
import { ShiftsSchedulesPage } from "@/features/hr-management/attendance/shifts-schedules";

export const metadata: Metadata = {
  title: "Ca làm việc & phân ca · OneOps",
  description:
    "Khai báo khung giờ ca, lưu mẫu tuần và gán ca cho từng nhân sự theo ngày.",
};

export default function Page() {
  return <ShiftsSchedulesPage />;
}
