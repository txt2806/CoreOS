import type { Metadata } from "next";
import { CalendarPage } from "@/features/work-management/coordination/workspace-today/calendar";

export const metadata: Metadata = {
  title: "Lịch làm việc · OneOps",
  description: "Lưới tháng theo tuần làm việc và danh sách sự kiện của từng ngày.",
};

export default function Page() {
  return <CalendarPage />;
}
