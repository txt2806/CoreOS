import type { Metadata } from "next";
import { ProjectSpacesPage } from "@/features/work-management/projects/project-spaces";

export const metadata: Metadata = {
  title: "Không gian dự án · OneOps",
  description:
    "Danh sách dự án kèm quản lý, nhóm phụ trách, tiến độ và sprint có cam kết điểm.",
};

export default function Page() {
  return <ProjectSpacesPage />;
}
