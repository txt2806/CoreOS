import type { Metadata } from "next";
import { ExplanationsPage } from "@/features/hr-management/attendance/checkin-explanations";

export const metadata: Metadata = {
  title: "Giải trình chấm công · OneOps",
  description:
    "Gửi và duyệt yêu cầu bổ sung hoặc điều chỉnh giờ vào – giờ ra trong vòng ba ngày làm việc.",
};

export default function Page() {
  return <ExplanationsPage />;
}
