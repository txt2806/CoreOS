import type { Metadata } from "next";
import { ResourceCapacityPage } from "@/features/hr-management/employees/resource-capacity";

export const metadata: Metadata = {
  title: "Công suất & phân bổ · OneOps",
  description:
    "Bảng công suất nhân sự theo kỳ: giờ khả dụng, phần trăm đã phân bổ cho dự án và phần công suất còn trống.",
};

export default function Page() {
  return <ResourceCapacityPage />;
}
