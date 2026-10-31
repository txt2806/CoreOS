import type { Metadata } from "next";
import { MilestonesQaPage } from "@/features/work-management/projects/milestones-qa";

export const metadata: Metadata = {
  title: "Mốc & nghiệm thu · OneOps",
  description:
    "Danh sách mốc dự án, ngày mục tiêu và tiêu chí kiểm tra nghiệm thu trước khi hoàn thành công việc.",
};

export default function Page() {
  return <MilestonesQaPage />;
}
