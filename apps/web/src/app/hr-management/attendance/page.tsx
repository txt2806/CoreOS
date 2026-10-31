import type { Metadata } from "next";
import { DailyCheckinPage } from "@/features/hr-management/attendance/daily-checkin";

export const metadata: Metadata = {
  title: "Chấm công hằng ngày · OneOps",
  description:
    "Ghi giờ vào, giờ ra và tra cứu lịch sử chấm công theo ngày, theo nhân sự.",
};

export default function Page() {
  return <DailyCheckinPage />;
}
