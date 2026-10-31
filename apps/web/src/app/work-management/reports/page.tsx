import type { Metadata } from "next";
import { ReportsPage } from "@/features/work-management/coordination/workspace-today/reports";

export const metadata: Metadata = {
  title: "Báo cáo · OneOps",
  description: "Báo cáo vận hành theo kỳ và phân tích trên dữ liệu đang tải.",
};

export default function Page() {
  return <ReportsPage />;
}
