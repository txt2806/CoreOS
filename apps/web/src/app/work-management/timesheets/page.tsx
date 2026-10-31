import type { Metadata } from "next";
import { TimesheetsPage } from "@/features/work-management/projects/timesheets";

export const metadata: Metadata = {
  title: "Timesheet tuần · OneOps",
  description:
    "Ghi thời gian theo tuần cho từng ngày làm việc, tổng hợp ngưỡng và luồng gửi duyệt của Quản lý.",
};

export default function Page() {
  return <TimesheetsPage />;
}
